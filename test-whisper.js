import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

async function run() {
    try {
        console.log("Loading model...");
        const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
        console.log("Model loaded successfully!");

        // Feed it a tiny dummy Float32Array to test transcribe execution
        const dummyAudio = new Float32Array(16000);
        console.log("Transcribing dummy audio...");
        const result = await transcriber(dummyAudio, { language: 'en', task: 'transcribe' });
        console.log("Transcription result:", result);
    } catch (e) {
        console.error("Test failed:", e);
    }
}

run();
