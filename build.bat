@echo off
title GLauncher APK Builder
color 0A

echo =======================================================
echo.
echo      GGGGGG      LL           AA      UU   UU      NN   NN
echo     GG    GG     LL          AAAA     UU   UU      NNN  NN
echo     GG           LL         AA  AA    UU   UU      NN N NN
echo     GG   GGGG    LL        AAAAAAAA   UU   UU      NN  NNN
echo     GG     GG    LL       AA      AA  UU   UU      NN   NN
echo      GGGGGG      LLLLLLL AA        AA  UUUUU       NN   NN
echo.
echo =======================================================
echo.
echo       Iniciando la compilacion de GLauncher APK...
echo.
echo. > Limpiando compilaciones anteriores (clean)...
gradle clean

REM Ejecuta el comando de Gradle para ensamblar la version de lanzamiento (release)
REM Nota: Esto usa el Gradle instalado globalmente en tu sistema.
REM Si falla, asegurate de que Gradle este en el PATH o usa 'gradlew.bat assembleRelease'.
echo. > Compilando la aplicacion (assembleRelease)...
gradle :app:assembleRelease

echo.
echo =======================================================

IF %ERRORLEVEL% NEQ 0 (
    echo X ERROR: La compilacion ha fallado. Revisa los mensajes de error.
) ELSE (
    echo V EXITO: La APK se ha compilado correctamente.
    echo.
    echo --> Encuentrala en: app\build\outputs\apk\release\app-release.apk
)

echo.
pause