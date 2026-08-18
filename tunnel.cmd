@echo off
rem Invoke by FULL PATH: C:\operion-mobile\tunnel.cmd
rem (bare "tunnel.cmd" from inside the folder won't resolve on this machine -
rem  same current-directory execution restriction as dev.cmd.)
rem
rem One command: starts Metro + a Cloudflare tunnel, prints a scannable QR
rem code for Expo Go. Must run in a real terminal window - this generates a
rem visible QR code, not usable if launched from an automated process.
rem Press Ctrl+C to stop both Metro and the tunnel.
set "PATH=C:\Users\Richard_118269\AppData\Local\nvm\v20.20.2;%PATH%"
node "C:\operion-mobile\.ngrok-helper\start.js"
