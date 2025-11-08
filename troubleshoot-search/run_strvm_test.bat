@echo off
echo 🎵 Strvm Musixmatch API Test
echo ================================

echo.
echo Installing musicxmatch_api package...
pip install -e ./musicxmatch-api

echo.
echo Running test script...
python test_strvm_api.py

echo.
echo Press any key to exit...
pause > nul
