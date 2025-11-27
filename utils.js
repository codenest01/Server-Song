// utils.js

// Simple in-memory job storage
const jobDatabase = new Map();

// Generate a unique job ID
function getNewJobId() {
    return crypto.randomUUID();
}

// Update job status
function updateJobStatus(jobId, status, data = {}) {
    jobDatabase.set(jobId, {
        id: jobId,
        status,
        ...data
    });

    console.log(`[JOB ${jobId}] Status updated to: ${status}`);
}

// Get job by ID
function getJob(jobId) {
    return jobDatabase.get(jobId);
}

module.exports = {
    jobDatabase,
    getNewJobId,
    updateJobStatus,
    getJob
};
