@echo off
rem Run this once per new Command Prompt window, before npm/npx/expo commands.
rem Invoke it by FULL PATH: C:\operion-mobile\dev.cmd
rem (typing just "dev.cmd" from inside the folder will fail on this machine -
rem  current-directory execution appears to be locked down; full path works.)
rem
rem Puts a working Node (v20.20.2) at the front of PATH for THIS window only,
rem no admin rights, no registry edit, no system PATH change. The globally
rem installed nvm can't switch versions here because "nvm use" needs to
rem rewrite a symlink under C:\nvm4w, which requires admin or Developer Mode.
set "PATH=C:\Users\Richard_118269\AppData\Local\nvm\v20.20.2;%PATH%"
echo Node/npm ready for this window (v20.20.2)
node --version
npm --version
