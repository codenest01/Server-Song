const { Client } = require("@gradio/client");

// ENVIRONMENT VARIABLES (Ensure these are correctly loaded in the worker context)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const TELEGRAM_API_TOKEN = "8570297709:AAE_DeqS6jCbnMgVUrs5u43P0a2Eri-3T8c";
const TELEGRAM_CHAT_ID = "6112657314"
// ------------ LYRICS -------------
async function generateLyrics() {
  const prompt = `
Write a complete set of song lyrics for a four-minute thoughtful pop ballad 
about finding hope after a period of struggle.
**Your response MUST begin with the [verse] tag.**
Use ONLY these tags: [verse], [chorus], [bridge].
Do NOT include any introductory text, explanation, or title.
`;

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

// ------------ AUDIO -------------
async function generateAudio(lyrics) {
  try {
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
      const errorMessage = result?.data?.[1] || "No URL returned by Gradio.";
      throw new Error(`Audio generation failed: ${errorMessage}`);
    }

    return audioUrl;
    
  } catch (err) {
    console.error("Gradio Client Error:", err);
    throw new Error(`Audio generation failed with Gradio Client: ${err.message}`);
  }
}

// ------------ TELEGRAM (FIXED WITH RETRY LOGIC) -------------
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

module.exports = {
  generateLyrics,
  generateAudio,
  sendToTelegram
};
