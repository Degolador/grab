const { spawn } = require("child_process");

/**
 * Inicia o Cloudflare Tunnel (TryCloudflare) para gerar um link público HTTPS gratuito
 */
function createPublicTunnel(port = 3000) {
    return new Promise((resolve) => {
        let tunnelUrl = null;

        try {
            const proc = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${port}`], {
                stdio: ["ignore", "pipe", "pipe"]
            });

            const parseChunk = (data) => {
                const text = data.toString();

                // Procura URL trycloudflare.com
                const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
                if (match && !tunnelUrl) {
                    tunnelUrl = match[0];
                    resolve({ process: proc, url: tunnelUrl });
                }
            };

            proc.stdout.on("data", parseChunk);
            proc.stderr.on("data", parseChunk);

            proc.on("error", (err) => {
                resolve({ process: null, url: null, error: err.message });
            });

            // Timeout de segurança se demorar mais que 10 segundos
            setTimeout(() => {
                if (!tunnelUrl) {
                    resolve({ process: proc, url: null });
                }
            }, 10000);

        } catch (err) {
            resolve({ process: null, url: null, error: err.message });
        }
    });
}

module.exports = {
    createPublicTunnel
};
