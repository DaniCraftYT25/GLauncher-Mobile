# GLauncher Mobile

<p align="center">
  <img src="app/src/main/assets/icons/favicon.png" alt="GLauncher Logo" width="128">
</p>

<h3 align="center">Tu launcher de Minecraft para Android. Juega con Vanilla, Fabric, Forge y NeoForge en un solo lugar.</h3>

<p align="center">
    <img src="https://img.shields.io/badge/platform-Android-brightgreen.svg" alt="Platform: Android">
    <img src="https://img.shields.io/badge/language-Java%20%26%20JS-yellow.svg" alt="Language: Java & JS">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT">
</p>

---

**GLauncher** es un launcher de Minecraft para Android de código abierto, diseñado para ofrecer una experiencia de escritorio en dispositivos móviles. La interfaz está construida con tecnologías web (HTML, CSS, JavaScript) y se ejecuta dentro de un WebView de Android, lo que permite un desarrollo rápido y una interfaz de usuario rica y personalizable.

## ✨ Características Principales

- **Soporte Multi-Loader**: Juega versiones de **Vanilla**, **Fabric**, **Forge** y **NeoForge**.
- **Interfaz Moderna**: Una UI elegante y animada, diseñada para pantallas horizontales.
- **Editor de Controles Virtuales**: Crea y personaliza tus propios controles táctiles en pantalla con un editor completo que incluye joysticks, botones, y modo de mouse virtual.
- **Gestor de Mods**: Explora y gestiona mods directamente desde la API de Modrinth.
- **Instalador Integrado**: Descarga e instala automáticamente las versiones de Minecraft, sus librerías y dependencias.
- **GMusic Player**: Un reproductor de música integrado que busca en YouTube (a través de un servidor local) y reproduce solo el audio para que puedas escuchar música mientras juegas.
- **Gestión de Cuentas**: Soporte para cuentas offline y una interfaz preparada para cuentas de Microsoft.
- **Alta Personalización**: Ajusta la RAM asignada, los argumentos de la JVM y otras configuraciones del launcher.

## 📸 Vistazos

<table>
  <tr>
    <td align="center"><strong>Pantalla de Inicio</strong></td>
    <td align="center"><strong>Selector de Versiones</strong></td>
    <td align="center"><strong>Editor de Controles</strong></td>
  </tr>
  <tr>
    <td><img src="https://i.imgur.com/your-screenshot-1.png" alt="Pantalla de Inicio"></td>
    <td><img src="https://i.imgur.com/your-screenshot-2.png" alt="Selector de Versiones"></td>
    <td><img src="https://i.imgur.com/your-screenshot-3.png" alt="Editor de Controles"></td>
  </tr>
</table>

*(Nota: Las imágenes son placeholders. Reemplázalas con capturas de pantalla reales de la app.)*

## 🛠️ Tech Stack

- **App Android**: Java Nativo con `AppCompat` y `WebView`.
- **Interfaz (UI)**: HTML5, CSS3, JavaScript (ES6).
- **Servidor GMusic (Local)**: Node.js con Express y `yt-search`.
- **APIs Externas**:
  - Mojang API (para versiones Vanilla)
  - Prism Launcher Meta (para Forge/NeoForge)
  - Fabric Meta (para Fabric)
  - Modrinth API (para búsqueda de mods)

## 🚀 Cómo Empezar

Esta sección es para desarrolladores que deseen compilar el proyecto desde el código fuente.

**Prerrequisitos:**
- **Android Studio**: Para compilar y ejecutar la aplicación de Android.
- **Node.js**: (Opcional) Para ejecutar el servidor de GMusic en local si no se usa la API pública.
- Un dispositivo o emulador de Android (API 24+).

### Compilar y Ejecutar la App (APK)

1.  Clona este repositorio.
2.  Abre el proyecto en Android Studio.
3.  Sincroniza el proyecto con los archivos de Gradle.
4.  Conecta tu dispositivo o inicia un emulador.
5.  Ejecuta la configuración de la app `app` para instalar el APK en tu dispositivo.


## 🤝 Contribuciones

Las contribuciones son bienvenidas. Si tienes ideas, sugerencias o encuentras un error, por favor abre un *issue* o envía un *pull request*.

## 📜 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---
<p align="center">Desarrollado por ◈𝐙𝐘𝐑𝐎𝐕𝐄𝐍𝐓◈ para la comunidad de Minecraft.</p>