@echo off
chcp 932 > nul
title ResumeDateCalc 起動ランチャー

echo ========================================================
echo   ResumeDateCalc（履歴書・学歴・年次自動計算機）
echo ========================================================
echo.
echo ブラウザでツールを起動しています...
start "" "%~dp0index.html"
exit
