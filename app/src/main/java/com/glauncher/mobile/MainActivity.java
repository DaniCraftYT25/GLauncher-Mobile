package com.glauncher.mobile;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.SharedPreferences;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.util.Log;
import android.net.Uri;
import android.view.WindowManager;
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
import java.net.URL;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private WebView audioWebView;
    private static final int STORAGE_PERMISSION_CODE = 101;
    private static final int BACKGROUND_PICKER_CODE = 102;
    public static final String PREFS_NAME = "GLauncherPrefs";
    
    private static final String JRE_17_URL = "https://github.com/DaniCraftYT25/GLauncher-Mobile/releases/download/JRES/jre17.zip";
    private static final String JRE_21_URL = "https://github.com/DaniCraftYT25/GLauncher-Mobile/releases/download/JRES/jre21.zip";
    private static final String JRE_8_URL = "https://github.com/DaniCraftYT25/GLauncher-Mobile/releases/download/JRES/jre8.zip";


    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

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

        webView.addJavascriptInterface(new WebAppInterface(), "GLauncher");
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

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == BACKGROUND_PICKER_CODE && resultCode == Activity.RESULT_OK) {
            if (data != null) {
                Uri uri = data.getData();
                if (uri != null) {
                    final int takeFlags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    getContentResolver().takePersistableUriPermission(uri, takeFlags);
                    runJs("window.onBackgroundSelected('" + uri.toString() + "')");
                }
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
            return prefs.getString("virtual_controls_config", "[]");
        }

        @JavascriptInterface
        public void saveUserProfile(String jsonProfile) {
            try {
                File baseDir = new File(MainActivity.this.getExternalFilesDir(null), "GLauncher");
                if (!baseDir.exists()) baseDir.mkdirs();
                File profileFile = new File(baseDir, "user_profile.json");
                try (FileOutputStream fos = new FileOutputStream(profileFile)) {
                    fos.write(jsonProfile.getBytes(StandardCharsets.UTF_8));
                }
                runOnUiThread(() -> runJs("showNotification('Perfil de usuario guardado', 'success')"));
            } catch (IOException e) {
                e.printStackTrace();
                runOnUiThread(() -> runJs("showNotification('Error al guardar el perfil', 'error')"));
            }
        }

        @JavascriptInterface
        public String loadUserProfile() {
            File baseDir = new File(MainActivity.this.getExternalFilesDir(null), "GLauncher");
            File profileFile = new File(baseDir, "user_profile.json");
            if (!profileFile.exists()) {
                return "{}";
            }
            try (FileInputStream fis = new FileInputStream(profileFile)) {
                int size = fis.available();
                byte[] buffer = new byte[size];
                fis.read(buffer);
                return new String(buffer, StandardCharsets.UTF_8);
            } catch (IOException e) {
                e.printStackTrace();
                return "{}";
            }
        }

        @JavascriptInterface
        public void selectBackgroundImage() {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "video/*"});
            startActivityForResult(intent, BACKGROUND_PICKER_CODE);
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
        public void togglePlayPause() {
            runOnUiThread(() -> {
                audioWebView.evaluateJavascript("if(player && typeof player.getPlayerState === 'function'){ if(player.getPlayerState() === 1) { player.pauseVideo(); } else { player.playVideo(); } }", null);
            });
        }

        @JavascriptInterface
        public void seekAudio(int seconds) {
            runOnUiThread(() -> {
                audioWebView.evaluateJavascript("if(player && typeof player.seekTo === 'function'){ player.seekTo(player.getCurrentTime() + " + seconds + ", true); }", null);
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
                    File nativesDir = new File(baseDir, "natives/" + versionId);
                    libsDir.mkdirs();
                    nativesDir.mkdirs();

                    JSONArray libraries = manifestJson.getJSONArray("libraries");
                    for (int i = 0; i < libraries.length(); i++) {
                        if (i % 5 == 0) { runJs("updateDownloadProgress(" + (50 + (int)((i * 50.0) / libraries.length())) + ", 'Descargando librerías...')"); }
                        JSONObject lib = libraries.getJSONObject(i);

                        boolean allowed = true;
                        if (lib.has("rules")) {
                            allowed = false;
                            JSONArray rules = lib.getJSONArray("rules");
                            for (int j = 0; j < rules.length(); j++) {
                                JSONObject rule = rules.getJSONObject(j);
                                String action = rule.optString("action", "allow");
                                if (!rule.has("os")) {
                                    if (action.equals("allow")) allowed = true;
                                    else if (action.equals("disallow")) allowed = false;
                                } else {
                                    String osName = rule.getJSONObject("os").optString("name", "");
                                    if (osName.equals("linux") || osName.equals("osx") || osName.equals("windows")) {
                                        // En Android tratamos las reglas de Linux/Genéricas como permitidas si action=allow
                                        if (osName.equals("linux") && action.equals("allow")) allowed = true;
                                        if (osName.equals("windows") && action.equals("allow")) allowed = false;
                                    }
                                }
                            }
                        }
                        if (!allowed) continue;

                        JSONObject downloads = lib.optJSONObject("downloads");
                        if (downloads == null) continue;

                        if (downloads.has("artifact")) {
                            JSONObject artifact = downloads.getJSONObject("artifact");
                            String libPath = artifact.getString("path");
                            String libUrl = artifact.getString("url");
                            File libFile = new File(libsDir, libPath);
                            if (!libFile.exists()) {
                                downloadFile(libUrl, libFile, "Descargando librerías...", 0, 0);
                            }
                        }

                        if (lib.has("natives") && lib.getJSONObject("natives").has("linux")) {
                            String classifier = lib.getJSONObject("natives").getString("linux");
                            if (downloads.has("classifiers") && downloads.getJSONObject("classifiers").has(classifier)) {
                                JSONObject nativeArtifact = downloads.getJSONObject("classifiers").getJSONObject(classifier);
                                String nativeUrl = nativeArtifact.getString("url");
                                File nativeJar = new File(libsDir, nativeArtifact.getString("path"));
                                if (!nativeJar.exists()) {
                                    downloadFile(nativeUrl, nativeJar, "Descargando nativos...", 0, 0);
                                }
                                extractZip(nativeJar, nativesDir);
                            }
                        }
                    }
                    runJs("updateDownloadProgress(100, '¡Instalación completada!')");
                } catch (Exception e) {
                    e.printStackTrace();
                    runJs("updateDownloadProgress(-1, 'Error: " + e.getMessage().replace("'", "") + "')");
                }
            }).start();
        }

        @JavascriptInterface
        public void deleteMinecraftVersion(final String versionId) {
            new Thread(() -> {
                try {
                    File baseDir = new File(MainActivity.this.getExternalFilesDir(null), "GLauncher");
                    File versionDir = new File(baseDir, "versions/" + versionId);
                    if (versionDir.exists()) {
                        deleteDirectory(versionDir);
                        runOnUiThread(() -> runJs("showNotification('Versión " + versionId + " borrada correctamente', 'success')"));
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    runOnUiThread(() -> runJs("showNotification('Error al borrar la versión: " + e.getMessage().replace("'", "") + "', 'error')"));
                }
            }).start();
        }

        private void deleteDirectory(File fileOrDirectory) {
            if (fileOrDirectory.isDirectory()) {
                File[] children = fileOrDirectory.listFiles();
                if (children != null) {
                    for (File child : children) {
                        deleteDirectory(child);
                    }
                }
            }
            fileOrDirectory.delete();
        }
        
        private void extractZip(File zipFile, File destDir) throws IOException {
            try (ZipInputStream zis = new ZipInputStream(new BufferedInputStream(new FileInputStream(zipFile)))) {
                ZipEntry zipEntry;
                while ((zipEntry = zis.getNextEntry()) != null) {
                    if (zipEntry.getName().startsWith("META-INF/")) {
                        continue;
                    }
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
                        try (FileOutputStream fos = new FileOutputStream(newFile)) {
                            byte[] buffer = new byte[8192];
                            int len;
                            while ((len = zis.read(buffer)) > 0) {
                                fos.write(buffer, 0, len);
                            }
                        }
                    }
                }
            }
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
                InputStream input = new BufferedInputStream(url.openStream());
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

        private String resolveJreDirName(String versionId) {
            String normalizedVersion = versionId != null ? versionId.toLowerCase() : "";
            if (normalizedVersion.startsWith("1.20.5") || normalizedVersion.startsWith("1.21") || normalizedVersion.startsWith("1.22")) {
                return "jre21";
            }
            if (normalizedVersion.startsWith("1.17") || normalizedVersion.startsWith("1.18") || normalizedVersion.startsWith("1.19") || normalizedVersion.startsWith("1.20")) {
                return "jre17";
            }
            return "jre8";
        }

        @JavascriptInterface
        public void launchMinecraftVersion(final String versionId, final int ramMb) {
            Log.d("GLauncher_ManoDura", "launchMinecraftVersion llamado para " + versionId + " con " + ramMb + "MB RAM");

            if (versionId == null || versionId.trim().isEmpty() || "undefined".equalsIgnoreCase(versionId.trim())) {
                runOnUiThread(() -> runJs("showNotification('Error: ID de versión inválido', 'error')"));
                return;
            }

            File baseDir = new File(MainActivity.this.getExternalFilesDir(null), "GLauncher");
            File versionDir = new File(baseDir, "versions/" + versionId);
            File versionJar = new File(versionDir, versionId + ".jar");
            File nativesDir = new File(baseDir, "natives/" + versionId);

            if (!versionJar.exists() || !nativesDir.exists() || nativesDir.listFiles() == null || nativesDir.listFiles().length == 0) {
                runOnUiThread(() -> runJs("showNotification('Primero instala la versión para poder lanzarla', 'warning')"));
                return;
            }

            runOnUiThread(() -> {
                try {
                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                    String virtualControlsConfig = prefs.getString("virtual_controls_config", "[]");

                    String jreDirName = resolveJreDirName(versionId);
                    File jreHome = new File(baseDir, "jres/" + jreDirName);

                    Intent intent = new Intent(MainActivity.this, GameActivity.class);
                    intent.putExtra("versionId", versionId);
                    intent.putExtra("jrePath", jreHome.getAbsolutePath());
                    intent.putExtra("jreDirName", jreDirName);
                    intent.putExtra("useJre17", "jre17".equals(jreDirName));
                    intent.putExtra("virtualControlsConfig", virtualControlsConfig);
                    intent.putExtra("ramMb", ramMb);

                    startActivity(intent);
                    Log.i("GLauncher_ManoDura", "GameActivity lanzada para versión: " + versionId);
                } catch (Exception e) {
                    Log.e("GLauncher_ManoDura", "Error al lanzar GameActivity", e);
                    runJs("showNotification('Error al lanzar el juego: " + e.getMessage().replace("'", "") + "', 'error')");
                }
            });
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
