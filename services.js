// ----------------------------------------
// services.js (FINAL WORKING VERSION)
// ----------------------------------------

require("dotenv").config();
const { MongoClient } = require("mongodb");
const fetch = require("node-fetch"); // v2 for CommonJS
const { Client } = require("@gradio/client");

// -------------------------
// CONNECT TO MONGO
// -------------------------
const client = new MongoClient(process.env.MONGO_URI);
async function connectDB() {
    if (!client.isConnected?.()) {
        await client.connect();
        console.log("✅ MongoDB connected");
    }
}

// -------------------------
// 1. Generate Lyrics
// -------------------------
async function generateLyrics() {
    const prompt = `
Write a complete set of song lyrics for a four-minute thoughtful pop ballad 
about finding hope after a period of struggle.
**Your response MUST begin with the [verse] tag.**
Use ONLY these tags: [verse], [chorus], [bridge].
Do NOT include any introductory text, explanation, or title.
`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: [{ role: "user", content: prompt }]
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (err) {
        console.error("❌ generateLyrics error:", err.message);
        return "";
    }
}

// -------------------------
// 2. Generate Audio
// -------------------------
async function generateAudio(lyrics) {
    try {
        const gradio = await Client.connect("https://tencent-songgeneration.hf.space/");
        const result = await gradio.predict("/generate_song", {
            lyric: lyrics,
            description: null,
            prompt_audio: null,
            genre: "Auto",
            cfg_coef: 1.5,
            temperature: 0.8
        });

        return result?.data?.[0]?.url || null;
    } catch (err) {
        console.error("❌ generateAudio error:", err.message);
        return null;
    }
}

// -------------------------
// 3. SAVE TO DATABASE
// -------------------------
async function saveToMongoDB(audioUrl) {
    if (!audioUrl) {
        console.error("❌ No audio URL provided to save");
        return null;
    }

    try {
        await connectDB();
        const db = client.db("songsdb");
        const col = db.collection("generatedSongs");

        const doc = {
            songUrl: audioUrl,
            duration: null,
            status: "unused",
            createdAt: new Date()
        };

        const result = await col.insertOne(doc);
        console.log("✅ Saved to DB:", result.insertedId);
        return result.insertedId;
    } catch (err) {
        console.error("❌ saveToMongoDB error:", err.message);
        return null;
    }
}

// -------------------------
// EXPORTS
// -------------------------
module.exports = {
    generateLyrics,
    generateAudio,
    saveToMongoDB
};
