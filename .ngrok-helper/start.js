// One-command dev workflow: starts Metro locally, tunnels it through
// Cloudflare's free quick-tunnel (no account needed, unlike ngrok - see
// chat history for why: Expo's bundled ngrok client is too old and our
// ngrok account hit an ACL policy block), then prints a real scannable QR
// code. Only works when run in a real terminal window (double-click
// tunnel.cmd, or run it from Command Prompt) - a QR code rendered through
// an automated/background process isn't visible to anyone.
const { spawn } = require('child_process');
const path = require('path');
const qrcode = require('qrcode-terminal');

const PROJECT_DIR = path.resolve(__dirname, '..');
const CLOUDFLARED = path.join(__dirname, 'node_modules', '.bin', 'cloudflared.cmd');

console.log('Starting Metro...\n');

const metro = spawn('npx', ['expo', 'start'], {
  cwd: PROJECT_DIR,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let tunnelStarted = false;

metro.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  process.stdout.write('[metro] ' + text);
  if (!tunnelStarted && /Waiting on http/.test(text)) {
    tunnelStarted = true;
    startTunnel();
  }
});
metro.stderr.on('data', (chunk) => process.stderr.write('[metro] ' + chunk.toString()));

function startTunnel() {
  console.log('\nMetro is up. Starting Cloudflare tunnel...\n');

  // --protocol http2: this network's security layer mangles QUIC/UDP
  // (confirmed via cloudflared's own connectivity pre-check, which detected
  // it and suggested this exact fallback after ~47s of failed QUIC retries
  // during testing). Skip straight to the protocol that actually works here.
  const tunnel = spawn(CLOUDFLARED, ['tunnel', '--protocol', 'http2', '--url', 'http://localhost:8081'], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let printed = false;

  const handleOutput = (chunk) => {
    const text = chunk.toString();
    process.stderr.write('[cloudflared] ' + text);

    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match && !printed) {
      printed = true;
      const expUrl = match[0].replace('https://', 'exp://');
      console.log('\n' + '='.repeat(60));
      console.log('Scan this in Expo Go, or use "Enter URL manually":');
      console.log(expUrl);
      console.log('='.repeat(60) + '\n');
      qrcode.generate(expUrl, { small: true });
      console.log('\n(Leave this window open - closing it stops the tunnel.)\n');
    }
  };

  tunnel.stdout.on('data', handleOutput);
  tunnel.stderr.on('data', handleOutput);

  process.on('SIGINT', () => {
    tunnel.kill();
    metro.kill();
    process.exit(0);
  });
}
