const readline = require("readline");

// ───────────────────────────────
// Minimalist Monochrome Palette (Claude Code Style)
// ───────────────────────────────
const c = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    italic: "\x1b[3m",
    underline: "\x1b[4m",

    // Tons de Cinza e Branco (Estritamente Monocromático)
    white: "\x1b[38;5;255m",
    brightWhite: "\x1b[97m",
    lightGray: "\x1b[38;5;250m",
    gray: "\x1b[38;5;244m",
    darkGray: "\x1b[38;5;238m",
    subtleGray: "\x1b[38;5;240m",

    // Mapeamento de legados para cinza/branco (garante zero cor em qualquer módulo)
    purple: "\x1b[38;5;255m",
    cyan: "\x1b[38;5;250m",
    teal: "\x1b[38;5;244m",
    green: "\x1b[38;5;255m",
    yellow: "\x1b[38;5;250m",
    orange: "\x1b[38;5;244m",
    red: "\x1b[38;5;250m",
    pink: "\x1b[38;5;250m",

    bgDark: "\x1b[48;5;236m"
};

const LINE_WIDTH = 50;
const DIVIDER = `${c.darkGray}${"─".repeat(LINE_WIDTH)}${c.reset}`;
const DOUBLE_DIVIDER = `${c.gray}${"─".repeat(LINE_WIDTH)}${c.reset}`;

function timestamp() {
    return new Date().toTimeString().slice(0, 8);
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function printHeader() {
    console.log("");
    console.log(`  ${c.bold}${c.white}Grab${c.reset}`);
    console.log(DIVIDER);
}

function printBannerSmall() {
    console.log("");
    console.log(`  ${c.bold}${c.white}Grab CLI${c.reset}`);
    console.log(DIVIDER);
}

function printFooter() {
    console.log(`  ${c.darkGray}by Pepeu${c.reset}`);
    console.log("");
}

/**
 * Renderiza uma barra de progresso monocromática limpa
 */
function renderProgressBar(percent, speed = "", eta = "") {
    const width = 20;
    const safePercent = Math.min(100, Math.max(0, percent || 0));
    const completed = Math.round((safePercent / 100) * width);
    const remaining = width - completed;

    const bar = `${c.white}${"█".repeat(completed)}${c.darkGray}${"░".repeat(remaining)}${c.reset}`;
    const speedStr = speed ? ` ${c.darkGray}•${c.reset} ${c.gray}${speed}${c.reset}` : "";
    const etaStr = eta ? ` ${c.darkGray}•${c.reset} ${c.dim}ETA ${eta}${c.reset}` : "";

    process.stdout.write(`\r  [${bar}] ${c.bold}${c.white}${safePercent.toFixed(1)}%${c.reset}${speedStr}${etaStr}   `);
}

function clearProgressBar() {
    process.stdout.write("\r" + " ".repeat(68) + "\r");
}

function startSpinner(label) {
    const frames = ["—", "\\", "|", "/"];
    let i = 0;

    const interval = setInterval(() => {
        process.stdout.write(`\r  ${c.gray}${frames[i]}${c.reset}  ${c.dim}${label}${c.reset}`);
        i = (i + 1) % frames.length;
    }, 100);

    return () => {
        clearInterval(interval);
        process.stdout.write("\r" + " ".repeat(label.length + 10) + "\r");
    };
}

function printSuccessCard(fileName, fileSize, filePath) {
    console.log(`${c.darkGray}┌─ ${c.bold}${c.white}Download Concluído${c.reset} ${c.darkGray}${"─".repeat(28)}┐${c.reset}`);
    console.log(`${c.darkGray}│${c.reset}  ${c.bold}${c.white}Arquivo:${c.reset}  ${fileName.slice(0, 38)}`);
    if (fileSize) {
        console.log(`${c.darkGray}│${c.reset}  ${c.bold}${c.white}Tamanho:${c.reset}  ${c.lightGray}${formatBytes(fileSize)}${c.reset}`);
    }
    if (filePath) {
        console.log(`${c.darkGray}│${c.reset}  ${c.bold}${c.white}Salvo em:${c.reset} ${c.gray}${filePath.slice(0, 38)}${c.reset}`);
    }
    console.log(`${c.darkGray}└${"─".repeat(48)}┘${c.reset}`);
}

function printErrorCard(title, message) {
    console.log(`${c.darkGray}┌─ ${c.bold}${c.white}${title}${c.reset} ${c.darkGray}${"─".repeat(Math.max(2, 44 - title.length))}┐${c.reset}`);
    console.log(`${c.darkGray}│${c.reset}  ${c.gray}${message.slice(0, 44)}${c.reset}`);
    console.log(`${c.darkGray}└${"─".repeat(48)}┘${c.reset}`);
}

function printInfoCard(title, details) {
    console.log(`${c.darkGray}┌─ ${c.bold}${c.white}${title}${c.reset} ${c.darkGray}${"─".repeat(Math.max(2, 44 - title.length))}┐${c.reset}`);
    if (Array.isArray(details)) {
        details.forEach(d => console.log(`${c.darkGray}│${c.reset}  ${c.dim}${d}${c.reset}`));
    } else {
        console.log(`${c.darkGray}│${c.reset}  ${c.dim}${details}${c.reset}`);
    }
    console.log(`${c.darkGray}└${"─".repeat(48)}┘${c.reset}`);
}

module.exports = {
    c,
    LINE_WIDTH,
    DIVIDER,
    DOUBLE_DIVIDER,
    timestamp,
    formatBytes,
    printHeader,
    printBannerSmall,
    printFooter,
    renderProgressBar,
    clearProgressBar,
    startSpinner,
    printSuccessCard,
    printErrorCard,
    printInfoCard
};
