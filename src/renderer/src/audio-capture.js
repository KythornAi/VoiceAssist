import { pipeline, env } from '@xenova/transformers'

/**
 * AUDIO CAPTURE + LOCAL WHISPER STT
 * This renderer window is never shown — it runs silently in the background.
 * It captures microphone audio, runs Whisper locally, and sends the transcript to main.
 */
export async function renderAudioCapture() {
    let transcriber = null
    let modelLoading = false
    let isRecording = false
    let audioCtx, source, processor, stream
    let audioChunks = []
    let currentUtterance = null
    let currentAudioEl = null

    const SOUNDS = {
        start: new Audio('/sounds/start.wav'),
        success: new Audio('/sounds/success.wav'),
        error: new Audio('/sounds/error.wav')
    }

    console.log('[audio] Audio capture setup complete. Preloading models...')

    const playSound = async (type) => {
        try {
            console.log(`[audio] Triggering sound: ${type}`)
            const settings = await window.api.getSettings()
            if (settings.soundEffects) {
                const sound = SOUNDS[type]
                if (sound) {
                    sound.currentTime = 0
                    await sound.play()
                    console.log(`[audio] Sound played: ${type}`)
                }
            }
        } catch (err) {
            console.warn(`[audio] Sound playback failed for ${type}:`, err.message)
        }
    }

    // ── Receive commands from main process ─────────────────────────
    window.api.onAudioCommand(async (cmd) => {
        if (cmd === 'start') await startRecording()
        else if (cmd === 'stop') await stopAndTranscribe()
    })

    // ── Preload the model in the background silently ────────────────
    loadModel()

    // ── Model loader ────────────────────────────────────────────────
    async function loadModel() {
        if (transcriber || modelLoading) return
        modelLoading = true

        try {
            env.allowLocalModels = false  // fetch from HF Hub and cache locally
            env.backends.onnx.wasm.numThreads = 1
            env.backends.onnx.wasm.proxy = false // WASM proxy can be flaky in Electron

            window.api.sendAudioStatus({ type: 'model-loading', progress: 0 })
            console.log('[audio] Loading Whisper model (base.en)...')

            const model = await pipeline(
                'automatic-speech-recognition',
                'Xenova/whisper-base.en',
                {
                    progress_callback: (info) => {
                        if (info.status === 'progress') {
                            window.api.sendAudioStatus({
                                type: 'model-loading',
                                progress: Math.round(info.progress),
                                file: info.file
                            })
                        }
                    }
                }
            )
            transcriber = model // Assign only after successful load
            console.log('[audio] Whisper model ready ✓')
            window.api.sendAudioStatus({ type: 'model-ready' })
        } catch (err) {
            console.error('[audio] Model load failed:', err)
            playSound('error')
            window.api.sendAudioStatus({ type: 'error', message: 'Could not load speech model: ' + err.message })
        }
        modelLoading = false
    }

    // ── Start microphone recording ──────────────────────────────────
    async function startRecording() {
        if (isRecording) return

        // Kick off model load if not started yet
        if (!transcriber && !modelLoading) loadModel()

        console.log('[audio] Requesting microphone access...')
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            })
            console.log('[audio] Microphone access granted ✓')
        } catch (err) {
            console.error('[audio] Microphone access denied:', err)
            playSound('error')
            window.api.sendAudioStatus({ type: 'error', message: 'Microphone access denied. Please allow microphone in System Preferences.' })
            return
        }

        console.log('[audio] Playing start sound...')
        playSound('start')

        audioCtx = new AudioContext({ sampleRate: 16000 })
        source = audioCtx.createMediaStreamSource(stream)
        processor = audioCtx.createScriptProcessor(4096, 1, 1)

        audioChunks = []
        source.connect(processor)
        processor.connect(audioCtx.destination)

        processor.onaudioprocess = (e) => {
            const data = e.inputBuffer.getChannelData(0)
            audioChunks.push(new Float32Array(data))
        }

        isRecording = true
        window.api.sendAudioStatus({ type: 'listening' })
    }

    // ── Stop recording and transcribe ───────────────────────────────
    async function stopAndTranscribe() {
        if (!isRecording) return
        isRecording = false

        // Tear down the audio pipeline
        try { processor.disconnect() } catch { }
        try { source.disconnect() } catch { }
        try { stream.getTracks().forEach(t => t.stop()) } catch { }
        try { audioCtx.close() } catch { }

        // Merge PCM chunks into one Float32Array
        const totalLen = audioChunks.reduce((s, c) => s + c.length, 0)
        if (totalLen < 8000) { // less than 0.5 seconds — skip
            window.api.sendAudioStatus({ type: 'idle' })
            return
        }

        const audio = new Float32Array(totalLen)
        let offset = 0
        for (const chunk of audioChunks) { audio.set(chunk, offset); offset += chunk.length }
        audioChunks = []

        window.api.sendAudioStatus({ type: 'processing' })

        // Wait for model if it's still downloading
        if (!transcriber) {
            console.log('[audio] Waiting for Whisper model to finish loading...')
            window.api.sendAudioStatus({ type: 'waiting-for-model' })
            await new Promise(resolve => {
                let attempts = 0
                const check = setInterval(() => {
                    attempts++
                    if (transcriber) { clearInterval(check); resolve() }
                    if (attempts > 100) { // ~30 seconds max
                        clearInterval(check)
                        console.error('[audio] Model loading timed out during transcription wait')
                        resolve()
                    }
                }, 300)
            })
        }

        // Run Whisper
        try {
            if (!transcriber || typeof transcriber !== 'function') {
                throw new Error('Speech model is not ready yet. Please try again in a few seconds.')
            }

            const settings = await window.api.getSettings()
            const lang = (settings.language || 'en').split('-')[0] // 'en-US' → 'en'

            const result = await transcriber(audio, {
                language: lang,
                task: 'transcribe',
                // Whisper handles auto-punctuation natively — no config needed
            })

            let text = (result?.text || '').trim()

            // Repetition Filter (Whisper Hallucination Guard)
            // Catch cases like "4, 4, 4, 4, 4, 4..." or "word word word word..."
            if (text.length > 20) {
                const words = text.split(/\s+/)
                if (words.length > 8) {
                    const lastWord = words[words.length - 1].toLowerCase().replace(/[.,!?;:]+$/, '')
                    let repeats = 0
                    for (let i = words.length - 1; i >= 0; i--) {
                        const current = words[i].toLowerCase().replace(/[.,!?;:]+$/, '')
                        if (current === lastWord) repeats++
                        else break
                    }
                    if (repeats > 4) {
                        // Found a loop. Find the first occurrence of this word in the sequence.
                        // We search backwards to find where the sequence started.
                        const sequenceStartIdx = words.length - repeats
                        const keptWords = words.slice(0, sequenceStartIdx + 1)
                        text = keptWords.join(' ') + '...'
                    }
                }
            }

            if (settings.removeFillerWords && text) {
                // Remove filler words with boundary checks.
                const fillers = /\b(um|uh|ah|er|hm|hmm|like|you know|sort of|kind of)\b([,\.]*\s*)/gi
                text = text.replace(fillers, '')
                text = text.replace(/\s+/g, ' ')
                text = text.replace(/ ,/g, ',')
                text = text.replace(/^[,.\s]+/, '')
                text = text.replace(/([.?!])\s*[,.]+/g, '$1')
                if (text.length > 0) {
                    text = text.charAt(0).toUpperCase() + text.slice(1)
                }
            }

            if (text) {
                playSound('success')
                window.api.sendTranscript(text)
            }

        } catch (err) {
            playSound('error')
            console.error('[audio] Transcription error:', err)
            window.api.sendAudioStatus({ type: 'error', message: 'Transcription failed: ' + err.message })
        }

        window.api.sendAudioStatus({ type: 'idle' })
    }

    // ── Reading Aloud & Translation ────────────────────────────────
    let translator = null
    let translatorLoading = false

    async function loadTranslator(targetLang) {
        if (translator || translatorLoading) return
        translatorLoading = true

        try {
            console.log('[audio] Loading translation model for TTS...')
            const { pipeline } = await import('@xenova/transformers')
            translator = await pipeline('translation', 'Xenova/nllb-200-distilled-600M')
        } catch (err) {
            console.error('[audio] Failed to load translator:', err)
        }
        translatorLoading = false
    }

    const nllbLangCodes = {
        'en': 'eng_Latn', 'fr': 'fra_Latn', 'de': 'deu_Latn',
        'es': 'spa_Latn', 'zh': 'zho_Hans', 'ja': 'jpn_Jpan', 'ru': 'rus_Cyrl',
    }

    // ── Helper: speak with system voice ────────────────────────────
    function speakWithSystemVoice(finalText, settings) {
        currentUtterance = new SpeechSynthesisUtterance(finalText)
        const voices = window.speechSynthesis.getVoices()
        if (settings.voice && voices.length > 0) {
            const match = voices.find(v => v.voiceURI === settings.voice || v.name === settings.voice)
            if (match) currentUtterance.voice = match
        }
        currentUtterance.rate = settings.readingSpeed || 1.0
        currentUtterance.onend = () => window.api.stopReading()
        currentUtterance.onerror = () => window.api.stopReading()
        window.speechSynthesis.speak(currentUtterance)
    }

    window.api.onReadCommand(async (text) => {
        window.speechSynthesis.cancel()
        if (currentAudioEl) { currentAudioEl.pause(); currentAudioEl = null }

        const settings = await window.api.getSettings()
        let finalText = text

        // Translate if requested
        if (settings.translationLanguage && settings.translationLanguage !== 'none') {
            const langNames = { en: 'English', fr: 'French', de: 'German', es: 'Spanish', zh: 'Chinese', ja: 'Japanese', ru: 'Russian' }
            const targetLang = langNames[settings.translationLanguage] || settings.translationLanguage

            if (settings.openaiApiKey && settings.openaiApiKey.length > 10) {
                try {
                    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${settings.openaiApiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini',
                            messages: [
                                { role: 'system', content: `You are a translator. Translate the following text into ${targetLang}. Output ONLY the translation, nothing else.` },
                                { role: 'user', content: text },
                            ],
                            temperature: 0.3,
                        }),
                    })
                    if (resp.ok) {
                        const data = await resp.json()
                        finalText = data.choices?.[0]?.message?.content?.trim() || text
                    }
                } catch (err) { console.error('[audio] Translation error:', err) }
            } else {
                await loadTranslator()
                if (translator) {
                    try {
                        const tgt_lang = nllbLangCodes[settings.translationLanguage] || 'eng_Latn'
                        const output = await translator(text, { tgt_lang, src_lang: 'eng_Latn' })
                        finalText = output[0]?.translation_text || text
                    } catch (err) { console.error('[audio] Local translation error:', err) }
                }
            }
        }

        const isOpenAI = settings.voice && settings.voice.startsWith('openai:')
        const hasKey = settings.openaiApiKey && settings.openaiApiKey.length > 10

        if (isOpenAI && hasKey) {
            const voiceName = settings.voice.split(':')[1]
            try {
                const resp = await fetch('https://api.openai.com/v1/audio/speech', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${settings.openaiApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'tts-1',
                        input: finalText,
                        voice: voiceName,
                        speed: settings.readingSpeed || 1.0,
                    }),
                })

                if (resp.ok) {
                    const blob = await resp.blob()
                    const url = URL.createObjectURL(blob)
                    currentAudioEl = new Audio(url)
                    currentAudioEl.onended = () => { URL.revokeObjectURL(url); currentAudioEl = null; window.api.stopReading() }
                    currentAudioEl.onerror = () => { URL.revokeObjectURL(url); currentAudioEl = null; window.api.stopReading() }
                    currentAudioEl.play()
                    return
                }
            } catch (err) { console.error('[audio] OpenAI TTS error:', err) }
        }
        speakWithSystemVoice(finalText, settings)
    })

    window.api.onStopReading(() => {
        window.speechSynthesis.cancel()
        if (currentAudioEl) { currentAudioEl.pause(); currentAudioEl = null }
    })
}
