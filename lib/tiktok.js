const fs = require("fs");
const path = require("path");
const { recordDownload } = require("./stats");
const { getOutputDir } = require("./storage");

function sanitizeFileName(name) {
    return (name || "").replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ").trim();
}

function formatSpeed(bytesPerSec) {
    if (bytesPerSec >= 1024 * 1024) {
        return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MiB/s`;
    }
    if (bytesPerSec >= 1024) {
        return `${(bytesPerSec / 1024).toFixed(1)} KiB/s`;
    }
    return `${Math.round(bytesPerSec)} B/s`;
}

function formatEta(seconds) {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Resolve e expande links curtos do TikTok (vt.tiktok.com, vm.tiktok.com, etc)
 */
async function resolveTikTokUrl(shortUrl) {
    const isShort = /(vt\.tiktok\.com|vm\.tiktok\.com|\/t\/)/i.test(shortUrl);
    if (!isShort) return shortUrl;

    try {
        const res = await fetch(shortUrl, {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            }
        });
        if (res.url && !res.url.includes("?_r=1")) {
            return res.url;
        }
    } catch {
        // Ignora erro e mantem a URL original
    }
    return shortUrl;
}

/**
 * Baixa arquivo HTTP com progresso em tempo real
 */
async function downloadFileStream(fileUrl, outputPath, onProgress) {
    const res = await fetch(fileUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        }
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Falha ao transferir mídia`);
    }

    const totalBytes = parseInt(res.headers.get("content-length") || "0", 10);
    let downloadedBytes = 0;
    const startTime = Date.now();

    const fileStream = fs.createWriteStream(outputPath);
    const reader = res.body.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        downloadedBytes += value.length;
        fileStream.write(value);

        const elapsedTime = (Date.now() - startTime) / 1000;
        const speedBytesPerSec = downloadedBytes / (elapsedTime || 1);
        const percent = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
        const remainingBytes = totalBytes - downloadedBytes;
        const etaSec = speedBytesPerSec > 0 ? Math.ceil(remainingBytes / speedBytesPerSec) : 0;

        if (onProgress) {
            onProgress({
                percent: parseFloat(percent.toFixed(1)),
                speed: formatSpeed(speedBytesPerSec),
                eta: formatEta(etaSec),
                raw: `${percent.toFixed(1)}%`
            });
        }
    }

    fileStream.end();
    await new Promise((res, rej) => {
        fileStream.on("finish", res);
        fileStream.on("error", rej);
    });

    return downloadedBytes;
}

/**
 * Busca metadados da mídia do TikTok via APIs de alta disponibilidade
 */
async function fetchTikTokMetadata(targetUrl) {
    // 1. TikWM POST API
    try {
        const res = await fetch("https://www.tikwm.com/api/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            },
            body: new URLSearchParams({ url: targetUrl, count: 12, cursor: 0, web: 1, hd: 1 })
        });
        const json = await res.json();
        if (json && json.code === 0 && json.data) {
            return json.data;
        }
    } catch {}

    // 2. TikWM GET API
    try {
        const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl)}`);
        const json = await res.json();
        if (json && json.code === 0 && json.data) {
            return json.data;
        }
    } catch {}

    // 3. Tiklydown API (fallback)
    try {
        const res = await fetch(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(targetUrl)}`);
        const json = await res.json();
        if (json && json.video) {
            return {
                id: json.id || String(Date.now()),
                title: json.title || "TikTok Video",
                play: json.video.noWatermark || json.video.watermark,
                hdplay: json.video.noWatermark,
                music: json.music ? json.music.play_url : null,
                images: json.images ? json.images.map(img => img.url) : null
            };
        }
    } catch {}

    throw new Error("Não foi possível obter metadados do TikTok pelas APIs primárias");
}

/**
 * Realiza o download completo do TikTok (Vídeo, Áudio ou Galeria de Fotos)
 */
async function downloadTikTok(options) {
    const {
        url,
        platform,
        format = "video",
        onLog,
        onProgress
    } = options;

    if (onLog) onLog("Expandindo e verificando link do TikTok...");
    const resolvedUrl = await resolveTikTokUrl(url);

    if (onLog) onLog("Obtendo informações do vídeo (sem marca d'água)...");
    const data = await fetchTikTokMetadata(resolvedUrl);

    const outputDir = getOutputDir(format);
    const titleClean = sanitizeFileName(data.title || `tiktok_${data.id || Date.now()}`).slice(0, 100);

    // Se o usuário pediu ÁUDIO
    if (format === "audio") {
        let musicUrl = data.music || data.hdplay || data.play;
        if (musicUrl && musicUrl.startsWith("/")) {
            musicUrl = "https://www.tikwm.com" + musicUrl;
        }

        if (!musicUrl) {
            throw new Error("Áudio do TikTok não encontrado");
        }

        const fileName = `${titleClean} [${data.id || "audio"}].mp3`;
        const filePath = path.join(outputDir, fileName);

        if (onLog) onLog(`Baixando áudio...`);
        try {
            await downloadFileStream(musicUrl, filePath, onProgress);
        } catch (audioErr) {
            let fallbackUrl = data.hdplay || data.play;
            if (fallbackUrl) {
                if (fallbackUrl.startsWith("/")) fallbackUrl = "https://www.tikwm.com" + fallbackUrl;
                if (onLog) onLog(`Obtendo mídia de áudio alternativa...`);
                await downloadFileStream(fallbackUrl, filePath, onProgress);
            } else {
                throw audioErr;
            }
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;

        recordDownload({
            url,
            platformId: "tiktok",
            platformName: "TikTok",
            format: "audio",
            fileName,
            filePath,
            fileSize
        });

        return {
            success: true,
            filePath,
            fileName,
            fileSize,
            outputDir
        };
    }

    // Se for post de FOTOS / SLIDESHOW
    if (Array.isArray(data.images) && data.images.length > 0) {
        if (onLog) onLog(`Post do TikTok com ${data.images.length} fotos detectado! Baixando galeria...`);
        let firstPath = null;
        let totalSize = 0;

        for (let i = 0; i < data.images.length; i++) {
            const imgUrl = data.images[i];
            const fileName = `${titleClean}_foto_${i + 1} [${data.id}].jpg`;
            const filePath = path.join(outputDir, fileName);

            if (onLog) onLog(`Baixando foto [${i + 1}/${data.images.length}]...`);
            await downloadFileStream(imgUrl, filePath, (p) => {
                if (onProgress) {
                    const stepPct = ((i + (p.percent / 100)) / data.images.length) * 100;
                    onProgress({ ...p, percent: parseFloat(stepPct.toFixed(1)) });
                }
            });

            if (fs.existsSync(filePath)) {
                const stat = fs.statSync(filePath);
                totalSize += stat.size;
                if (!firstPath) firstPath = filePath;
            }
        }

        // Baixa áudio de fundo do slideshow se existir
        if (data.music) {
            let musicUrl = data.music.startsWith("/") ? "https://www.tikwm.com" + data.music : data.music;
            const audioPath = path.join(outputDir, `${titleClean}_audio [${data.id}].mp3`);
            try {
                if (onLog) onLog(`Baixando áudio de fundo do slideshow...`);
                await downloadFileStream(musicUrl, audioPath, null);
                if (fs.existsSync(audioPath)) {
                    totalSize += fs.statSync(audioPath).size;
                }
            } catch {}
        }

        const mainFileName = firstPath ? path.basename(firstPath) : `${titleClean} [${data.id}].jpg`;

        recordDownload({
            url,
            platformId: "tiktok",
            platformName: "TikTok",
            format: "video",
            fileName: mainFileName,
            filePath: firstPath || outputDir,
            fileSize: totalSize
        });

        return {
            success: true,
            filePath: firstPath || outputDir,
            fileName: mainFileName,
            fileSize: totalSize,
            outputDir
        };
    }

    // Se for VÍDEO normal
    let videoUrl = data.hdplay || data.play || data.wmplay;
    if (!videoUrl) {
        throw new Error("URL do vídeo do TikTok não encontrada");
    }
    if (videoUrl.startsWith("/")) {
        videoUrl = "https://www.tikwm.com" + videoUrl;
    }

    const fileName = `${titleClean} [${data.id || "video"}].mp4`;
    const filePath = path.join(outputDir, fileName);

    if (onLog) onLog(`Baixando vídeo HD sem marca d'água...`);
    await downloadFileStream(videoUrl, filePath, onProgress);

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    recordDownload({
        url,
        platformId: "tiktok",
        platformName: "TikTok",
        format: "video",
        fileName,
        filePath,
        fileSize
    });

    return {
        success: true,
        filePath,
        fileName,
        fileSize,
        outputDir
    };
}

module.exports = {
    downloadTikTok,
    resolveTikTokUrl
};
