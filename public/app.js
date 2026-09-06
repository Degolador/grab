/**
 * Grab - Universal Media Downloader (Frontend App)
 * WCAG AA Compliant • Real-time SSE • Media Streaming
 */

document.addEventListener("DOMContentLoaded", () => {
    // ─────────────────────────────────────────────────────────────
    // Estado da Aplicação
    // ─────────────────────────────────────────────────────────────
    const state = {
        theme: localStorage.getItem("dd_theme") || "dark",
        contrast: localStorage.getItem("dd_contrast") || "normal",
        files: [],
        platforms: [],
        currentTab: "single",
        activeEventSource: null
    };

    // ─────────────────────────────────────────────────────────────
    // Elementos do DOM
    // ─────────────────────────────────────────────────────────────
    const srAnnouncer = document.getElementById("sr-announcer");
    const themeToggleBtn = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");
    const contrastToggleBtn = document.getElementById("contrast-toggle");
    const networkInfoBtn = document.getElementById("network-info-btn");
    const networkBanner = document.getElementById("network-banner");
    const closeNetBtn = document.getElementById("close-net-btn");
    const networkUrlInput = document.getElementById("network-url-input");
    const copyNetworkBtn = document.getElementById("copy-network-btn");

    // Navegação em Abas
    const navTabs = document.querySelectorAll(".nav-tab");
    const tabPanels = document.querySelectorAll(".tab-panel");
    const filesBadge = document.getElementById("files-badge");

    // Form de Download Único
    const singleForm = document.getElementById("single-download-form");
    const urlInput = document.getElementById("url-input");
    const pasteBtn = document.getElementById("paste-btn");
    const detectedBox = document.getElementById("detected-platform-container");
    const detectedBadge = document.getElementById("detected-platform-badge");
    const formatLabels = document.querySelectorAll(".format-card");

    // Card de Progresso Único
    const singleProgressCard = document.getElementById("single-progress-card");
    const progressPercent = document.getElementById("progress-percent");
    const progressFill = document.getElementById("progress-fill");
    const progressSpeed = document.getElementById("progress-speed");
    const progressEta = document.getElementById("progress-eta");
    const singleLogBox = document.getElementById("single-log-box");

    // Card de Resultado Único
    const singleResultCard = document.getElementById("single-result-card");
    const resultFilename = document.getElementById("result-filename");
    const resultFilesize = document.getElementById("result-filesize");
    const resultDownloadBtn = document.getElementById("result-download-btn");
    const resultStreamBtn = document.getElementById("result-stream-btn");

    // Form de Download em Lote
    const batchForm = document.getElementById("batch-download-form");
    const batchTextInput = document.getElementById("batch-text-input");
    const batchPreview = document.getElementById("batch-preview");
    const batchCountBadge = document.getElementById("batch-count-badge");
    const batchProgressContainer = document.getElementById("batch-progress-container");
    const batchCompletedCount = document.getElementById("batch-completed-count");
    const batchTotalCount = document.getElementById("batch-total-count");
    const batchItemsList = document.getElementById("batch-items-list");

    // Biblioteca de Arquivos
    const refreshFilesBtn = document.getElementById("refresh-files-btn");
    const searchFilesInput = document.getElementById("search-files-input");
    const filterBtns = document.querySelectorAll(".filter-btn");
    const filesGrid = document.getElementById("files-grid");

    // Estatísticas
    const statTotal = document.getElementById("stat-total");
    const statVideos = document.getElementById("stat-videos");
    const statAudios = document.getElementById("stat-audios");
    const platformsGrid = document.getElementById("platforms-grid");

    // Modal de Mídia
    const mediaModal = document.getElementById("media-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalMediaContainer = document.getElementById("modal-media-container");
    const modalDownloadBtn = document.getElementById("modal-download-btn");
    const closeModalBtn = document.getElementById("close-modal-btn");

    // ─────────────────────────────────────────────────────────────
    // Utilitários de Acessibilidade & Anúncio
    // ─────────────────────────────────────────────────────────────
    function announceToScreenReader(message) {
        if (srAnnouncer) {
            srAnnouncer.textContent = "";
            setTimeout(() => {
                srAnnouncer.textContent = message;
            }, 50);
        }
    }

    function applyTheme() {
        document.documentElement.setAttribute("data-theme", state.theme);
        themeIcon.textContent = state.theme === "dark" ? "🌙" : "☀️";
        localStorage.setItem("dd_theme", state.theme);
    }

    function applyContrast() {
        document.documentElement.setAttribute("data-contrast", state.contrast);
        localStorage.setItem("dd_contrast", state.contrast);
    }

    // Toggle de Tema
    themeToggleBtn.addEventListener("click", () => {
        state.theme = state.theme === "dark" ? "light" : "dark";
        applyTheme();
        announceToScreenReader(`Tema alterado para ${state.theme === "dark" ? "Escuro" : "Claro"}`);
    });

    // Toggle de Alto Contraste
    contrastToggleBtn.addEventListener("click", () => {
        state.contrast = state.contrast === "normal" ? "high" : "normal";
        applyContrast();
        announceToScreenReader(`Modo de alto contraste ${state.contrast === "high" ? "ativado" : "desativado"}`);
    });

    // ─────────────────────────────────────────────────────────────
    // Informações da Rede & Link Público da Internet (Cloudflare Tunnel)
    // ─────────────────────────────────────────────────────────────
    async function fetchNetworkInfo() {
        try {
            const res = await fetch("/api/info");
            const data = await res.json();
            if (data.networkUrl) {
                networkUrlInput.value = data.networkUrl;
            }
            if (data.publicUrl) {
                publicUrlInput.value = data.publicUrl;
            } else {
                publicUrlInput.value = "Gerando link público (aguarde)...";
            }
        } catch {
            networkUrlInput.value = window.location.href;
            publicUrlInput.value = window.location.href;
        }
    }

    networkInfoBtn.addEventListener("click", () => {
        networkBanner.classList.toggle("hidden");
        if (!networkBanner.classList.contains("hidden")) {
            fetchNetworkInfo();
            announceToScreenReader("Painel de conexão Wi-Fi aberto");
        }
    });

    closeNetBtn.addEventListener("click", () => {
        networkBanner.classList.add("hidden");
    });

    copyNetworkBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(networkUrlInput.value).then(() => {
            copyNetworkBtn.textContent = "✓ Copiado!";
            announceToScreenReader("Link copiado para a área de transferência");
            setTimeout(() => {
                copyNetworkBtn.textContent = "Copiar Link";
            }, 2000);
        });
    });

    // ─────────────────────────────────────────────────────────────
    // Controle de Abas
    // ─────────────────────────────────────────────────────────────
    function switchTab(tabId) {
        state.currentTab = tabId;
        navTabs.forEach(tab => {
            const isSelected = tab.dataset.tab === tabId;
            tab.classList.toggle("active", isSelected);
            tab.setAttribute("aria-selected", isSelected);
        });

        tabPanels.forEach(panel => {
            const isTarget = panel.id === `panel-${tabId}`;
            panel.classList.toggle("active", isTarget);
        });

        if (tabId === "files") {
            loadFilesList();
        } else if (tabId === "stats") {
            loadStatsAndPlatforms();
        }

        announceToScreenReader(`Aba ${tabId} selecionada`);
    }

    navTabs.forEach(tab => {
        tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    });

    // Radio cards formatting
    formatLabels.forEach(label => {
        label.addEventListener("click", () => {
            formatLabels.forEach(l => l.classList.remove("active"));
            label.classList.add("active");
            const input = label.querySelector("input[type='radio']");
            if (input) input.checked = true;
        });
    });

    // ─────────────────────────────────────────────────────────────
    // Detecção de Plataforma por URL (Debounce)
    // ─────────────────────────────────────────────────────────────
    let detectTimeout;
    urlInput.addEventListener("input", () => {
        clearTimeout(detectTimeout);
        const val = urlInput.value.trim();

        if (!val) {
            detectedBox.classList.add("hidden");
            return;
        }

        detectTimeout = setTimeout(async () => {
            try {
                const res = await fetch("/api/detect", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: val })
                });
                const data = await res.json();

                if (data.platform) {
                    detectedBadge.textContent = `${data.platform.badge}`;
                    detectedBox.classList.remove("hidden");
                    announceToScreenReader(`Plataforma identificada: ${data.platform.name}`);

                    // Sugere áudio para soundcloud
                    if (data.platform.suggestedType === "audio") {
                        const audioRadio = document.querySelector("input[name='format'][value='audio']");
                        if (audioRadio) {
                            audioRadio.click();
                        }
                    }
                }
            } catch {
                detectedBox.classList.add("hidden");
            }
        }, 300);
    });

    // Botão de Colar
    pasteBtn.addEventListener("click", async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                urlInput.value = text;
                urlInput.dispatchEvent(new Event("input"));
                announceToScreenReader("URL colada com sucesso");
            }
        } catch {
            alert("Não foi possível acessar a área de transferência. Cole usando Ctrl+V / Cmd+V.");
        }
    });

    // ─────────────────────────────────────────────────────────────
    // Download Único via SSE (Server-Sent Events)
    // ─────────────────────────────────────────────────────────────
    singleForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const url = urlInput.value.trim();
        const format = singleForm.querySelector("input[name='format']:checked").value;

        if (!url) return;

        // Reset de UI
        singleResultCard.classList.add("hidden");
        singleProgressCard.classList.remove("hidden");
        singleLogBox.textContent = "";
        progressFill.style.width = "0%";
        progressPercent.textContent = "0%";
        progressSpeed.textContent = "Velocidade: Conectando...";
        progressEta.textContent = "Tempo Restante: --";

        announceToScreenReader("Iniciando download. Aguarde...");

        const sseUrl = `/api/download-stream?url=${encodeURIComponent(url)}&format=${encodeURIComponent(format)}`;
        const eventSource = new EventSource(sseUrl);

        state.activeEventSource = eventSource;

        eventSource.addEventListener("start", (e) => {
            const data = JSON.parse(e.data);
            singleLogBox.textContent += `[INÍCIO] Mídia: ${data.platform.badge} (${data.format.toUpperCase()})\n`;
        });

        eventSource.addEventListener("log", (e) => {
            const data = JSON.parse(e.data);
            singleLogBox.textContent += `[LOG] ${data.message}\n`;
            singleLogBox.scrollTop = singleLogBox.scrollHeight;
        });

        eventSource.addEventListener("progress", (e) => {
            const data = JSON.parse(e.data);
            const pct = Math.round(data.percent || 0);
            progressFill.style.width = `${pct}%`;
            progressPercent.textContent = `${pct}%`;
            progressSpeed.textContent = `Velocidade: ${data.speed || "calculando..."}`;
            progressEta.textContent = `Tempo Restante: ${data.eta || "--"}`;

            if (pct % 20 === 0) {
                announceToScreenReader(`Progresso do download: ${pct}%`);
            }
        });

        eventSource.addEventListener("complete", (e) => {
            const data = JSON.parse(e.data);
            eventSource.close();
            state.activeEventSource = null;

            singleProgressCard.classList.add("hidden");
            singleResultCard.classList.remove("hidden");

            resultFilename.textContent = data.result.fileName;
            resultFilesize.textContent = `Tamanho: ${formatBytes(data.result.fileSize)}`;
            resultDownloadBtn.href = data.result.downloadUrl;
            resultStreamBtn.href = data.result.streamUrl;

            announceToScreenReader(`Download concluído! Arquivo: ${data.result.fileName}`);
            loadFilesBadge();
        });

        eventSource.addEventListener("error", (e) => {
            let errorMsg = "Ocorreu um erro durante o download.";
            try {
                const data = JSON.parse(e.data);
                if (data.message) errorMsg = data.message;
            } catch {}

            eventSource.close();
            state.activeEventSource = null;

            singleProgressCard.classList.add("hidden");
            alert(`✕ Falha no download: ${errorMsg}`);
            announceToScreenReader(`Erro no download: ${errorMsg}`);
        });
    });

    // ─────────────────────────────────────────────────────────────
    // Download em Lote (Batch)
    // ─────────────────────────────────────────────────────────────
    batchTextInput.addEventListener("input", async () => {
        const text = batchTextInput.value.trim();
        if (!text) {
            batchPreview.classList.add("hidden");
            return;
        }

        try {
            const res = await fetch("/api/extract-urls", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text })
            });
            const data = await res.json();
            batchCountBadge.textContent = data.total;
            batchPreview.classList.remove("hidden");
        } catch {}
    });

    batchForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const text = batchTextInput.value.trim();
        const format = batchForm.querySelector("input[name='batch_format']:checked").value;

        if (!text) return;

        const extractRes = await fetch("/api/extract-urls", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });
        const { items } = await extractRes.json();

        if (items.length === 0) {
            alert("Nenhuma URL válida encontrada no texto.");
            return;
        }

        const urls = items.map(i => i.url);

        batchProgressContainer.classList.remove("hidden");
        batchItemsList.innerHTML = "";
        batchCompletedCount.textContent = "0";
        batchTotalCount.textContent = urls.length;

        // Renderiza itens vazios
        items.forEach((item, index) => {
            const itemEl = document.createElement("div");
            itemEl.className = "batch-item-row";
            itemEl.id = `batch-item-${index}`;
            itemEl.innerHTML = `
                <div class="batch-item-info">
                    <span class="batch-badge">${item.platform.badge}</span>
                    <span class="batch-url">${item.url.slice(0, 45)}...</span>
                </div>
                <span class="batch-status" id="batch-status-${index}">Aguardando...</span>
            `;
            batchItemsList.appendChild(itemEl);
        });

        announceToScreenReader(`Iniciando download em lote de ${urls.length} mídias`);

        // Envia requisição batch
        try {
            const response = await fetch("/api/download-batch-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ urls, format })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop(); // Mantém incompleto

                for (const line of lines) {
                    if (!line.startsWith("event: ")) continue;
                    const eventMatch = line.match(/^event:\s*(.+)$/m);
                    const dataMatch = line.match(/^data:\s*(.+)$/m);

                    if (eventMatch && dataMatch) {
                        const event = eventMatch[1].trim();
                        const data = JSON.parse(dataMatch[1].trim());

                        if (event === "item_start") {
                            const statusEl = document.getElementById(`batch-status-${data.index}`);
                            if (statusEl) statusEl.textContent = "⏳ Baixando...";
                        } else if (event === "item_complete") {
                            const statusEl = document.getElementById(`batch-status-${data.index}`);
                            if (statusEl) statusEl.innerHTML = `✅ Concluído (<a href="${data.result.downloadUrl}" download>Baixar</a>)`;
                            batchCompletedCount.textContent = parseInt(batchCompletedCount.textContent) + 1;
                        } else if (event === "item_error") {
                            const statusEl = document.getElementById(`batch-status-${data.index}`);
                            if (statusEl) statusEl.textContent = "❌ Erro";
                        }
                    }
                }
            }

            announceToScreenReader("Download em lote finalizado com sucesso");
            loadFilesBadge();

        } catch (err) {
            alert(`Erro no lote: ${err.message}`);
        }
    });

    // ─────────────────────────────────────────────────────────────
    // Biblioteca de Arquivos Baixados
    // ─────────────────────────────────────────────────────────────
    async function loadFilesList() {
        filesGrid.innerHTML = '<div class="loading-state">Carregando mídias...</div>';
        try {
            const res = await fetch("/api/files");
            state.files = await res.json();

            filesBadge.textContent = state.files.length;
            renderFilesGrid();
        } catch {
            filesGrid.innerHTML = '<div class="error-state">Falha ao carregar arquivos.</div>';
        }
    }

    async function loadFilesBadge() {
        try {
            const res = await fetch("/api/files");
            const files = await res.json();
            filesBadge.textContent = files.length;
        } catch {}
    }

    function renderFilesGrid() {
        const searchTerm = searchFilesInput.value.toLowerCase().trim();
        const activeFilter = document.querySelector(".filter-btn.active")?.dataset.filter || "all";

        const filtered = state.files.filter(file => {
            const matchesSearch = file.name.toLowerCase().includes(searchTerm);
            const matchesCategory = activeFilter === "all" || file.category === activeFilter;
            return matchesSearch && matchesCategory;
        });

        if (filtered.length === 0) {
            filesGrid.innerHTML = '<div class="empty-state">Nenhum arquivo de mídia encontrado.</div>';
            return;
        }

        filesGrid.innerHTML = "";
        filtered.forEach(file => {
            const card = document.createElement("article");
            card.className = "file-item-card";

            let icon = "🎬";
            if (file.category === "audio") icon = "🎵";
            if (file.category === "image") icon = "🖼️";

            card.innerHTML = `
                <div class="file-card-header">
                    <span class="file-card-icon" aria-hidden="true">${icon}</span>
                    <div class="file-card-info">
                        <h4>${escapeHtml(file.name)}</h4>
                        <span class="file-card-meta">${formatBytes(file.size)}</span>
                    </div>
                </div>
                <div class="file-card-actions">
                    <button class="btn btn-secondary play-btn" data-name="${encodeURIComponent(file.name)}" data-type="${file.category}">
                        ▶ Player
                    </button>
                    <a href="${file.downloadUrl}" class="btn btn-primary" download title="Baixar pro seu celular/PC">
                        💾 Baixar
                    </a>
                    <button class="btn btn-danger delete-btn" data-name="${encodeURIComponent(file.name)}" title="Deletar arquivo">
                        🗑️
                    </button>
                </div>
            `;
            filesGrid.appendChild(card);
        });

        // Eventos nos botões
        filesGrid.querySelectorAll(".play-btn").forEach(btn => {
            btn.addEventListener("click", () => openMediaModal(decodeURIComponent(btn.dataset.name), btn.dataset.type));
        });

        filesGrid.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", () => deleteFile(decodeURIComponent(btn.dataset.name)));
        });
    }

    refreshFilesBtn.addEventListener("click", loadFilesList);
    searchFilesInput.addEventListener("input", renderFilesGrid);

    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderFilesGrid();
        });
    });

    // ─────────────────────────────────────────────────────────────
    // Deletar Arquivo
    // ─────────────────────────────────────────────────────────────
    async function deleteFile(filename) {
        if (!confirm(`Deseja realmente apagar "${filename}" do celular/servidor?`)) return;

        try {
            const res = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
                method: "DELETE"
            });
            if (res.ok) {
                announceToScreenReader(`Arquivo ${filename} removido`);
                loadFilesList();
            } else {
                alert("Não foi possível apagar o arquivo.");
            }
        } catch {
            alert("Erro de conexão.");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Modal Player de Mídia
    // ─────────────────────────────────────────────────────────────
    function openMediaModal(filename, category) {
        modalTitle.textContent = filename;
        const streamUrl = `/api/files/stream/${encodeURIComponent(filename)}`;
        const downloadUrl = `/api/files/download/${encodeURIComponent(filename)}`;

        modalDownloadBtn.href = downloadUrl;

        if (category === "audio") {
            modalMediaContainer.innerHTML = `
                <audio controls autoplay style="width: 100%;">
                    <source src="${streamUrl}" type="audio/mpeg">
                    Seu navegador não suporta este áudio.
                </audio>
            `;
        } else {
            modalMediaContainer.innerHTML = `
                <video controls autoplay style="width: 100%; max-height: 450px;">
                    <source src="${streamUrl}" type="video/mp4">
                    Seu navegador não suporta este vídeo.
                </video>
            `;
        }

        mediaModal.showModal();
        announceToScreenReader(`Reproduzindo ${filename}`);
    }

    closeModalBtn.addEventListener("click", () => {
        modalMediaContainer.innerHTML = "";
        mediaModal.close();
    });

    // ─────────────────────────────────────────────────────────────
    // Estatísticas & Plataformas
    // ─────────────────────────────────────────────────────────────
    async function loadStatsAndPlatforms() {
        try {
            const [statsRes, platformsRes] = await Promise.all([
                fetch("/api/stats"),
                fetch("/api/platforms")
            ]);

            const statsData = await statsRes.json();
            const platformsData = await platformsRes.json();

            statTotal.textContent = statsData.stats.totalDownloads || 0;
            statVideos.textContent = statsData.stats.videoDownloads || 0;
            statAudios.textContent = statsData.stats.audioDownloads || 0;

            platformsGrid.innerHTML = "";
            platformsData.forEach(p => {
                const badgeEl = document.createElement("div");
                badgeEl.className = "platform-card-item";
                badgeEl.innerHTML = `<span aria-hidden="true">${p.icon}</span> <span>${p.name}</span>`;
                platformsGrid.appendChild(badgeEl);
            });
        } catch {}
    }

    // Helpers
    function formatBytes(bytes, decimals = 2) {
        if (!bytes || bytes === 0) return "0 Bytes";
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }

    // Inicialização
    applyTheme();
    applyContrast();
    loadFilesBadge();
    fetchNetworkInfo();
});
