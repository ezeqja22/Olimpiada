@echo off
cd /d "%~dp0.."
if not exist .venv\Scripts\python.exe (
  echo First run staging\local-setup.cmd
  exit /b 1
)
.venv\Scripts\python.exe staging\local.py api
