const { updateJobStatus } = require("./utils");
const runSongGenerationJob = require("./songRunner");

const jobId = process.argv[2];

(async () => {
    try {
        await runSongGenerationJob(jobId);
        process.exit(0);
    } catch (err) {
        console.error("WORKER ERROR:", err);  // << SHOW REAL ERROR
        updateJobStatus(jobId, "FAILED", {
            error: err.message
        });
        process.exit(1);
    }
})();
