#!/usr/bin/env node

const readline = require("readline");
const path = require("path");
const fs = require("fs");

const { detectPlatform, extractUrls, getSupportedPlatforms } = require("./lib/detector");
const { downloadMedia } = require("./lib/downloader");
const { getBaseDir, setBaseDir, getOutputDir, toggleSubfolders, getConfig, listAllDownloadedFiles } = require("./lib/storage");
const { getStats, getHistory } = require("./lib/stats");
const { startServer } = require("./lib/server");
const {
    c,
    DIVIDER,
    DOUBLE_DIVIDER,
    formatBytes,
    printHeader,
    printFooter,
    renderProgressBar,
    clearProgressBar,
    printSuccessCard,
    printErrorCard,
    printInfoCard
} = require("./lib/ui");

let isPrompting = false;

// ───────────────────────────────
// Input Auxiliar
// ───────────────────────────────
function promptInput(questionText) {
    return new Promise((resolve) => {
        isPrompting = true;
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(questionText, (answer) => {
            rl.close();
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(true);
                process.stdin.resume();
            }
            isPrompting = false;
            resolve(answer.trim());
        });
    });
}

// ───────────────────────────────
// Dashboard Principal
// ───────────────────────────────
function showDashboard() {
    const cfg = getConfig();

    console.log(`  ${c.white}[1]${c.reset} Download por URL        ${c.darkGray}│${c.reset} ${c.dim}YouTube, TikTok, Reels...${c.reset}`);
    console.log(`  ${c.white}[2]${c.reset} Download em Lote (Batch)${c.darkGray}│${c.reset} ${c.dim}Múltiplos links simultâneos${c.reset}`);
    console.log(`  ${c.white}[3]${c.reset} Meus Arquivos          ${c.darkGray}│${c.reset} ${c.dim}Mídias salvas no dispositivo${c.reset}`);
    console.log(`  ${c.white}[4]${c.reset} Estatísticas           ${c.darkGray}│${c.reset} ${c.dim}Resumo de downloads${c.reset}`);
    console.log(`  ${c.white}[5]${c.reset} Diretório de Destino    ${c.darkGray}│${c.reset} ${c.dim}Configurar pasta / sdcard${c.reset}`);
    console.log(`  ${c.white}[6]${c.reset} Plataformas Suportadas ${c.darkGray}│${c.reset} ${c.dim}Redes sociais e sites${c.reset}`);
    console.log(`  ${c.white}[7]${c.reset} Servidor Web (Web Hub) ${c.darkGray}│${c.reset} ${c.dim}Link Wi-Fi & Público${c.reset}`);
    console.log(DIVIDER);
    console.log(`  ${c.white}[C]${c.reset} ${c.dim}Limpar Tela${c.reset}              ${c.white}[Q]${c.reset} ${c.dim}Sair${c.reset}`);
    console.log(DIVIDER);
    console.log(`  ${c.dim}Pasta destino:${c.reset} ${c.gray}${cfg.baseDir}${c.reset}`);
    console.log(DIVIDER);
    printFooter();
}

// ───────────────────────────────
// Ação 1: Download por URL
// ───────────────────────────────
async function handleSingleDownload() {
    console.log("");
    console.log(`  ${c.bold}${c.white}Download por URL${c.reset}`);
    console.log(DIVIDER);

    const urlInput = await promptInput(`  ${c.gray}> Cole a URL (ou ENTER para cancelar): ${c.reset}`);

    if (!urlInput) {
        console.log(`  ${c.dim}Operação cancelada.${c.reset}`);
        console.log(DIVIDER);
        return;
    }

    const platform = detectPlatform(urlInput);

    if (platform) {
        console.log(`  ${c.dim}Plataforma:${c.reset} ${c.bold}${c.white}${platform.badge}${c.reset}`);
    }

    console.log("");
    console.log(`  ${c.white}[1]${c.reset} Vídeo (MP4)`);
    console.log(`  ${c.white}[2]${c.reset} Áudio (MP3)`);
    console.log("");

    const formatChoice = await promptInput(`  ${c.gray}> Formato [Padrão: ${platform && platform.suggestedType === "audio" ? "2" : "1"}]: ${c.reset}`);

    let format = "video";
    if (formatChoice === "2" || (formatChoice === "" && platform && platform.suggestedType === "audio")) {
        format = "audio";
    }

    console.log("");
    console.log(`  ${c.dim}Baixando para: ${getOutputDir(format)}${c.reset}`);
    console.log("");

    try {
        const result = await downloadMedia({
            url: platform ? platform.url : urlInput,
            platform,
            format,
            onLog: (msg) => {
                clearProgressBar();
                console.log(`  ${c.dim}ℹ ${msg}${c.reset}`);
            },
            onProgress: (p) => {
                renderProgressBar(p.percent, p.speed, p.eta);
            }
        });

        clearProgressBar();
        console.log("");
        printSuccessCard(result.fileName, result.fileSize, result.filePath);

    } catch (err) {
        clearProgressBar();
        console.log("");
        printErrorCard("Erro no Download", err.message);
    }

    console.log(DIVIDER);
    printFooter();
}

// ───────────────────────────────
// Ação 2: Download em Lote (Batch)
// ───────────────────────────────
async function handleBatchDownload() {
    console.log("");
    console.log(`  ${c.bold}${c.white}Download em Lote${c.reset}`);
    console.log(DIVIDER);
    console.log(`  ${c.dim}Cole os links separados por espaço ou vírgula:${c.reset}`);
    console.log("");

    const textInput = await promptInput(`  ${c.gray}> Links: ${c.reset}`);
    const urls = extractUrls(textInput);

    if (urls.length === 0) {
        console.log(`  ${c.dim}Nenhuma URL válida informada.${c.reset}`);
        console.log(DIVIDER);
        return;
    }

    console.log("");
    console.log(`  ${c.dim}${urls.length} link(s) identificado(s):${c.reset}`);
    urls.forEach((u, i) => {
        const p = detectPlatform(u);
        console.log(`    ${c.gray}${i + 1}.${c.reset} ${c.white}${p ? p.badge : "Web"}${c.reset} ${c.dim}${u.slice(0, 40)}...${c.reset}`);
    });

    console.log("");
    console.log(`  ${c.white}[1]${c.reset} Todos em Vídeo (MP4)`);
    console.log(`  ${c.white}[2]${c.reset} Todos em Áudio (MP3)`);
    console.log("");

    const formatChoice = await promptInput(`  ${c.gray}> Formato [Padrão: 1]: ${c.reset}`);
    const format = formatChoice === "2" ? "audio" : "video";

    console.log("");
    console.log(`  ${c.dim}Iniciando lote de ${urls.length} itens...${c.reset}`);
    console.log(DIVIDER);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const platform = detectPlatform(url);

        console.log("");
        console.log(`  ${c.dim}[${i + 1}/${urls.length}]${c.reset} ${c.bold}${c.white}${platform ? platform.badge : "Web"}${c.reset} ${c.gray}${url.slice(0, 48)}${c.reset}`);

        try {
            const res = await downloadMedia({
                url,
                platform,
                format,
                onLog: (msg) => {
                    clearProgressBar();
                    console.log(`    ${c.dim}${msg}${c.reset}`);
                },
                onProgress: (p) => {
                    renderProgressBar(p.percent, p.speed, p.eta);
                }
            });

            clearProgressBar();
            console.log(`    ${c.white}✓ Concluído:${c.reset} ${res.fileName} (${formatBytes(res.fileSize)})`);
            successCount++;

        } catch (err) {
            clearProgressBar();
            console.log(`    ${c.gray}✕ Erro:${c.reset} ${err.message}`);
            failCount++;
        }
    }

    console.log("");
    console.log(DIVIDER);
    printInfoCard("Resumo do Lote", [
        `Concluídos: ${successCount}`,
        `Falhas:     ${failCount}`,
        `Total:      ${urls.length}`
    ]);
    console.log(DIVIDER);
    printFooter();
}

// ───────────────────────────────
// Ação 3: Listar Arquivos Baixados
// ───────────────────────────────
function handleListFiles() {
    console.log("");
    console.log(`  ${c.bold}${c.white}Meus Arquivos${c.reset}`);
    console.log(DIVIDER);

    const files = listAllDownloadedFiles();

    if (files.length === 0) {
        console.log(`  ${c.dim}(nenhum arquivo de mídia encontrado)${c.reset}`);
    } else {
        files.forEach((f, i) => {
            console.log(`  ${c.gray}${String(i + 1).padStart(2, " ")}.${c.reset} ${c.bold}${c.white}${f.name}${c.reset}`);
            console.log(`      ${c.dim}tamanho: ${formatBytes(f.size)} • pasta: ${f.dir}${c.reset}`);
        });

        console.log("");
        console.log(`  ${c.dim}Total: ${files.length} arquivo(s)${c.reset}`);
    }

    console.log(DIVIDER);
    printFooter();
}

// ───────────────────────────────
// Ação 4: Estatísticas & Histórico
// ───────────────────────────────
function handleShowStats() {
    console.log("");
    console.log(`  ${c.bold}${c.white}Estatísticas & Histórico${c.reset}`);
    console.log(DIVIDER);

    const s = getStats();
    const h = getHistory(8);

    console.log(`  ${c.dim}Total de Downloads:${c.reset} ${c.bold}${c.white}${s.totalDownloads}${c.reset}`);
    console.log(`  ${c.dim}Vídeos baixados:   ${c.reset} ${s.videoDownloads}`);
    console.log(`  ${c.dim}Áudios baixados:   ${c.reset} ${s.audioDownloads}`);
    console.log("");

    if (Object.keys(s.platformCounts).length > 0) {
        console.log(`  ${c.bold}${c.white}Por Plataforma:${c.reset}`);
        for (const [pId, count] of Object.entries(s.platformCounts)) {
            const pInfo = getSupportedPlatforms().find(p => p.id === pId) || { badge: pId };
            console.log(`    ${c.dim}• ${pInfo.badge}:${c.reset} ${count}`);
        }
        console.log("");
    }

    console.log(`  ${c.bold}${c.white}Últimos Downloads:${c.reset}`);
    if (h.length === 0) {
        console.log(`    ${c.dim}(nenhum histórico gravado ainda)${c.reset}`);
    } else {
        h.forEach((item, i) => {
            const dateStr = new Date(item.timestamp).toLocaleTimeString().slice(0, 5);
            console.log(`    ${c.gray}${i + 1}.${c.reset} ${c.dim}[${dateStr}]${c.reset} ${item.platformName} • ${item.fileName} (${formatBytes(item.fileSize)})`);
        });
    }

    console.log(DIVIDER);
    printFooter();
}

// ───────────────────────────────
// Ação 5: Configuração de Diretório
// ───────────────────────────────
async function handleConfigDirectory() {
    console.log("");
    console.log(`  ${c.bold}${c.white}Configuração de Diretório${c.reset}`);
    console.log(DIVIDER);

    const cfg = getConfig();
    console.log(`  ${c.dim}Diretório Atual:${c.reset} ${cfg.baseDir}`);
    console.log(`  ${c.dim}Organizar em Subpastas:${c.reset} ${cfg.organizeSubfolders ? "Sim" : "Não"}`);
    console.log("");
    console.log(`  ${c.white}[1]${c.reset} Alterar caminho da pasta no dispositivo`);
    console.log(`  ${c.white}[2]${c.reset} Alternar organização por subpastas`);
    console.log(`  ${c.white}[0]${c.reset} Voltar`);
    console.log("");

    const choice = await promptInput(`  ${c.gray}> Opção: ${c.reset}`);

    if (choice === "1") {
        console.log("");
        console.log(`  ${c.dim}Exemplo: /sdcard/Download ou /sdcard/Grab${c.reset}`);
        const newPath = await promptInput(`  ${c.gray}> Novo caminho: ${c.reset}`);

        if (newPath) {
            setBaseDir(newPath);
            console.log(`  ${c.white}✓ Diretório alterado para:${c.reset} ${newPath}`);
        } else {
            console.log(`  ${c.dim}Caminho não alterado.${c.reset}`);
        }
    } else if (choice === "2") {
        const newState = toggleSubfolders();
        console.log(`  ${c.white}✓ Subpastas agora:${c.reset} ${newState ? "Ativadas" : "Desativadas"}`);
    }

    console.log(DIVIDER);
    printFooter();
}

// ───────────────────────────────
// Ação 6: Plataformas Suportadas
// ───────────────────────────────
function handleShowPlatforms() {
    console.log("");
    console.log(`  ${c.bold}${c.white}Plataformas Suportadas${c.reset}`);
    console.log(DIVIDER);

    const platforms = getSupportedPlatforms();
    platforms.forEach(p => {
        console.log(`  ${c.white}${p.badge.padEnd(16, " ")}${c.reset} ${c.dim}Vídeo & Áudio HD${c.reset}`);
    });

    console.log(`  ${c.white}Web Direct${c.reset}       ${c.dim}Links diretos de mídia HTTP(S)${c.reset}`);
    console.log(DIVIDER);
    printFooter();
}

// ───────────────────────────────
// Ação 7: Iniciar Servidor Web
// ───────────────────────────────
function handleStartWebServer(port = 3000) {
    console.clear();
    printHeader();
    console.log(`  ${c.bold}${c.white}Iniciando Servidor Web (Grab Web Hub)${c.reset}`);
    console.log(DIVIDER);
    startServer(port);
}

// ───────────────────────────────
// Captura de Teclas do Dashboard
// ───────────────────────────────
function setupKeyboard() {
    if (!process.stdin.isTTY) return;

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    process.stdin.on("keypress", (str, key) => {
        if (isPrompting) return;
        if (!key) return;

        if (key.ctrl && key.name === "c") {
            console.log(`\n${c.dim}Encerrando Grab...${c.reset}`);
            process.exit(0);
        }

        switch (key.name) {
            case "1":
                handleSingleDownload();
                break;
            case "2":
                handleBatchDownload();
                break;
            case "3":
                handleListFiles();
                break;
            case "4":
                handleShowStats();
                break;
            case "5":
                handleConfigDirectory();
                break;
            case "6":
                handleShowPlatforms();
                break;
            case "7":
            case "w":
                handleStartWebServer();
                break;
            case "c":
                console.clear();
                printHeader();
                showDashboard();
                break;
            case "q":
                console.log(`\n${c.dim}Encerrando Grab...${c.reset}`);
                process.exit(0);
                break;
            case "h":
                showDashboard();
                break;
        }
    });
}

// ───────────────────────────────
// Inicialização
// ───────────────────────────────
function main() {
    const args = process.argv.slice(2);
    if (args.includes("web") || args.includes("server") || args.includes("-w")) {
        const portArgIndex = args.findIndex(a => a.startsWith("--port="));
        let port = 3000;
        if (portArgIndex !== -1) {
            port = parseInt(args[portArgIndex].split("=")[1], 10) || 3000;
        }
        handleStartWebServer(port);
        return;
    }

    console.clear();
    printHeader();
    showDashboard();
    setupKeyboard();
}

main();
