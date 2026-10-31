@echo off

echo ========================================
echo        Starting ForensiX AI
echo ========================================

echo.
echo Starting Backend...
start "ForensiX Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak >nul

echo Starting Frontend...
start "ForensiX Frontend" cmd /k "cd /d %~dp0frontend && call npm run dev"

echo.
echo ========================================
echo   ForensiX AI is starting...
echo ========================================
echo.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo.
pause