@echo off
echo ========================================
echo  Arcane AI Image Generator
echo ========================================
echo.

REM Check if .env.local exists and has API key
if not exist .env.local (
    echo ERROR: .env.local file not found!
    echo.
    echo Please create a .env.local file with your OpenAI API key:
    echo OPENAI_API_KEY=your_openai_api_key_here
    echo.
    pause
    exit /b 1
)

findstr /C:"your_openai_api_key_here" .env.local >nul
if %errorlevel% == 0 (
    echo WARNING: Please configure your OpenAI API key in .env.local
    echo.
    echo Current placeholder detected. Get your key from:
    echo https://platform.openai.com/api-keys
    echo.
    pause
)

echo Starting development server...
echo.
echo The app will open at http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

npm run dev
