const express = require("express");
const cors = require("cors");
const { Client } = require("@gradio/client"); 
const PORT = process.env.PORT || 3000;

// --- API KEYS ---

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const TELEGRAM_API_TOKEN =  process.env.TELEGRAM_API_TOKEN

const TELEGRAM_CHAT_ID = "6112657314";

const app = express();
app.use(cors());

// ===============================
// 1. GENERATE LYRICS (OpenRouter)
// 
// Updated to be very strict on output format for Gradio compatibility.
// ===============================
async function generateLyrics() {
  const prompt = `
Write a complete set of song lyrics for a four-minute thoughtful pop ballad 
about finding hope after a period of struggle.
**Your response MUST begin with the [verse] tag.**
Use ONLY these tags: [verse], [chorus], [bridge].
Do NOT include any introductory text, explanation, or title.
`; // <-- STRICT PROMPT to prevent Gradio formatting errors

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();

  if (!data.choices || !data.choices[0]) {
    console.error("OpenRouter response:", data);
    throw new Error("Lyrics generation failed (no choices returned)");
  }

  return data.choices[0].message.content;
}

// ===============================
// 2. GENERATE AUDIO (Using Gradio Client)
// ===============================
async function generateAudio(lyrics) {
  try {
    console.log("Connecting to Gradio client for audio...");
    const client = await Client.connect("https://tencent-songgeneration.hf.space/");

    const result = await client.predict("/generate_song", {
      lyric: lyrics,
      description: null,
      prompt_audio: null,
      genre: "Auto",
      cfg_coef: 1.5,
      temperature: 0.8
    });

    const audioUrl = result?.data?.[0]?.url;

    if (!audioUrl) {
      console.error("Gradio Client Result:", result);
      // Check for the specific Gradio error message if a URL is missing
      const errorMessage = result?.data?.[1] || "No URL returned by Gradio.";
      throw new Error(`Audio generation failed: ${errorMessage}`);
    }

    return audioUrl;

  } catch (err) {
    console.error("Gradio Client Error:", err);
    throw new Error(`Audio generation failed with Gradio Client: ${err.message}`);
  }
}

// ===============================
// 3. SEND TO TELEGRAM (With Retry Logic)
//
// Added retry loop to handle transient network errors (ConnectTimeoutError).
// ===============================
async function sendToTelegram(lyrics, audioUrl) {
  const MAX_ATTEMPTS = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`Attempting to send to Telegram (Attempt ${attempt}/${MAX_ATTEMPTS})...`);
    
    try {
      const text =
        `🎶 *New AI Song Generated!*\n\n` +
        `🔗 Audio: ${audioUrl}\n\n` +
        `📝 Lyrics:\n${lyrics}`;
    
      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_API_TOKEN}/sendMessage`;
    
      const response = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "Markdown"
        })
      });

      const data = await response.json();

      if (!data.ok) {
        console.error("Telegram API response:", data);
        throw new Error(data.description || "Telegram sending failed");
      }
      
      // Success, exit the function
      return true; 
      
    } catch (err) {
      lastError = err;
      // Wait 3 seconds before retrying only if it's not the last attempt
      if (attempt < MAX_ATTEMPTS) {
        console.log(`Telegram attempt ${attempt} failed. Retrying in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); 
      }
    }
  }

  // If all attempts fail, throw the last encountered error
  throw new Error(`Telegram sending failed after ${MAX_ATTEMPTS} attempts. Last error: ${lastError.message}`);
}

// ===============================
// MAIN ROUTE
// ===============================
app.get("/generate", async (req, res) => {
  try {
    console.log("STEP 1: Generating lyrics...");
    const lyrics = await generateLyrics();

    console.log("STEP 2: Generating audio...");
    const audioUrl = await generateAudio(lyrics); 

    console.log("STEP 3: Sending to Telegram...");
    await sendToTelegram(lyrics, audioUrl);

    res.json({ lyrics, audioUrl });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
