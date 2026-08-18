const ngrok = require('@ngrok/ngrok');

(async () => {
  const listener = await ngrok.forward({
    addr: 8081,
    authtoken: '5W1bR67GNbWcXqmxZzBG1_56GezNeaX6sSRvn8npeQ8',
  });
  console.log('TUNNEL_URL=' + listener.url());
  // Keep the process alive so the tunnel stays open.
  await new Promise(() => {});
})().catch((err) => {
  console.error('TUNNEL_FAILED:', err);
  process.exit(1);
});
