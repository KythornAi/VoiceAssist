/**
 * AUDIO CAPTURE
 * This renderer window is never shown -- it runs silently in the background.
 * Captures microphone audio and sends raw PCM to main process for transcription
 * via whisper.cpp sidecar.
 */
export async function renderAudioCapture() {
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

    console.log('[audio] Audio capture ready.')

    const playSound = async (type) => {
        try {
            const settings = await window.api.getSettings()
            if (settings.soundEffects) {
                const sound = SOUNDS[type]
                if (sound) {
                    sound.currentTime = 0
                    await sound.play()
                }
            }
        } catch (err) {
            console.warn(`[audio] Sound playback failed for ${type}:`, err.message)
        }
    }

    // ── Receive commands from main process ─────────────────────────
    window.api.onAudioCommand(async (cmd) => {
        if (cmd === 'start') await startRecording()
        else if (cmd === 'stop') await stopAndSend()
    })

    // Check whisper.cpp readiness and report to main
    const whisperStatus = await window.api.checkWhisper()
    if (whisperStatus.ready) {
        window.api.sendAudioStatus({ type: 'model-ready' })
    } else {
        console.warn('[audio] whisper.cpp not ready:', whisperStatus)
        window.api.sendAudioStatus({
            type: 'error',
            message: whisperStatus.missingBinary
                ? 'whisper-cli binary not found. Run "npm run download:whisper" to set up.'
                : 'Whisper model not found. Run "npm run download:whisper" to download it.'
        })
    }

    // ── Start microphone recording ──────────────────────────────────
    async function startRecording() {
        if (isRecording) return

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
            console.log('[audio] Microphone access granted')
        } catch (err) {
            console.error('[audio] Microphone access denied:', err)
            playSound('error')
            window.api.sendAudioStatus({ type: 'error', message: 'Microphone access denied. Please allow microphone in System Preferences.' })
            return
        }

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

    // ── Stop recording and send PCM to main for transcription ───────
    async function stopAndSend() {
        if (!isRecording) return
        isRecording = false

        // Tear down the audio pipeline
        try { processor.disconnect() } catch { }
        try { source.disconnect() } catch { }
        try { stream.getTracks().forEach(t => t.stop()) } catch { }
        try { audioCtx.close() } catch { }

        // Merge PCM chunks into one Float32Array
        const totalLen = audioChunks.reduce((s, c) => s + c.length, 0)
        if (totalLen < 8000) { // less than 0.5 seconds -- skip
            window.api.sendAudioStatus({ type: 'idle' })
            return
        }

        const audio = new Float32Array(totalLen)
        let offset = 0
        for (const chunk of audioChunks) { audio.set(chunk, offset); offset += chunk.length }
        audioChunks = []

        window.api.sendAudioStatus({ type: 'processing' })

        // Send raw PCM to main process -- whisper.cpp runs there
        try {
            const text = await window.api.transcribeAudio(Array.from(audio))
            if (text) {
                playSound('success')
            }
        } catch (err) {
            playSound('error')
            console.error('[audio] Transcription error:', err)
            window.api.sendAudioStatus({ type: 'error', message: 'Transcription failed: ' + err.message })
        }
    }

    // ── Reading Aloud & Translation ────────────────────────────────

    // Helper: play a WAV buffer (from Piper or OpenAI)
    function playWavBuffer(uint8Array) {
        const blob = new Blob([uint8Array], { type: 'audio/wav' })
        const url = URL.createObjectURL(blob)
        currentAudioEl = new Audio(url)
        currentAudioEl.onended = () => { URL.revokeObjectURL(url); currentAudioEl = null; window.api.stopReading() }
        currentAudioEl.onerror = () => { URL.revokeObjectURL(url); currentAudioEl = null; window.api.stopReading() }
        currentAudioEl.play()
    }

    // Helper: speak with system voice (last-resort fallback)
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

        // Translate if requested (OpenAI only -- local translation removed with WASM migration)
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
            }
        }

        // Voice priority: OpenAI (premium) > Piper (free, natural) > System voice (fallback)
        const isOpenAI = settings.voice && settings.voice.startsWith('openai:')
        const isPiper = settings.voice && settings.voice.startsWith('piper:')
        const hasKey = settings.openaiApiKey && settings.openaiApiKey.length > 10

        // 1. OpenAI TTS (premium)
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
                    const arrayBuf = await blob.arrayBuffer()
                    playWavBuffer(new Uint8Array(arrayBuf))
                    return
                }
            } catch (err) { console.error('[audio] OpenAI TTS error:', err) }
        }

        // 2. Piper TTS (free, local, natural-sounding)
        // Use Piper if explicitly selected OR if no voice preference is set (default)
        if (isPiper || !isOpenAI) {
            try {
                const piperStatus = await window.api.checkPiper()
                if (piperStatus.ready) {
                    const voiceFile = isPiper ? settings.voice.split(':')[1] : undefined
                    const result = await window.api.piperSpeak(
                        finalText,
                        voiceFile,
                        settings.readingSpeed || 1.0
                    )
                    if (result && result.wav) {
                        playWavBuffer(new Uint8Array(result.wav))
                        return
                    }
                }
            } catch (err) {
                console.warn('[audio] Piper TTS failed, falling back to system voice:', err.message)
            }
        }

        // 3. System voice (last resort)
        speakWithSystemVoice(finalText, settings)
    })

    window.api.onStopReading(() => {
        window.speechSynthesis.cancel()
        if (currentAudioEl) { currentAudioEl.pause(); currentAudioEl = null }
    })
}
