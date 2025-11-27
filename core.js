// core.js
module.exports = {
    generateLyrics: require("./server").generateLyrics,
    generateAudio: require("./server").generateAudio,
    sendToTelegram: require("./server").sendToTelegram,
};

