// ----------------------------------------
// songRunner.js
// ----------------------------------------

const {
    updateJobStatus,
    getJob
} = require("./utils");

const {
    generateLyrics,
    generateAudio,
    sendToTelegram
} = require("./services");

// MAIN JOB FUNCTION
module.exports = async function runSongGenerationJob(jobId) {
    try {
        const job = getJob(jobId);

        // 1. LYRICS
        updateJobStatus(jobId, "LYRICS_PENDING");
        const lyrics = await generateLyrics();
        updateJobStatus(jobId, "LYRICS_COMPLETE", { lyrics });

        // 2. AUDIO
        updateJobStatus(jobId, "MUSIC_PENDING");
        const audioUrl = await generateAudio(lyrics);
        updateJobStatus(jobId, "MUSIC_COMPLETE", { audioUrl });

        // 3. TELEGRAM
        updateJobStatus(jobId, "NOTIFICATION_PENDING");
        await sendToTelegram(lyrics, audioUrl);

        // 4. DONE
        updateJobStatus(jobId, "COMPLETED", { lyrics, audioUrl });

    } catch (err) {
        console.error("SONG RUNNER ERROR:", err);
        updateJobStatus(jobId, "FAILED", { error: err.message });
    }
};
