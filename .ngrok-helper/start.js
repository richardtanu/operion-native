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
const { spawn } = require('child_process');
const path = require('path');
const qrcode = require('qrcode-terminal');

const PROJECT_DIR = path.resolve(__dirname, '..');
const CLOUDFLARED = path.join(__dirname, 'node_modules', '.bin', 'cloudflared.cmd');

console.log('Starting Cloudflare tunnel first (to learn its public URL)...\n');

// --protocol http2: this network's security layer mangles QUIC/UDP
// (confirmed via cloudflared's own connectivity pre-check, which detected
// it and suggested this exact fallback after ~47s of failed QUIC retries
// during testing). Skip straight to the protocol that actually works here.
const tunnel = spawn(CLOUDFLARED, ['tunnel', '--protocol', 'http2', '--url', 'http://localhost:8081'], {
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let metro = null;
let printed = false;

const handleTunnelOutput = (chunk) => {
  const text = chunk.toString();
  process.stderr.write('[cloudflared] ' + text);

  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match && !printed) {
    printed = true;
    const publicUrl = match[0];
    console.log('\nTunnel is up: ' + publicUrl);
    console.log('Starting Metro with EXPO_PACKAGER_PROXY_URL set...\n');
    startMetro(publicUrl);
  }
};

tunnel.stdout.on('data', handleTunnelOutput);
tunnel.stderr.on('data', handleTunnelOutput);

function startMetro(publicUrl) {
  metro = spawn('npx', ['expo', 'start'], {
    cwd: PROJECT_DIR,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      EXPO_PACKAGER_PROXY_URL: publicUrl,
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
      console.log('='.repeat(60) + '\n');
      qrcode.generate(expUrl, { small: true });
      console.log('\n(Leave this window open - closing it stops the tunnel.)\n');
    }
  });
  metro.stderr.on('data', (chunk) => process.stderr.write('[metro] ' + chunk.toString()));

  process.on('SIGINT', () => {
    metro.kill();
    tunnel.kill();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  if (metro) metro.kill();
  tunnel.kill();
  process.exit(0);
});
