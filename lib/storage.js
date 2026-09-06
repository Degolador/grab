const path = require("path");
const fs = require("fs");

const CONFIG_FILE = path.join(process.env.HOME || "/data/data/com.termux/files/home", ".grab_config.json");

const DEFAULT_ROOT = fs.existsSync("/sdcard/Download")
    ? "/sdcard/Download"
    : (fs.existsSync("/sdcard") ? "/sdcard" : path.join(process.env.HOME || "/data/data/com.termux/files/home", "Downloads"));

let currentConfig = {
    baseDir: DEFAULT_ROOT,
    organizeSubfolders: false
};

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
            if (data.baseDir) currentConfig.baseDir = data.baseDir;
            if (typeof data.organizeSubfolders === "boolean") currentConfig.organizeSubfolders = data.organizeSubfolders;
        } else {
            saveConfig();
        }
    } catch {
        // Usa padrao se erro
    }
    ensureDirectories();
}

function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), "utf8");
    } catch {
        // Ignora erro de escrita
    }
}

function ensureDirectories() {
    try {
        if (!fs.existsSync(currentConfig.baseDir)) {
            fs.mkdirSync(currentConfig.baseDir, { recursive: true });
        }
        if (currentConfig.organizeSubfolders) {
            const vid = path.join(currentConfig.baseDir, "Videos");
            const aud = path.join(currentConfig.baseDir, "Audios");
            const img = path.join(currentConfig.baseDir, "Imagens");
            if (!fs.existsSync(vid)) fs.mkdirSync(vid, { recursive: true });
            if (!fs.existsSync(aud)) fs.mkdirSync(aud, { recursive: true });
            if (!fs.existsSync(img)) fs.mkdirSync(img, { recursive: true });
        }
    } catch (err) {
        console.error("Erro ao criar diretórios:", err.message);
    }
}

function getOutputDir(mediaType = "video") {
    ensureDirectories();
    if (!currentConfig.organizeSubfolders) {
        return currentConfig.baseDir;
    }

    if (mediaType === "audio") {
        return path.join(currentConfig.baseDir, "Audios");
    } else if (mediaType === "image") {
        return path.join(currentConfig.baseDir, "Imagens");
    } else {
        return path.join(currentConfig.baseDir, "Videos");
    }
}

function getBaseDir() {
    return currentConfig.baseDir;
}

function setBaseDir(newDir) {
    if (!newDir) return false;
    currentConfig.baseDir = path.resolve(newDir);
    saveConfig();
    ensureDirectories();
    return true;
}

function toggleSubfolders() {
    currentConfig.organizeSubfolders = !currentConfig.organizeSubfolders;
    saveConfig();
    ensureDirectories();
    return currentConfig.organizeSubfolders;
}

function listAllDownloadedFiles() {
    ensureDirectories();
    let fileList = [];

    function scanDir(dir) {
        try {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else if (/\.(mp4|mkv|webm|avi|mp3|m4a|opus|flac|wav|jpg|jpeg|png|gif|webp)$/i.test(item)) {
                    fileList.push({
                        name: item,
                        path: fullPath,
                        dir: dir,
                        size: stat.size,
                        mtime: stat.mtimeMs
                    });
                }
            }
        } catch {
            // Ignora pasta inacessivel
        }
    }

    scanDir(currentConfig.baseDir);

    return fileList.sort((a, b) => b.mtime - a.mtime);
}

// Inicializa ao carregar
loadConfig();

module.exports = {
    getBaseDir,
    setBaseDir,
    getOutputDir,
    toggleSubfolders,
    getConfig: () => ({ ...currentConfig }),
    listAllDownloadedFiles
};
