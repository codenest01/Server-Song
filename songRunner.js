// ----------------------------------------
// songRunner.js (FINAL FIXED VERSION)
// ----------------------------------------

const {
    updateJobStatus,
    getJob
} = require("./utils");

const {
    generateLyrics,
    generateAudio,
    saveToMongoDB
} = require("./services");

module.exports = async function runSongGenerationJob(jobId) {
    try {
        const job = getJob(jobId);

        // 1. GENERATE LYRICS (not saved into DB)
        updateJobStatus(jobId, "LYRICS_PENDING");
        const lyrics = await generateLyrics();
        updateJobStatus(jobId, "LYRICS_COMPLETE");

        // 2. GENERATE AUDIO
        updateJobStatus(jobId, "MUSIC_PENDING");
        const audioUrl = await generateAudio(lyrics);
        updateJobStatus(jobId, "MUSIC_COMPLETE", { audioUrl });

        // 3. SAVE ONLY AUDIO URL (NO LYRICS)
        updateJobStatus(jobId, "DATABASE_PENDING");

        const insertedId = await saveToMongoDB(audioUrl); // <-- FIXED!!!
        
        updateJobStatus(jobId, "DATABASE_COMPLETE", { dbId: insertedId });

        // 4. DONE
        updateJobStatus(jobId, "COMPLETED", { audioUrl });

    } catch (err) {
        console.error("SONG RUNNER ERROR:", err);
        updateJobStatus(jobId, "FAILED", { error: err.message });
    }
};
