// One-command dev workflow: opens a Cloudflare tunnel FIRST (to learn its
// public hostname), then starts Metro with EXPO_PACKAGER_PROXY_URL set to
// that hostname - this is required so Metro's manifest/bundle URLs use the
// tunnel's actual address instead of defaulting to "<tunnel-host>:8081",
// which doesn't exist publicly (the tunnel only listens on 443 externally;
// port 8081 is an internal-only forwarding target). Without this, Expo Go
// gets a manifest pointing at a nonexistent port and fails with
// "Could not connect to development server."
//
// Uses Cloudflare's free quick-tunnel (no account needed, unlike ngrok -
// see chat history: Expo's bundled ngrok client is too old, and our ngrok
// account hit an ACL policy block). Only works run in a real terminal
// window (double-click tunnel.cmd, or run from Command Prompt) - a QR code
// rendered through an automated/background process isn't visible to anyone.
//
// A second quick-tunnel points at the backend on localhost:8080 (start it
// first: .\mvnw.cmd spring-boot:run in the backend repo). Its URL goes to
// Metro as EXPO_PUBLIC_API_BASE_URL, which wins over .env (Expo's env
// loader never overwrites a variable already set in the process), so the
// phone always talks to this run's backend tunnel instead of a stale one
// left in .env. Set SKIP_BACKEND_TUNNEL=1 to keep whatever .env says.
const { spawn } = require('child_process');
const path = require('path');
const qrcode = require('qrcode-terminal');

const PROJECT_DIR = path.resolve(__dirname, '..');
const CLOUDFLARED = path.join(__dirname, 'node_modules', '.bin', 'cloudflared.cmd');

console.log('Starting Cloudflare tunnels first (to learn their public URLs)...\n');

// --protocol http2: this network's security layer mangles QUIC/UDP
// (confirmed via cloudflared's own connectivity pre-check, which detected
// it and suggested this exact fallback after ~47s of failed QUIC retries
// during testing). Skip straight to the protocol that actually works here.
function openTunnel(label, localUrl) {
  const child = spawn(CLOUDFLARED, ['tunnel', '--protocol', 'http2', '--url', localUrl], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const url = new Promise((resolve) => {
    let found = false;
    const onOutput = (chunk) => {
      const text = chunk.toString();
      process.stderr.write('[' + label + '] ' + text);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !found) {
        found = true;
        resolve(match[0]);
      }
    };
    child.stdout.on('data', onOutput);
    child.stderr.on('data', onOutput);
  });
  return { child, url };
}

const metroTunnel = openTunnel('cloudflared', 'http://localhost:8081');
const backendTunnel = process.env.SKIP_BACKEND_TUNNEL ? null : openTunnel('backend-tunnel', 'http://localhost:8080');

let metro = null;

Promise.all([metroTunnel.url, backendTunnel ? backendTunnel.url : null]).then(([publicUrl, backendUrl]) => {
  console.log('\nTunnel is up: ' + publicUrl);
  if (backendUrl) console.log('Backend tunnel is up: ' + backendUrl + ' -> http://localhost:8080');
  console.log('Starting Metro with EXPO_PACKAGER_PROXY_URL set...\n');
  startMetro(publicUrl, backendUrl);
});

function startMetro(publicUrl, backendUrl) {
  metro = spawn('npx', ['expo', 'start'], {
    cwd: PROJECT_DIR,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      EXPO_PACKAGER_PROXY_URL: publicUrl,
      ...(backendUrl ? { EXPO_PUBLIC_API_BASE_URL: backendUrl } : {}),
    },
  });

  let qrShown = false;

  metro.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    process.stdout.write('[metro] ' + text);
    if (!qrShown && /Waiting on http/.test(text)) {
      qrShown = true;
      const expUrl = publicUrl.replace('https://', 'exp://');
      console.log('\n' + '='.repeat(60));
      console.log('Scan this in Expo Go, or use "Enter URL manually":');
      console.log(expUrl);
      if (backendUrl) console.log('App talks to backend at: ' + backendUrl);
      console.log('='.repeat(60) + '\n');
      qrcode.generate(expUrl, { small: true });
      console.log('\n(Leave this window open - closing it stops the tunnels.)\n');
    }
  });
  metro.stderr.on('data', (chunk) => process.stderr.write('[metro] ' + chunk.toString()));
}

process.on('SIGINT', () => {
  if (metro) metro.kill();
  metroTunnel.child.kill();
  if (backendTunnel) backendTunnel.child.kill();
  process.exit(0);
});
