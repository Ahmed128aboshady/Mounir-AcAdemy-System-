@echo off
echo ====================================================================
echo 🚀 Starting Monir Smart LMS Server...
echo ====================================================================
cd backend\app
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
