@echo off
cd /d %~dp0

echo Updating DoomBot...

git add .
git commit -m "auto update"
git push

if %errorlevel% neq 0 (
  echo ERROR: Push failed
  pause
  exit
)

echo Done successfully.
timeout /t 2 >nul
exit