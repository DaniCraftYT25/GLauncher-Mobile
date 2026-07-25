package com.glauncher.mobile;

import android.Manifest;
import android.content.Intent;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private WebView audioWebView;
    private static final int STORAGE_PERMISSION_CODE = 101;
    private static final String JRE_URL = "https://github.com/PojavLauncherTeam/mobile-jre/releases/download/jre17-release/jre-17-aarch64.tar.gz";

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.glauncher_webview);
        audioWebView = findViewById(R.id.audio_webview);

        checkPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE, STORAGE_PERMISSION_CODE);

        WebView.setWebContentsDebuggingEnabled(true);

        // 1. WebView Principal (UI)
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webView.clearCache(true);

        webView.addJavascriptInterface(new WebAppInterface(), "AndroidAudioBridge");
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());

        // 2. WebView de Audio (Oculto)
        WebSettings audioSettings = audioWebView.getSettings();
        audioSettings.setJavaScriptEnabled(true);
        audioSettings.setDomStorageEnabled(true);
        audioSettings.setMediaPlaybackRequiresUserGesture(false);
        audioSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        audioSettings.setUserAgentString("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        audioSettings.setCacheMode(WebSettings.LOAD_NO_CACHE); // No usar caché
        audioWebView.clearCache(true);

        audioWebView.setWebViewClient(new WebViewClient());
        audioWebView.setWebChromeClient(new WebChromeClient());

        webView.loadUrl("file:///android_asset/index.html");
    }

    public void checkPermission(String permission, int requestCode) {
        if (ContextCompat.checkSelfPermission(MainActivity.this, permission) == PackageManager.PERMISSION_DENIED) {
            ActivityCompat.requestPermissions(MainActivity.this, new String[]{permission}, requestCode);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == STORAGE_PERMISSION_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                runJs("showNotification('Permiso de almacenamiento concedido', 'success')");
            }
        }
    }

    // Método para ejecutar JS en el WebView principal desde código Java
    private void runJs(final String js) {
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    public class WebAppInterface {
        @JavascriptInterface
        public void playAudioFromYouTube(final String videoId) {
            runOnUiThread(() -> {
                audioWebView.clearCache(true); // Limpiar caché antes de cargar
                String html = "<!DOCTYPE html><html><head><style>body,html,iframe{margin:0;padding:0;width:100%;height:100%;background:black;overflow:hidden;}</style></head>"
                    + "<body><div id=\"player\"></div><script>"
                    + "var tag = document.createElement('script');"
                    + "tag.src = \"https://www.youtube.com/iframe_api\";"
                    + "var firstScriptTag = document.getElementsByTagName('script')[0];"
                    + "firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);"
                    + "var player;"
                    + "function onYouTubeIframeAPIReady() {"
                    + "  player = new YT.Player('player', {"
                    + "    videoId: '" + videoId + "',"
                    + "    playerVars: { 'autoplay': 1, 'controls': 0, 'loop': 1, 'playlist': '" + videoId + "' },"
                    + "    events: { 'onReady': function(event) { event.target.playVideo(); } }"
                    + "  });"
                    + "}"
                    + "function toggle() { if (player && typeof player.getPlayerState === 'function') { var state = player.getPlayerState(); if (state === 1) { player.pauseVideo(); } else { player.playVideo(); } } }"
                    + "function seek(seconds) { if (player && typeof player.seekTo === 'function') { player.seekTo(player.getCurrentTime() + seconds, true); } }"
                    + "</script></body></html>";

                audioWebView.loadDataWithBaseURL("https://www.youtube.com", html, "text/html", "UTF-8", null);
            });
        }

        @JavascriptInterface
        public void togglePlayPause() {
            runOnUiThread(() -> audioWebView.loadUrl("javascript:toggle()"));
        }

        @JavascriptInterface
        public void seekAudio(final int seconds) {
            runOnUiThread(() -> audioWebView.loadUrl("javascript:seek(" + seconds + ")"));
        }

        @JavascriptInterface
        public void installMinecraftVersion(final String installOptionsJson) {
            new Thread(() -> {
                try {
                    JSONObject installOptions = new JSONObject(installOptionsJson);
                    JSONObject version = installOptions.getJSONObject("version");
                    String javaPath = installOptions.getString("javaPath");

                    File baseDir = new File(Environment.getExternalStorageDirectory(), "GLauncher");
                    File jreDir = new File(baseDir, "runtime");

                    // 1. Copiar y extraer el JRE seleccionado desde los assets si no existe
                    if (!jreDir.exists() || jreDir.list().length == 0) {
                        jreDir.mkdirs();
                        File jreArchive = new File(getCacheDir(), "jre.tar.gz");
                        runJs("updateDownloadProgress(10, 'Copiando OpenJDK (Runtime)...')");
                        copyAsset("runtimes/" + javaPath, jreArchive);
                        runJs("updateDownloadProgress(45, 'Extrayendo OpenJDK...')");
                        extractTarGz(jreArchive, jreDir); // Extracción real
                        jreArchive.delete();
                    }

                    // 2. Descargar archivos de la versión de Minecraft
                    String versionId = version.getString("id");
                    String manifestUrl = version.getString("url");

                    File versionDir = new File(baseDir, "versions/" + versionId);
                    versionDir.mkdirs();

                    // Descargar el manifest de la versión
                    runJs("updateDownloadProgress(5, 'Descargando manifiesto...')");
                    File versionManifestFile = new File(versionDir, versionId + ".json");
                    downloadFile(manifestUrl, versionManifestFile, "Descargando manifiesto...", 5, 15);

                    // 2. Parsear el manifiesto y descargar los archivos reales
                    runJs("updateDownloadProgress(20, 'Leyendo manifiesto...')");
                    String manifestContent = new java.util.Scanner(versionManifestFile).useDelimiter("\\A").next();
                    JSONObject manifestJson = new JSONObject(manifestContent);

                    // Descargar el client.jar
                        JSONObject clientInfo = manifestJson.getJSONObject("downloads").getJSONObject("client");
                        String clientUrl = clientInfo.getString("url");
                        File clientJarFile = new File(versionDir, versionId + ".jar");
                        downloadFile(clientUrl, clientJarFile, "Descargando cliente...", 65, 20);
                    }

                    // Descargar las librerías
                    File libsDir = new File(baseDir, "libraries");
                    libsDir.mkdirs();
                    JSONArray libraries = manifestJson.getJSONArray("libraries");
                    for (int i = 0; i < libraries.length(); i++) {
                        JSONObject lib = libraries.getJSONObject(i);
                        // Algunos modloaders (Forge) no tienen 'downloads' en todas las librerías
                        if (lib.has("downloads")) {
                            JSONObject downloads = lib.getJSONObject("downloads");
                            if (!downloads.has("artifact")) continue;

                            JSONObject artifact = downloads.getJSONObject("artifact");
                            String libPath = artifact.getString("path");
                            String libUrl = artifact.getString("url");
                            File libFile = new File(libsDir, libPath);
                            downloadFile(libUrl, libFile, "Descargando librerías...", 65, 35 * (i + 1) / libraries.length());
                        }
                    }
                    runJs("updateDownloadProgress(100, '¡Instalación completada!')");
                } catch (Exception e) {
                    e.printStackTrace();
                    runJs("updateDownloadProgress(-1, 'Error: " + e.getMessage().replace("'", "") + "')");
                }
            }).start();
        }

        private void downloadFile(String fileURL, File destFile, String message, int progressStart, int progressWeight) throws IOException {
            URL url = new URL(fileURL);
            HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
            try {
                urlConnection.connect();

                // Asegurarse de que el directorio de destino exista
                destFile.getParentFile().mkdirs();

                int fileLength = urlConnection.getContentLength();
                InputStream input = new BufferedInputStream(urlConnection.getInputStream());
                OutputStream output = new FileOutputStream(destFile);

                byte[] data = new byte[4096];
                long total = 0;
                int count;
                while ((count = input.read(data)) != -1) {
                    total += count;
                    if (fileLength > 0) {
                        int percentage = progressStart + (int) ((total * progressWeight) / fileLength);
                        runJs("updateDownloadProgress(" + percentage + ", '" + message + "')");
                    }
                    output.write(data, 0, count);
                }
                output.flush();
                output.close();
                input.close();
            } finally {
                urlConnection.disconnect();
            }
        }

        private void extractZip(File zipFile, File destDir) throws IOException {
            byte[] buffer = new byte[1024];
            ZipInputStream zis = new ZipInputStream(new BufferedInputStream(new java.io.FileInputStream(zipFile)));
            ZipEntry zipEntry = zis.getNextEntry();
            while (zipEntry != null) {
                File newFile = new File(destDir, zipEntry.getName());
                if (zipEntry.isDirectory()) {
                    if (!newFile.isDirectory() && !newFile.mkdirs()) {
                        throw new IOException("Failed to create directory " + newFile);
                    }
                } else {
                    File parent = newFile.getParentFile();
                    if (!parent.isDirectory() && !parent.mkdirs()) {
                        throw new IOException("Failed to create directory " + parent);
                    }
                    FileOutputStream fos = new FileOutputStream(newFile);
                    int len;
                    while ((len = zis.read(buffer)) > 0) {
                        fos.write(buffer, 0, len);
                    }
                    fos.close();
                }
                zipEntry = zis.getNextEntry();
            }
            zis.closeEntry();
            zis.close();
        }

        @JavascriptInterface
        public void setVirtualControls(final String jsonConfig) {
            // Guarda la configuración de los controles en las preferencias de Android
            // para que pueda ser leída por la actividad del juego.
            getSharedPreferences("GLauncherPrefs", MODE_PRIVATE)
                .edit()
                .putString("virtualControlsConfig", jsonConfig)
                .apply();
        }

        @JavascriptInterface
        public void launchMinecraftVersion(final String versionId) {
            runJs("showNotification('Iniciando GameActivity para " + versionId + "...', 'success')");

            Intent intent = new Intent(MainActivity.this, GameActivity.class);
            intent.putExtra("versionId", versionId);
            startActivity(intent);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
                } catch (InterruptedException e) {
                    e.printStackTrace();
                    runJs("updateDownloadProgress(-1, 'Error en la descarga')"); // -1 para indicar error
                }
            }).start();
        }

        @JavascriptInterface
        public void launchMinecraftVersion(final String versionId) {
            // Aquí irá la lógica para iniciar el proceso del juego.
            // Por ahora, solo mostramos una notificación.
            runJs("showNotification('Lanzando Minecraft " + versionId + " desde Android', 'success')");

            // Ejemplo de cómo se podría iniciar una nueva actividad para el juego
            // Intent intent = new Intent(MainActivity.this, GameActivity.class);
            // intent.putExtra("versionId", versionId);
            // startActivity(intent);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
