# Grab

> Minimalist Universal Media Downloader CLI & Web Hub for Termux and Linux.

Grab is a streamlined, lightweight media downloader designed to fetch videos, audio, and galleries from top platforms (YouTube, TikTok, Instagram, Twitter/X, Pinterest, Facebook, Reddit, SoundCloud, and direct URLs) without requiring session cookies or logins.

---

## ⚡ Quick Start (Single Command)

To set up everything automatically on **Termux** or **Linux**, run:

```bash
bash install.sh
```

The script will ask for confirmation before installing any dependencies, update package repositories, install required tools (`nodejs`, `python`, `ffmpeg`, `yt-dlp`, `gallery-dl`), and configure the project.

---

## 🚀 Usage

### 1. Terminal Interface (CLI)

Run the interactive CLI dashboard:

```bash
node index.js
```

Or if installed globally:

```bash
grab
```

### 2. Web Hub (Browser Interface)

Start the local Web Hub server:

```bash
node index.js web
```

Or via npm:

```bash
npm start
```

This launches a Web UI accessible via:
- **Local:** `http://localhost:3000`
- **Wi-Fi:** `http://<your-ip>:3000`
- **Internet:** Free public Cloudflare tunnel generated automatically for remote access.

---

## ✨ Features

- **No Session Cookies Required:** Smart extractor profiles automatically bypass bot checks and login walls.
- **Multi-Platform Support:** Works with YouTube, TikTok, Instagram, Twitter/X, Pinterest, Facebook, Reddit, SoundCloud, Kwai, Vimeo, Bilibili, Threads, Bluesky, and direct links.
- **Direct Phone Storage:** Downloads directly to `/sdcard/Download` for immediate access in any gallery or file manager.
- **Single & Batch Downloads:** Download individual URLs or process lists of links at once.
- **Minimalist Aesthetic:** Monochromatic, distraction-free CLI and Web interface inspired by Claude Code design principles.
- **High-Precision Progress Tracking:** Real-time download progress with percentage, speed (MB/s), and ETA.

---

## 📁 Project Structure

```text
grab/
├── index.js          # CLI entry point and menu handler
├── install.sh        # Automated setup script (Termux/Linux)
├── package.json      # Project dependencies and script declarations
├── README.md         # Documentation
├── lib/
│   ├── detector.js   # Platform detection and URL parser
│   ├── downloader.js # Core yt-dlp & gallery-dl download manager
│   ├── server.js     # Express HTTP server & Cloudflare tunnel integration
│   ├── stats.js      # Download statistics & history tracker
│   ├── storage.js    # Directory configuration & file scanner
│   ├── tunnel.js     # Public Cloudflare tunnel spawner
│   └── ui.js         # Minimalist monochrome CLI rendering system
└── public/
    ├── index.html    # Web Hub interface
    ├── style.css     # Minimalist monochrome web stylesheet
    └── app.js        # Web Hub client logic & SSE stream connection
```

---

## 📄 License & Credits

MIT License

*by Pepeu*
