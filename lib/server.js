const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");

const { detectPlatform, extractUrls, getSupportedPlatforms } = require("./detector");
const { downloadMedia } = require("./downloader");
const { getBaseDir, getOutputDir, listAllDownloadedFiles, getConfig } = require("./storage");
const { getStats, getHistory } = require("./stats");
const { createPublicTunnel } = require("./tunnel");

let globalPublicUrl = null;

/**
 * Obtém o IP local da rede Wi-Fi
 */
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === "IPv4" && !alias.internal) {
                return alias.address;
            }
        }
    }
    return "127.0.0.1";
}

/**
 * Mapeamento de tipos MIME simples
 */
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mkv": "video/x-matroska",
        ".avi": "video/x-msvideo",
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".opus": "audio/opus",
        ".ogg": "audio/ogg",
        ".flac": "audio/flac",
        ".wav": "audio/wav",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp"
    };
    return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Cria e configura o servidor Express
 */
function createServer() {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Servir arquivos estáticos da pasta public
    const publicPath = path.join(__dirname, "..", "public");
    app.use(express.static(publicPath));

    // Informações da Rede & Servidor
    app.get("/api/info", (req, res) => {
        const ip = getLocalIpAddress();
        const port = process.env.PORT || 3000;
        res.json({
            ip,
            port,
            localUrl: `http://localhost:${port}`,
            networkUrl: `http://${ip}:${port}`,
            publicUrl: globalPublicUrl,
            config: getConfig()
        });
    });

    // Detectar plataforma por URL
    app.post("/api/detect", (req, res) => {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: "URL é obrigatória" });
        }
        const platform = detectPlatform(url);
        res.json({ platform });
    });

    // Extrair múltiplas URLs
    app.post("/api/extract-urls", (req, res) => {
        const { text } = req.body;
        const urls = extractUrls(text || "");
        const items = urls.map(u => ({
            url: u,
            platform: detectPlatform(u)
        }));
        res.json({ total: items.length, items });
    });

    // Plataformas suportadas
    app.get("/api/platforms", (req, res) => {
        res.json(getSupportedPlatforms());
    });

    // Estatísticas e Histórico
    app.get("/api/stats", (req, res) => {
        res.json({
            stats: getStats(),
            history: getHistory(20)
        });
    });

    // Lista de arquivos baixados no celular/servidor
    app.get("/api/files", (req, res) => {
        const files = listAllDownloadedFiles();
        const mapped = files.map(f => {
            const ext = path.extname(f.name).toLowerCase();
            let category = "video";
            if (/\.(mp3|m4a|opus|flac|wav|ogg)$/i.test(ext)) category = "audio";
            if (/\.(jpg|jpeg|png|gif|webp)$/i.test(ext)) category = "image";

            return {
                name: f.name,
                size: f.size,
                dir: f.dir,
                mtime: f.mtime,
                category,
                downloadUrl: `/api/files/download/${encodeURIComponent(f.name)}`,
                streamUrl: `/api/files/stream/${encodeURIComponent(f.name)}`
            };
        });
        res.json(mapped);
    });

    // Streaming de arquivo de mídia (vídeo/áudio)
    app.get("/api/files/stream/:filename", (req, res) => {
        const filename = decodeURIComponent(req.params.filename);
        const files = listAllDownloadedFiles();
        const target = files.find(f => f.name === filename);

        if (!target || !fs.existsSync(target.path)) {
            return res.status(404).send("Arquivo não encontrado");
        }

        const filePath = target.path;
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;
        const mimeType = getMimeType(filePath);

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });
            const head = {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunksize,
                "Content-Type": mimeType,
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                "Content-Length": fileSize,
                "Content-Type": mimeType,
            };
            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }
    });

    // Download de arquivo direto pro dispositivo do amigo
    app.get("/api/files/download/:filename", (req, res) => {
        const filename = decodeURIComponent(req.params.filename);
        const files = listAllDownloadedFiles();
        const target = files.find(f => f.name === filename);

        if (!target || !fs.existsSync(target.path)) {
            return res.status(404).send("Arquivo não encontrado");
        }

        res.download(target.path, target.name);
    });

    // Deletar arquivo
    app.delete("/api/files/:filename", (req, res) => {
        const filename = decodeURIComponent(req.params.filename);
        const files = listAllDownloadedFiles();
        const target = files.find(f => f.name === filename);

        if (!target || !fs.existsSync(target.path)) {
            return res.status(404).json({ error: "Arquivo não encontrado" });
        }

        try {
            fs.unlinkSync(target.path);
            res.json({ success: true, message: "Arquivo removido com sucesso" });
        } catch (err) {
            res.status(500).json({ error: `Erro ao deletar: ${err.message}` });
        }
    });

    // Download via SSE (Server-Sent Events) para 1 URL com progresso em tempo real
    app.get("/api/download-stream", async (req, res) => {
        const url = req.query.url;
        const format = req.query.format || "video";

        if (!url) {
            return res.status(400).json({ error: "URL é obrigatória" });
        }

        // Configura cabeçalhos SSE
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const sendSSE = (event, data) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        const platform = detectPlatform(url);
        sendSSE("start", { platform, format, url });

        try {
            const result = await downloadMedia({
                url,
                platform,
                format,
                onLog: (msg) => {
                    sendSSE("log", { message: msg });
                },
                onProgress: (p) => {
                    sendSSE("progress", p);
                }
            });

            sendSSE("complete", {
                success: true,
                result: {
                    fileName: result.fileName,
                    fileSize: result.fileSize,
                    downloadUrl: `/api/files/download/${encodeURIComponent(result.fileName)}`,
                    streamUrl: `/api/files/stream/${encodeURIComponent(result.fileName)}`
                }
            });
        } catch (err) {
            sendSSE("error", { message: err.message });
        } finally {
            res.end();
        }
    });

    // Download em Lote (Batch) via SSE
    app.post("/api/download-batch-stream", async (req, res) => {
        const { urls, format = "video" } = req.body;

        if (!Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: "Lista de URLs inválida" });
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const sendSSE = (event, data) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        sendSSE("batch_start", { total: urls.length, format });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const platform = detectPlatform(url);

            sendSSE("item_start", { index: i, total: urls.length, url, platform });

            try {
                const result = await downloadMedia({
                    url,
                    platform,
                    format,
                    onLog: (msg) => {
                        sendSSE("item_log", { index: i, message: msg });
                    },
                    onProgress: (p) => {
                        sendSSE("item_progress", { index: i, ...p });
                    }
                });

                successCount++;
                sendSSE("item_complete", {
                    index: i,
                    result: {
                        fileName: result.fileName,
                        fileSize: result.fileSize,
                        downloadUrl: `/api/files/download/${encodeURIComponent(result.fileName)}`
                    }
                });
            } catch (err) {
                failCount++;
                sendSSE("item_error", { index: i, message: err.message });
            }
        }

        sendSSE("batch_complete", { successCount, failCount, total: urls.length });
        res.end();
    });

    return app;
}

const { c, DIVIDER, printFooter } = require("./ui");

/**
 * Inicia o servidor HTTP e o Túnel Público Cloudflare
 */
function startServer(port = 3000) {
    const app = createServer();
    const server = app.listen(port, "0.0.0.0", async () => {
        const ip = getLocalIpAddress();
        console.log("");
        console.log(`  ${c.bold}${c.white}Grab Web Hub (Ativo)${c.reset}`);
        console.log(DIVIDER);
        console.log(`  ${c.bold}${c.white}Local:${c.reset}  http://localhost:${port}`);
        console.log(`  ${c.bold}${c.white}Wi-Fi:${c.reset}  http://${ip}:${port}`);
        console.log(`  ${c.dim}Gerando link público de acesso...${c.reset}`);
        console.log(DIVIDER);

        // Inicia Túnel Público Cloudflare
        const tunnelRes = await createPublicTunnel(port);
        if (tunnelRes.url) {
            globalPublicUrl = tunnelRes.url;
            console.log(`  ${c.bold}${c.white}Link Público:${c.reset} ${tunnelRes.url}`);
            console.log(DIVIDER);
        } else {
            console.log(`  ${c.dim}Não foi possível gerar link público automaticamente.${c.reset}`);
            console.log(DIVIDER);
        }
        printFooter();
    });
    return server;
}

module.exports = {
    createServer,
    startServer,
    getLocalIpAddress
};
