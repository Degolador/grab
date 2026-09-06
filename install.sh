#!/usr/bin/env bash

# ==============================================================================
# Grab - Universal Media Downloader
# Script de Instalação Automática (Termux & Linux)
# by Pepeu
# ==============================================================================

set -e

echo ""
echo "  Grab v1.0 • Script de Instalação"
echo "  ──────────────────────────────────────────"
echo ""

# Pergunta confirmação ao usuário antes de qualquer instalação
read -p "  Deseja prosseguir com a instalação e atualização dos pacotes? [S/n]: " CONFIRM
CONFIRM=${CONFIRM:-S}

if [[ "$CONFIRM" =~ ^[Nn]$ ]]; then
    echo ""
    echo "  [!] Instalação cancelada pelo usuário."
    echo ""
    exit 0
fi

echo ""
echo "  [1/5] Verificando ambiente do sistema..."
if [ -d "/data/data/com.termux/files/home" ]; then
    IS_TERMUX=true
    termux-setup-storage 2>/dev/null || true
    echo "        Ambiente: Termux (Android)"
else
    IS_TERMUX=false
    echo "        Ambiente: Linux / POSIX"
fi

echo ""
echo "  [2/5] Atualizando pacotes e repositórios..."
if [ "$IS_TERMUX" = true ]; then
    pkg update -y && pkg upgrade -y
else
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -y && sudo apt-get upgrade -y
    fi
fi

echo ""
echo "  [3/5] Instalando dependências (Node.js, Python, FFmpeg, Git)..."
if [ "$IS_TERMUX" = true ]; then
    pkg install -y nodejs python ffmpeg git
else
    if command -v apt-get &> /dev/null; then
        sudo apt-get install -y nodejs npm python3 python3-pip ffmpeg git
    fi
fi

echo ""
echo "  [4/5] Instalando extratores Python (yt-dlp, gallery-dl)..."
python3 -m pip install --upgrade --quiet yt-dlp gallery-dl instaloader

echo ""
echo "  [5/5] Instalando dependências do projeto Grab..."
npm install --quiet

echo ""
echo "  ──────────────────────────────────────────"
echo "  ✓ Instalação concluída com sucesso!"
echo ""
echo "  Para iniciar o Grab:"
echo "    • Modo CLI (Terminal):     node index.js"
echo "    • Modo Web Hub (Navegador): node index.js web"
echo ""
echo "  by Pepeu"
echo ""
