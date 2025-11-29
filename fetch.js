const { MongoClient } = require("mongodb");

// Direct MongoDB URI (you requested no .env)
const MONGODB_URI = process.env.MONGODB_URI ;
// Database + collection
const DB_NAME = "ai_music_jobs";
const COLLECTION_NAME = "generated_songs";

/**
 * Fetch ALL song job records from MongoDB.
 * Only returns:
 * jobId, songUrl, duration, status, createdAt
 */
async function fetchAllJobs() {
  let client;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Return ALL documents with ONLY allowed fields
    const jobs = await collection
      .find(
        {},
        {
          projection: {
            _id: 0,       // hide internal MongoDB ID
            jobId: 1,
            songUrl: 1,
            duration: 1,
            status: 1,
            createdAt: 1
          }
        }
      )
      .toArray();

    return jobs;

  } catch (err) {
    console.error("Fetch failed:", err);
    throw new Error("Failed to fetch job list: " + err.message);
  } finally {
    if (client) await client.close();
  }
}

// Run directly via "node fetch.js"
fetchAllJobs()
  .then((data) => {
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(console.error);

module.exports = { fetchAllJobs };
