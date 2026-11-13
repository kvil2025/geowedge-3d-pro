@echo off
title GeologgIA Túnel 3D — Servidor Local PWA
echo ===============================================================
echo   GEOLOGGIA TUNEL 3D — ESTABILIDAD SUBTERRANEA (PWA)
echo ===============================================================
echo Iniciando servidor en http://localhost:8099 ...
start "" "http://localhost:8099"
python -m http.server 8099
