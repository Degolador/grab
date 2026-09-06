const path = require("path");
const fs = require("fs");

const STATS_FILE = path.join(process.env.HOME || "/data/data/com.termux/files/home", ".dd_stats.json");

let statsData = {
    totalDownloads: 0,
    videoDownloads: 0,
    audioDownloads: 0,
    platformCounts: {},
    history: []
};

function loadStats() {
    try {
        if (fs.existsSync(STATS_FILE)) {
            const raw = fs.readFileSync(STATS_FILE, "utf8");
            const parsed = JSON.parse(raw);
            statsData = {
                totalDownloads: parsed.totalDownloads || 0,
                videoDownloads: parsed.videoDownloads || 0,
                audioDownloads: parsed.audioDownloads || 0,
                platformCounts: parsed.platformCounts || {},
                history: parsed.history || []
            };
        }
    } catch {
        // Fallback para padrao se arquivo invalido
    }
}

function saveStats() {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(statsData, null, 2), "utf8");
    } catch {
        // Ignora erro
    }
}

function recordDownload(info) {
    const { url, platformId, platformName, format, fileName, filePath, fileSize } = info;

    statsData.totalDownloads++;
    if (format === "audio") {
        statsData.audioDownloads++;
    } else {
        statsData.videoDownloads++;
    }

    if (platformId) {
        statsData.platformCounts[platformId] = (statsData.platformCounts[platformId] || 0) + 1;
    }

    statsData.history.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        url,
        platformName: platformName || "Geral",
        format: format || "video",
        fileName: fileName || "Mídia",
        filePath: filePath || "",
        fileSize: fileSize || 0,
        timestamp: new Date().toISOString()
    });

    if (statsData.history.length > 100) {
        statsData.history = statsData.history.slice(0, 100);
    }

    saveStats();
}

function getStats() {
    return { ...statsData };
}

function getHistory(limit = 10) {
    return statsData.history.slice(0, limit);
}

function clearHistory() {
    statsData.history = [];
    saveStats();
}

loadStats();

module.exports = {
    recordDownload,
    getStats,
    getHistory,
    clearHistory
};
