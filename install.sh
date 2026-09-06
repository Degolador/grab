#!/usr/bin/env bash

# ==============================================================================
# Grab - Universal Media Downloader
# Script de Instalação Automática Rápida (Termux & Linux)
# by Pepeu
# ==============================================================================

set -e

echo ""
echo "  Grab • Instalação Rápida"
echo "  ──────────────────────────────────────────"
echo ""

# Pergunta confirmação ao usuário antes de qualquer instalação
read -p "  Deseja instalar e configurar as dependências agora? [S/n]: " CONFIRM
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
    echo "        ✓ Termux (Android) detectado"
else
    IS_TERMUX=false
    echo "        ✓ Sistema Linux / POSIX detectado"
fi

echo ""
echo "  [2/5] Atualizando índice de repositórios..."
if [ "$IS_TERMUX" = true ]; then
    pkg update -y
else
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -y
    fi
fi
echo "        ✓ Índice de pacotes atualizado"

echo ""
echo "  [3/5] Instalando dependências essenciais (Node.js, Python, FFmpeg, Git)..."
if [ "$IS_TERMUX" = true ]; then
    pkg install -y nodejs python ffmpeg git
else
    if command -v apt-get &> /dev/null; then
        sudo apt-get install -y nodejs npm python3 python3-pip ffmpeg git
    fi
fi
echo "        ✓ Dependências de sistema prontas"

echo ""
echo "  [4/5] Instalando extratores de mídia Python (yt-dlp, gallery-dl)..."
python3 -m pip install --upgrade yt-dlp gallery-dl instaloader

echo ""
echo "  [5/5] Instalando pacotes do projeto Grab..."
npm install

echo ""
echo "  ──────────────────────────────────────────"
echo "  ✓ Instalação concluída!"
echo ""
echo "  Para iniciar o Grab:"
echo "    • Modo Terminal (CLI):     node index.js"
echo "    • Modo Web Hub (Navegador): node index.js web"
echo ""
echo "  by Pepeu"
echo ""
