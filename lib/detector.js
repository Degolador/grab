/**
 * Detector universal de plataformas de mídia
 */

const PLATFORMS = [
    {
        id: "youtube",
        name: "YouTube",
        badge: "YouTube",
        color: "\x1b[37m",
        regex: /(youtube\.com|youtu\.be)/i,
        suggestedType: "video",
        icon: ""
    },
    {
        id: "tiktok",
        name: "TikTok",
        badge: "TikTok",
        color: "\x1b[37m",
        regex: /(tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com|vxtiktok\.com|tnktok\.com)/i,
        suggestedType: "video",
        icon: ""
    },
    {
        id: "twitter",
        name: "Twitter / X",
        badge: "Twitter/X",
        color: "\x1b[37m",
        regex: /(twitter\.com|x\.com|t\.co)/i,
        suggestedType: "video",
        icon: ""
    },
    {
        id: "pinterest",
        name: "Pinterest",
        badge: "Pinterest",
        color: "\x1b[37m",
        regex: /(pinterest\.com|pin\.it)/i,
        suggestedType: "video",
        icon: ""
    },
    {
        id: "instagram",
        name: "Instagram",
        badge: "Instagram",
        color: "\x1b[37m",
        regex: /(instagram\.com|instagr\.am)/i,
        suggestedType: "video",
        icon: ""
    },
    {
        id: "facebook",
        name: "Facebook",
        badge: "Facebook",
        color: "\x1b[37m",
        regex: /(facebook\.com|fb\.watch|fb\.com|fb\.gg)/i,
        suggestedType: "video",
        icon: ""
    },
    {
        id: "reddit",
        name: "Reddit",
        badge: "Reddit",
        color: "\x1b[37m",
        regex: /(reddit\.com|v\.redd\.it|redd\.it)/i,
        suggestedType: "video",
        icon: ""
    },
    {
        id: "soundcloud",
        name: "SoundCloud",
        badge: "SoundCloud",
        color: "\x1b[37m",
        regex: /soundcloud\.com/i,
        suggestedType: "audio",
        icon: ""
    },
    {
        id: "twitch",
        name: "Twitch",
        badge: "Twitch",
        color: "\x1b[37m",
        regex: /(twitch\.tv|clips\.twitch\.tv)/i,
        suggestedType: "video",
        icon: ""
    },
    {
        id: "vimeo",
        name: "Vimeo",
        badge: "Vimeo",
        color: "\x1b[37m",
        regex: /vimeo\.com/i,
        suggestedType: "video",
        icon: ""
    },
    {
        id: "kwai",
        name: "Kwai",
        badge: "Kwai",
        color: "\x1b[37m",
        regex: /(kwai\.com|kuaishou\.com)/i,
        suggestedType: "video",
        icon: ""
    },
    {
        id: "bilibili",
        name: "Bilibili",
        badge: "Bilibili",
        color: "\x1b[37m",
        regex: /(bilibili\.com|b23\.tv)/i,
        suggestedType: "video",
        icon: ""
    },
    {
        id: "threads",
        name: "Threads",
        badge: "Threads",
        color: "\x1b[37m",
        regex: /threads\.net/i,
        suggestedType: "video",
        icon: ""
    },
    {
        id: "bluesky",
        name: "Bluesky",
        badge: "Bluesky",
        color: "\x1b[37m",
        regex: /(bsky\.app|bsky\.social)/i,
        suggestedType: "video",
        icon: ""
    }
];

const GENERAL_PLATFORM = {
    id: "general",
    name: "Web / Geral",
    badge: "Web Direct",
    color: "\x1b[37m",
    suggestedType: "video",
    icon: ""
};

/**
 * Extrai URLs de uma string (texto cola)
 */
function extractUrls(text) {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`]+)/g;
    const matches = text.match(urlRegex) || [];
    return matches.map(u => u.replace(/[.,;!?)]+$/, ""));
}

/**
 * Detecta a plataforma de uma URL
 */
function detectPlatform(url) {
    if (!url) return null;

    const trimmedUrl = url.trim();
    for (const p of PLATFORMS) {
        if (p.regex.test(trimmedUrl)) {
            return { ...p, url: trimmedUrl };
        }
    }

    return { ...GENERAL_PLATFORM, url: trimmedUrl };
}

/**
 * Retorna lista de plataformas suportadas para exibição
 */
function getSupportedPlatforms() {
    return PLATFORMS;
}

module.exports = {
    PLATFORMS,
    detectPlatform,
    extractUrls,
    getSupportedPlatforms
};
