const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { getOutputDir } = require("./storage");
const { recordDownload } = require("./stats");

/**
 * Sanitiza nome de arquivo
 */
function sanitizeFileName(name) {
    return name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ").trim();
}

/**
 * Baixa uma URL via yt-dlp (com fallbacks e bypass de cookies de sessão)
 */
function downloadMedia(options) {
    const {
        url,
        platform,
        format = "video", // "video" | "audio"
        onLog,
        onProgress
    } = options;

    return new Promise((resolve, reject) => {
        const outputDir = getOutputDir(format);

        function executeYtDlp(retryCount = 0, withThumbnail = true) {
            const baseArgs = [
                "--no-playlist",
                "--no-cookies",
                "--js-runtimes", "node",
                "--remote-components", "ejs:github",
                "--user-agent", "Mozilla/5.0 (Linux; Android 13; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
                "-o", path.join(outputDir, "%(title).180s [%(id)s].%(ext)s")
            ];

            // Configuração inteligente de extrator para evitar bloq de sessão/cookies no YouTube
            if (retryCount === 0) {
                baseArgs.push("--extractor-args", "youtube:player_client=mweb,ios,android,web");
            } else {
                baseArgs.push("--extractor-args", "youtube:player_client=android,ios");
            }

            if (withThumbnail) {
                baseArgs.push("--embed-thumbnail", "--add-metadata");
            }

            if (format === "audio") {
                baseArgs.push(
                    "-f", "bestaudio/best",
                    "-x",
                    "--audio-format", "mp3",
                    "--audio-quality", "0"
                );
            } else {
                baseArgs.push(
                    "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                    "--merge-output-format", "mp4"
                );
            }

            baseArgs.push(url);

            if (onLog) onLog(`Iniciando download via yt-dlp (${format.toUpperCase()})...`);

            const proc = spawn("yt-dlp", baseArgs, {
                stdio: ["ignore", "pipe", "pipe"]
            });

            let stdoutData = "";
            let stderrData = "";
            let downloadedFilePath = null;

            proc.stdout.on("data", (data) => {
                const chunk = data.toString();
                stdoutData += chunk;

                const lines = chunk.split("\n");
                for (const line of lines) {
                    const trimmed = line.trim();

                    // Detecta caminho do arquivo final salvo
                    const destMatch = trimmed.match(/\[(download|Merger|ExtractAudio)\] Destination: (.+)/i) ||
                                     trimmed.match(/\[(download|Merger)\] (.+\.(mp4|m4a|mp3|webm|mkv|ogg|webp))/i);
                    if (destMatch && destMatch[2]) {
                        downloadedFilePath = destMatch[2].trim();
                    }

                    // Extrai porcentagem
                    if (trimmed.includes("[download]") && trimmed.includes("%")) {
                        const percentMatch = trimmed.match(/(\d+\.?\d*)%/);
                        const speedMatch = trimmed.match(/at\s+([0-9\.]+[KiMG]B\/s)/i);
                        const etaMatch = trimmed.match(/ETA\s+([0-9:]+)/i);

                        if (percentMatch && onProgress) {
                            onProgress({
                                percent: parseFloat(percentMatch[1]),
                                speed: speedMatch ? speedMatch[1] : "",
                                eta: etaMatch ? etaMatch[1] : "",
                                raw: trimmed
                            });
                        }
                    }
                }
            });

            proc.stderr.on("data", (data) => {
                stderrData += data.toString();
            });

            proc.on("close", (code) => {
                if (code === 0) {
                    let finalPath = downloadedFilePath;

                    if (!finalPath || !fs.existsSync(finalPath)) {
                        try {
                            const files = fs.readdirSync(outputDir)
                                .map(f => path.join(outputDir, f))
                                .filter(f => fs.statSync(f).isFile())
                                .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

                            if (files.length > 0) {
                                finalPath = files[0];
                            }
                        } catch {
                            // Ignora erro de varredura
                        }
                    }

                    let fileSize = 0;
                    let fileName = "arquivo";

                    if (finalPath && fs.existsSync(finalPath)) {
                        const stat = fs.statSync(finalPath);
                        fileSize = stat.size;
                        fileName = path.basename(finalPath);
                    }

                    recordDownload({
                        url,
                        platformId: platform ? platform.id : "general",
                        platformName: platform ? platform.name : "Geral",
                        format,
                        fileName,
                        filePath: finalPath || outputDir,
                        fileSize
                    });

                    resolve({
                        success: true,
                        filePath: finalPath,
                        fileName,
                        fileSize,
                        outputDir
                    });

                } else {
                    const lowerErr = stderrData.toLowerCase();

                    // Se erro é relacionado a cookie, sessão ou bot, tenta com perfil alternativo de extrator
                    if (retryCount === 0 && (lowerErr.includes("cookie") || lowerErr.includes("sign in") || lowerErr.includes("login") || lowerErr.includes("bot") || lowerErr.includes("potoken"))) {
                        if (onLog) onLog("Ajustando perfil do extrator para evitar restrição de sessão...");
                        return executeYtDlp(1, withThumbnail);
                    }

                    // Se falhou com embed-thumbnail, tenta sem thumbnail
                    if (withThumbnail && (lowerErr.includes("atomicparsley") || lowerErr.includes("ffmpeg") || lowerErr.includes("thumbnail"))) {
                        if (onLog) onLog("Tentando novamente sem incorporação de thumbnail...");
                        return executeYtDlp(retryCount, false);
                    }

                    // Tentativa com gallery-dl se for plataforma social / imagens
                    executeGalleryDlFallback(stderrData);
                }
            });

            proc.on("error", (err) => {
                executeGalleryDlFallback(err.message);
            });
        }

        function executeGalleryDlFallback(ytdlpError) {
            if (onLog) onLog("Tentando modo de extração alternativo via gallery-dl...");

            const gArgs = ["--dest", outputDir, url];
            const gProc = spawn("gallery-dl", gArgs, {
                stdio: ["ignore", "pipe", "pipe"]
            });

            let gStderr = "";

            gProc.stderr.on("data", (data) => {
                gStderr += data.toString();
            });

            gProc.on("close", (code) => {
                if (code === 0) {
                    try {
                        const files = fs.readdirSync(outputDir)
                            .map(f => path.join(outputDir, f))
                            .filter(f => fs.statSync(f).isFile())
                            .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

                        if (files.length > 0) {
                            const finalPath = files[0];
                            const stat = fs.statSync(finalPath);
                            const fileSize = stat.size;
                            const fileName = path.basename(finalPath);

                            recordDownload({
                                url,
                                platformId: platform ? platform.id : "general",
                                platformName: platform ? platform.name : "Geral",
                                format,
                                fileName,
                                filePath: finalPath,
                                fileSize
                            });

                            return resolve({
                                success: true,
                                filePath: finalPath,
                                fileName,
                                fileSize,
                                outputDir
                            });
                        }
                    } catch {
                        // Ignora
                    }
                }

                const cleanMsg = ytdlpError.split("\n").filter(l => l.includes("ERROR:") || l.includes("Error")).join(" ") || ytdlpError.slice(-250);
                reject(new Error(cleanMsg || `Falha no download da mídia`));
            });

            gProc.on("error", () => {
                const cleanMsg = ytdlpError.split("\n").filter(l => l.includes("ERROR:") || l.includes("Error")).join(" ") || ytdlpError.slice(-250);
                reject(new Error(cleanMsg || `yt-dlp e gallery-dl falharam`));
            });
        }

        executeYtDlp(0, true);
    });
}

module.exports = {
    downloadMedia,
    sanitizeFileName
};
