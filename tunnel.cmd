@echo off
rem Invoke by FULL PATH: "C:\richards stuff\operion-mobile\tunnel.cmd"
rem (bare "tunnel.cmd" from inside the folder won't resolve on this machine -
rem  same current-directory execution restriction as dev.cmd.)
rem
rem One command: starts Metro + a Cloudflare tunnel for it + a second tunnel
rem to the backend on localhost:8080 (start the backend first), and prints a
rem scannable QR code for Expo Go. Must run in a real terminal window - this
rem generates a visible QR code, not usable if launched from an automated
rem process. Press Ctrl+C to stop Metro and both tunnels.
set "PATH=C:\Users\Richard_118269\AppData\Local\nvm\v20.20.2;%PATH%"
rem %~dp0 is this script's own folder, so this works wherever the repo lives.
node "%~dp0.ngrok-helper\start.js"
