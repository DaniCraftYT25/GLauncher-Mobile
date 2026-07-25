package com.glauncher.mobile;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.compressors.gzip.GzipCompressorInputStream;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
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
    public static final String PREFS_NAME = "GLauncherPrefs";
    
    private static final String JRE_17_URL = "https://github.com/PojavLauncherTeam/mobile-jre/releases/download/jre17-release/jre-17-aarch64.tar.gz";
    private static final String JRE_8_URL = "https://github.com/PojavLauncherTeam/mobile-jre/releases/download/jre8-release/jre-8-aarch64.tar.gz";


    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        hideSystemUI();

        webView = findViewById(R.id.glauncher_webview);
        audioWebView = findViewById(R.id.audio_webview);

        checkPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE, STORAGE_PERMISSION_CODE);

        WebView.setWebContentsDebuggingEnabled(true);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webView.clearCache(true);

        webView.addJavascriptInterface(new WebAppInterface(), "Android");
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());

        WebSettings audioSettings = audioWebView.getSettings();
        audioSettings.setJavaScriptEnabled(true);
        audioSettings.setDomStorageEnabled(true);
        audioSettings.setMediaPlaybackRequiresUserGesture(false);
        audioSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        audioSettings.setUserAgentString("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        audioSettings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        audioWebView.clearCache(true);

        audioWebView.setWebViewClient(new WebViewClient());
        audioWebView.setWebChromeClient(new WebChromeClient());

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void hideSystemUI() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN);
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

    private void runJs(final String js) {
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    public class WebAppInterface {

        @JavascriptInterface
        public void setVirtualControls(String jsonConfig) {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString("virtual_controls_config", jsonConfig);
            editor.apply();
            runOnUiThread(() -> runJs("showNotification('Controles virtuales guardados', 'success')"));
        }

        @JavascriptInterface
        public String getVirtualControls() {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            return prefs.getString("virtual_controls_config", "[]"); // Devuelve un array JSON vacío si no hay nada
        }

        @JavascriptInterface
        public void playAudioFromYouTube(final String videoId) {
            runOnUiThread(() -> {
                audioWebView.clearCache(true);
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
                    + "</script></body></html>";

                audioWebView.loadDataWithBaseURL("https://www.youtube.com", html, "text/html", "UTF-8", null);
            });
        }

        @JavascriptInterface
        public void installMinecraftVersion(final String versionJson) {
            new Thread(() -> {
                try {
                    File baseDir = new File(MainActivity.this.getExternalFilesDir(null), "GLauncher");
                    JSONObject version = new JSONObject(versionJson);
                    String versionId = version.getString("id");
                    String manifestUrl = version.getString("url");
                    File versionDir = new File(baseDir, "versions/" + versionId);
                    versionDir.mkdirs();

                    runJs("updateDownloadProgress(5, 'Descargando manifiesto...')");
                    File versionManifestFile = new File(versionDir, versionId + ".json");
                    downloadFile(manifestUrl, versionManifestFile, "Descargando manifiesto...", 5, 10);

                    runJs("updateDownloadProgress(20, 'Leyendo manifiesto...')");
                    String manifestContent = new java.util.Scanner(versionManifestFile).useDelimiter("\\A").next();
                    JSONObject manifestJson = new JSONObject(manifestContent);

                    JSONObject clientInfo = manifestJson.getJSONObject("downloads").getJSONObject("client");
                    String clientUrl = clientInfo.getString("url");
                    File clientJarFile = new File(versionDir, versionId + ".jar");
                    downloadFile(clientUrl, clientJarFile, "Descargando cliente...", 20, 30);

                    File libsDir = new File(baseDir, "libraries");
                    libsDir.mkdirs();
                    JSONArray libraries = manifestJson.getJSONArray("libraries");
                    for (int i = 0; i < libraries.length(); i++) {
                        if (i % 5 == 0) { runJs("updateDownloadProgress(" + (50 + (int)((i * 50.0) / libraries.length())) + ", 'Descargando librerías...')"); }
                        JSONObject lib = libraries.getJSONObject(i);
                        if (lib.has("downloads")) {
                            JSONObject downloads = lib.getJSONObject("downloads");
                            if (!downloads.has("artifact")) continue;
                            JSONObject artifact = downloads.getJSONObject("artifact");
                            String libPath = artifact.getString("path");
                            String libUrl = artifact.getString("url");
                            File libFile = new File(libsDir, libPath);
                            downloadFile(libUrl, libFile, "Descargando librerías...", 0, 0); 
                        }
                    }
                    runJs("updateDownloadProgress(100, '¡Instalación completada!')");
                } catch (Exception e) {
                    e.printStackTrace();
                    runJs("updateDownloadProgress(-1, 'Error: " + e.getMessage().replace("'", "") + "')");
                }
            }).start();
        }
        
        private void installJre(String jreUrl, String jreDirName) throws IOException {
            runOnUiThread(() -> runJs("showNotification('Instalando el entorno de Java...', 'info')"));
            File baseDir = new File(MainActivity.this.getExternalFilesDir(null), "GLauncher");
            File jreDir = new File(baseDir, "jres/" + jreDirName);

            if (new File(jreDir, "bin/java").exists()) {
                runOnUiThread(() -> runJs("showNotification('El entorno de Java ya está instalado.', 'success')"));
                return;
            }
            
            jreDir.mkdirs();
            File jreArchive = new File(jreDir, "jre.tar.gz");

            downloadFile(jreUrl, jreArchive, "Descargando Java Runtime...", 0, 100);
            
            runJs("updateDownloadProgress(0, 'Extrayendo Java Runtime...')");
            extractTarGz(jreArchive, jreDir);
            jreArchive.delete();

            runOnUiThread(() -> runJs("showNotification('Java instalado en: " + jreDir.getAbsolutePath() + "', 'success')"));
        }

        private void downloadFile(String fileURL, File destFile, String message, int progressStart, int progressWeight) throws IOException {
            URL url = new URL(fileURL);
            HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
            try {
                urlConnection.connect();
                destFile.getParentFile().mkdirs();
                int fileLength = urlConnection.getContentLength();
                InputStream input = new BufferedInputStream(urlConnection.getInputStream());
                OutputStream output = new FileOutputStream(destFile);
                byte[] data = new byte[8192];
                long total = 0;
                int count;
                while ((count = input.read(data)) != -1) {
                    total += count;
                    if (fileLength > 0 && progressWeight > 0) {
                        final int percentage = progressStart + (int) ((total * progressWeight) / fileLength);
                        runOnUiThread(() -> runJs("updateDownloadProgress(" + percentage + ", '" + message + "')"));
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
        
        private void extractTarGz(File tarGzFile, File destDir) throws IOException {
            try (FileInputStream fis = new FileInputStream(tarGzFile);
                 BufferedInputStream bis = new BufferedInputStream(fis);
                 GzipCompressorInputStream gzis = new GzipCompressorInputStream(bis);
                 TarArchiveInputStream tis = new TarArchiveInputStream(gzis)) {

                TarArchiveEntry entry;
                while ((entry = tis.getNextTarEntry()) != null) {
                    File outputFile = new File(destDir, entry.getName());
                    if (entry.isDirectory()) {
                        if (!outputFile.exists()) {
                            outputFile.mkdirs();
                        }
                    } else {
                        outputFile.getParentFile().mkdirs();
                        try (FileOutputStream fos = new FileOutputStream(outputFile)) {
                            byte[] buffer = new byte[8192];
                            int len;
                            while ((len = tis.read(buffer)) > 0) {
                                fos.write(buffer, 0, len);
                            }
                        }
                    }
                    if (entry.getName().endsWith("bin/java") && entry.getMode() != 0) {
                        outputFile.setExecutable(true, false);
                    }
                }
            }
        }

        @JavascriptInterface
        public void launchMinecraftVersion(final String versionId) {
            new Thread(() -> {
                try {
                    boolean useJre17 = false;
                    String[] modernVersions = {"1.17", "1.18", "1.19", "1.20", "1.21", "1.22"};
                    for (String modernVersion : modernVersions) {
                        if (versionId.startsWith(modernVersion)) {
                            useJre17 = true;
                            break;
                        }
                    }

                    String jreUrl = useJre17 ? JRE_17_URL : JRE_8_URL;
                    String jreDirName = useJre17 ? "jre17" : "jre8";
                    
                    installJre(jreUrl, jreDirName);

                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                    String virtualControlsConfig = prefs.getString("virtual_controls_config", "[]");

                    runOnUiThread(() -> runJs("showNotification('Iniciando GameActivity para " + versionId + "...', 'success')"));
                    File jreHome = new File(new File(MainActivity.this.getExternalFilesDir(null), "GLauncher"), "jres/" + jreDirName);

                    Intent intent = new Intent(MainActivity.this, GameActivity.class);
                    intent.putExtra("versionId", versionId);
                    intent.putExtra("jrePath", jreHome.getAbsolutePath());
                    intent.putExtra("virtualControlsConfig", virtualControlsConfig);
                    startActivity(intent);

                } catch (Exception e) {
                    e.printStackTrace();
                    runOnUiThread(() -> runJs("updateDownloadProgress(-1, 'Error al preparar Java: " + e.getMessage().replace("'", "") + "')"));
                }
            }).start();
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