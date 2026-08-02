package com.glauncher.mobile;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.os.Build;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.util.Log;
import android.util.SparseArray;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import net.kdt.pojavlaunch.PojavLauncher;

public class GameActivity extends Activity implements SurfaceHolder.Callback {

    private static final String TAG = "GameActivity";
    private static final String JRE_17_URL = "https://github.com/DaniCraftYT25/GLauncher-Mobile/releases/download/JRES/jre17.zip";
    private static final String JRE_21_URL = "https://github.com/DaniCraftYT25/GLauncher-Mobile/releases/download/JRES/jre21.zip";
    private static final String JRE_8_URL = "https://github.com/DaniCraftYT25/GLauncher-Mobile/releases/download/JRES/jre8.zip";

    private SurfaceView surfaceView;
    private PojavLauncher pojavLauncher;
    private VirtualControlsView virtualControlsView;

    private float lastMouseX, lastMouseY;
    private int mousePointerId = -1;

    // Guarda la referencia del SurfaceHolder y asegura sincronización síncrona de superficie
    private SurfaceHolder currentHolder = null;
    private final CountDownLatch surfaceReadyLatch = new CountDownLatch(1);

    private String getUsername() {
        File baseDir = new File(getExternalFilesDir(null), "GLauncher");
        File profileFile = new File(baseDir, "user_profile.json");

        if (!profileFile.exists()) {
            return "Jugador";
        }
        try (FileInputStream fis = new FileInputStream(profileFile)) {
            int size = fis.available();
            byte[] buffer = new byte[size];
            fis.read(buffer);
            String jsonString = new String(buffer, StandardCharsets.UTF_8);
            JSONObject json = new JSONObject(jsonString);
            return json.optString("username", "Jugador");
        } catch (Exception e) {
            Log.e(TAG, "No se pudo leer el perfil de usuario", e);
            return "Jugador";
        }
    }

    private void setExecutableRecursively(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    setExecutableRecursively(child);
                }
            }
        } else {
            String path = file.getAbsolutePath();
            if (path.contains("/bin/") || file.getName().endsWith(".so") || file.getName().equals("java")) {
                file.setExecutable(true, false);
                file.setReadable(true, false);
            }
        }
    }

    private void extractJreFromAssets(String jreDirName, File targetDir) throws Exception {
        String assetPath = "jres/" + jreDirName + ".zip";
        Log.d(TAG, "Extrayendo JRE desde assets: " + assetPath);
        runOnUiThread(() -> Toast.makeText(GameActivity.this, "Descomprimiendo Java (" + jreDirName + ")...", Toast.LENGTH_SHORT).show());

        if (!targetDir.exists()) {
            targetDir.mkdirs();
        }

        try (InputStream is = getAssets().open(assetPath);
             ZipInputStream zis = new ZipInputStream(new BufferedInputStream(is))) {
            extractZipEntries(zis, targetDir);
        }

        setExecutableRecursively(targetDir);
        Log.d(TAG, "Descompresión y asignación de permisos completados para " + jreDirName);
    }

    private void downloadAndExtractJre(String jreDirName, File targetDir) throws Exception {
        String jreUrl = getJreUrl(jreDirName);
        if (jreUrl == null) {
            throw new IllegalArgumentException("No existe una URL de descarga para el JRE " + jreDirName);
        }

        Log.d(TAG, "Descargando JRE desde GitHub Releases: " + jreUrl);
        runOnUiThread(() -> Toast.makeText(GameActivity.this, "Descargando Java (" + jreDirName + ")...", Toast.LENGTH_SHORT).show());

        if (targetDir.exists()) {
            deleteRecursively(targetDir);
        }
        targetDir.mkdirs();

        File archiveFile = new File(targetDir.getParentFile(), jreDirName + ".zip");
        downloadFile(jreUrl, archiveFile);

        try (InputStream is = new BufferedInputStream(new FileInputStream(archiveFile));
             ZipInputStream zis = new ZipInputStream(is)) {
            extractZipEntries(zis, targetDir);
        }

        archiveFile.delete();
        setExecutableRecursively(targetDir);
        Log.d(TAG, "Descarga y extracción completadas para " + jreDirName);
    }

    private void extractZipEntries(ZipInputStream zis, File targetDir) throws IOException {
        ZipEntry entry;
        byte[] buffer = new byte[8192];
        while ((entry = zis.getNextEntry()) != null) {
            File destFile = new File(targetDir, entry.getName());
            if (entry.isDirectory()) {
                destFile.mkdirs();
            } else {
                File parent = destFile.getParentFile();
                if (parent != null && !parent.exists()) {
                    parent.mkdirs();
                }
                try (FileOutputStream fos = new FileOutputStream(destFile);
                     BufferedOutputStream bos = new BufferedOutputStream(fos, buffer.length)) {
                    int count;
                    while ((count = zis.read(buffer)) != -1) {
                        bos.write(buffer, 0, count);
                    }
                    bos.flush();
                }
            }
            zis.closeEntry();
        }
    }

    private void downloadFile(String fileUrl, File destFile) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(fileUrl).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.connect();

        if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
            throw new IOException("No se pudo descargar el JRE: HTTP " + connection.getResponseCode());
        }

        destFile.getParentFile().mkdirs();
        try (InputStream input = new BufferedInputStream(connection.getInputStream());
             FileOutputStream output = new FileOutputStream(destFile)) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
            }
        } finally {
            connection.disconnect();
        }
    }

    private void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursively(child);
                }
            }
        }
        file.delete();
    }

    private String getJreUrl(String jreDirName) {
        if ("jre21".equals(jreDirName)) return JRE_21_URL;
        if ("jre17".equals(jreDirName)) return JRE_17_URL;
        if ("jre8".equals(jreDirName)) return JRE_8_URL;
        return null;
    }

    private File resolveJreDir(File baseJreDir) {
        if (baseJreDir == null) return null;
        if (new File(baseJreDir, "bin/java").exists()) {
            return baseJreDir;
        }
        File[] subFiles = baseJreDir.listFiles();
        if (subFiles != null) {
            for (File sub : subFiles) {
                if (sub.isDirectory() && new File(sub, "bin/java").exists()) {
                    return sub;
                }
            }
        }
        return baseJreDir;
    }

    private boolean assetExists(String assetPath) {
        try (InputStream ignored = getAssets().open(assetPath)) {
            return true;
        } catch (IOException ignored) {
            return false;
        }
    }

    private String chooseBestJreName(String requestedJreName) {
        ArrayList<String> candidates = new ArrayList<>();
        if (requestedJreName != null && !requestedJreName.isEmpty()) {
            candidates.add(requestedJreName);
        }
        candidates.add("jre21");
        candidates.add("jre17");
        candidates.add("jre8");
        File storageRoot = getExternalFilesDir(null);
        if (storageRoot == null) {
            storageRoot = getFilesDir();
        }
        for (String candidate : candidates) {
            File candidateDir = new File(storageRoot, "GLauncher/jres/" + candidate);
            if (new File(candidateDir, "bin/java").exists()) {
                return candidate;
            }
        }
        return requestedJreName != null ? requestedJreName : "jre17";
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.i("GLauncher_ManoDura", "GameActivity.onCreate iniciado.");

        // Evitar que la pantalla se apague automáticamente durante el juego
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        Intent intent = getIntent();
        String versionId = intent.getStringExtra("versionId");
        String jrePath = intent.getStringExtra("jrePath");
        String virtualControlsConfig = intent.getStringExtra("virtualControlsConfig");
        int ramMb = intent.getIntExtra("ramMb", 2048);

        Log.i("GLauncher_ManoDura", "GameActivity ha recibido: versionId=" + versionId + ", jrePath=" + jrePath);

        if (versionId == null || versionId.isEmpty()) {
            Log.e("GLauncher_ManoDura", "Error: Datos de versión inválidos o nulos.");
            Toast.makeText(this, "Error: Datos de lanzamiento inválidos.", Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN);

        FrameLayout mainLayout = new FrameLayout(this);
        setContentView(mainLayout);

        surfaceView = new SurfaceView(this);
        surfaceView.getHolder().addCallback(this);
        mainLayout.addView(surfaceView);

        virtualControlsView = new VirtualControlsView(this, virtualControlsConfig);
        mainLayout.addView(virtualControlsView);

        final boolean useJre17 = intent.getBooleanExtra("useJre17", false);
        final String requestedJreDirName = intent.getStringExtra("jreDirName") != null ? intent.getStringExtra("jreDirName") : (useJre17 ? "jre17" : "jre8");
        final String selectedJreDirName = chooseBestJreName(requestedJreDirName);
        final float resolutionScale = intent.getFloatExtra("resolutionScale", 1.0f);
        File storageRoot = getExternalFilesDir(null);
        if (storageRoot == null) {
            storageRoot = getFilesDir();
        }
        final File jreHome = new File(storageRoot, "GLauncher/jres/" + selectedJreDirName);

        new Thread(() -> {
            try {
                // Esperar a que la superficie de pantalla esté lista antes de lanzar
                surfaceReadyLatch.await();

                File actualJre = resolveJreDir(jreHome);

                if (!new File(actualJre, "bin/java").exists()) {
                    Log.d(TAG, "JRE no encontrado en almacenamiento externo, descargando desde GitHub Releases...");
                    downloadAndExtractJre(selectedJreDirName, jreHome);
                    actualJre = resolveJreDir(jreHome);

                    if (!new File(actualJre, "bin/java").exists()) {
                        throw new IllegalStateException("No se encontró bin/java dentro del JRE descargado (" + selectedJreDirName + ")");
                    }
                } else {
                    setExecutableRecursively(actualJre);
                }

                // Asegurar permisos nativos por comando de sistema (chmod 755) para evitar el código de error -1
                try {
                    String javaPath = new File(actualJre, "bin/java").getAbsolutePath();
                    Runtime.getRuntime().exec("chmod 755 " + javaPath).waitFor();
                    File[] binFiles = new File(actualJre, "bin").listFiles();
                    if (binFiles != null) {
                        for (File binFile : binFiles) {
                            Runtime.getRuntime().exec("chmod 755 " + binFile.getAbsolutePath()).waitFor();
                        }
                    }
                } catch (Exception ePermissions) {
                    Log.w(TAG, "No se pudo ejecutar chmod nativo", ePermissions);
                }

                String username = getUsername();
                File baseDir = new File(getExternalFilesDir(null), "GLauncher");
                String launchJrePath = actualJre.getAbsolutePath();
                if (jrePath != null && new File(jrePath, "bin/java").exists()) {
                    launchJrePath = jrePath;
                } else if (jrePath != null) {
                    Log.w("GLauncher_ManoDura", "jrePath inválido o no existente, usando JRE interno: " + jrePath);
                }
                Log.d("GLauncher_ManoDura", "Construyendo argumentos para PojavLauncher con JRE en: " + launchJrePath);

                // Obtener dimensiones reales de la pantalla del dispositivo dinámicamente y aplicar factor de escala
                DisplayMetrics displayMetrics = new DisplayMetrics();
                getWindowManager().getDefaultDisplay().getRealMetrics(displayMetrics);
                int rawWidth = displayMetrics.widthPixels;
                int rawHeight = displayMetrics.heightPixels;
                
                String screenWidth = String.valueOf((int)(rawWidth * resolutionScale));
                String screenHeight = String.valueOf((int)(rawHeight * resolutionScale));

                ArrayList<String> args = PojavLauncher.constructArguments(
                    GameActivity.this, launchJrePath,
                    String.valueOf(ramMb), versionId,
                    new File(baseDir, "versions/" + versionId + "/" + versionId + ".jar").getAbsolutePath(),
                    new File(baseDir, "versions/" + versionId).getAbsolutePath(),
                    baseDir.getAbsolutePath(),
                    new File(baseDir, "natives/" + versionId).getAbsolutePath(),
                    username, "0", "invalid", "mojang", "", screenWidth, screenHeight, "en_US"
                );


                Log.d("GLauncher_ManoDura", "Argumentos construidos: " + args.toString());

                pojavLauncher = new PojavLauncher(args);

                // Initialize JVM runtime BEFORE launching (loads native libs, sets env vars, etc.)
                pojavLauncher.initRuntime(GameActivity.this, launchJrePath, baseDir.getAbsolutePath());

                if (currentHolder != null && currentHolder.getSurface() != null) {
                    Log.i("GLauncher_ManoDura", "Sincronizando Surface con PojavLauncher...");
                    pojavLauncher.setSurface(currentHolder.getSurface());
                }

                Log.i("GLauncher_ManoDura", "Iniciando motor PojavLauncher...");
                int exitCode = pojavLauncher.launch();
                Log.i("GLauncher_ManoDura", "PojavLauncher finalizó con código: " + exitCode);

                if (exitCode != 0) {
                    final String fullLog = pojavLauncher.getLog();
                    runOnUiThread(() -> {
                        android.widget.ScrollView scrollView = new android.widget.ScrollView(GameActivity.this);
                        android.widget.TextView logView = new android.widget.TextView(GameActivity.this);
                        logView.setText("EXIT CODE: " + exitCode + "\n\n" + fullLog);
                        logView.setTextSize(11f);
                        logView.setTypeface(android.graphics.Typeface.MONOSPACE);
                        logView.setTextColor(0xFFCCCCCC);
                        logView.setPadding(24, 24, 24, 24);
                        logView.setTextIsSelectable(true);
                        scrollView.addView(logView);
                        scrollView.setBackgroundColor(0xFF1A1A2E);

                        new android.app.AlertDialog.Builder(GameActivity.this)
                            .setTitle("GLauncher - Error Console")
                            .setView(scrollView)
                            .setPositiveButton("Cerrar", (d, w) -> finish())
                            .setCancelable(false)
                            .show();
                    });
                    return; // No llamar finish() aquí, el dialog lo hará
                }
                finish();
            } catch (Exception e) {
                Log.e("GLauncher_ManoDura", "Error fatal al iniciar PojavLauncher", e);
                final String fullLog = (pojavLauncher != null ? pojavLauncher.getLog() : "") + "\n\nEXCEPTION: " + e.getClass().getSimpleName() + ": " + e.getMessage();
                final StringBuilder stackTrace = new StringBuilder(fullLog);
                for (StackTraceElement el : e.getStackTrace()) {
                    stackTrace.append("\n    at ").append(el.toString());
                }
                runOnUiThread(() -> {
                    android.widget.ScrollView scrollView = new android.widget.ScrollView(GameActivity.this);
                    android.widget.TextView logView = new android.widget.TextView(GameActivity.this);
                    logView.setText(stackTrace.toString());
                    logView.setTextSize(11f);
                    logView.setTypeface(android.graphics.Typeface.MONOSPACE);
                    logView.setTextColor(0xFFCCCCCC);
                    logView.setPadding(24, 24, 24, 24);
                    logView.setTextIsSelectable(true);
                    scrollView.addView(logView);
                    scrollView.setBackgroundColor(0xFF1A1A2E);

                    new android.app.AlertDialog.Builder(GameActivity.this)
                        .setTitle("GLauncher - Fatal Error")
                        .setView(scrollView)
                        .setPositiveButton("Cerrar", (d, w) -> finish())
                        .setCancelable(false)
                        .show();
                });
            }
        }).start();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (pojavLauncher != null) pojavLauncher.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (pojavLauncher != null) pojavLauncher.onResume();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        Log.i("GLauncher_ManoDura", "GameActivity.onDestroy() llamado.");
        if (pojavLauncher != null) pojavLauncher.onDestroy();
    }

    @Override
    public void surfaceCreated(SurfaceHolder holder) {
        Log.i("GLauncher_ManoDura", "Surface creado exitosamente.");
        this.currentHolder = holder;
        if (pojavLauncher != null) {
            pojavLauncher.setSurface(holder.getSurface());
        }
        surfaceReadyLatch.countDown();
    }

    @Override
    public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {
        this.currentHolder = holder;
    }

    @Override
    public void surfaceDestroyed(SurfaceHolder holder) {
        Log.i("GLauncher_ManoDura", "Surface destruido.");
        this.currentHolder = null;
        if (pojavLauncher != null) {
            pojavLauncher.setSurface(null);
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (pojavLauncher != null) {
            return pojavLauncher.onKeyDown(keyCode, event.getScanCode(), event.getUnicodeChar());
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (pojavLauncher != null) {
            return pojavLauncher.onKeyUp(keyCode, event.getScanCode());
        }
        return super.onKeyUp(keyCode, event);
    }

    @Override
    public void onBackPressed() {
        if (pojavLauncher != null) {
            pojavLauncher.onKeyDown(KeyEvent.KEYCODE_ESCAPE, 1, 27);
            pojavLauncher.onKeyUp(KeyEvent.KEYCODE_ESCAPE, 1);
        }
    }

    private class VirtualControlsView extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final List<VirtualControl> controls = new ArrayList<>();
        private final SparseArray<VirtualControl> pointerToControlMap = new SparseArray<>();

        private class VirtualControl {
            String type, label, func, shape, colorStr;
            float x, y, size;
            int opacity;
            int baseColor, pressedColor;

            boolean isJoystickDragged = false;
            float knobX, knobY;

            // Estados de dirección del joystick para evitar eventos repetidos
            boolean isWPressed = false;
            boolean isAPressed = false;
            boolean isSPressed = false;
            boolean isDPressed = false;

            float left, top, right, bottom;

            VirtualControl(JSONObject json) throws JSONException {
                this.type = json.getString("type");
                this.label = json.getString("label");
                this.func = json.getString("func");
                this.shape = json.getString("shape");
                this.x = (float) json.getDouble("x");
                this.y = (float) json.getDouble("y");
                this.size = (float) json.getDouble("size");
                this.opacity = json.getInt("opacity");
                this.colorStr = json.getString("color");

                this.baseColor = Color.parseColor(colorStr);
                float[] hsv = new float[3];
                Color.colorToHSV(this.baseColor, hsv);
                hsv[2] *= 0.7f;
                this.pressedColor = Color.HSVToColor(hsv);
            }
        }

        public VirtualControlsView(Context context, String jsonConfig) {
            super(context);
            parseConfig(jsonConfig);
            setFocusable(false);
        }

        private void parseConfig(String json) {
            if (json == null || json.isEmpty()) return;
            try {
                JSONObject config = new JSONObject(json);
                JSONArray controlsArray = config.getJSONArray("controls");
                for (int i = 0; i < controlsArray.length(); i++) {
                    controls.add(new VirtualControl(controlsArray.getJSONObject(i)));
                }
            } catch (JSONException e) {
                Log.e(TAG, "Error al parsear controles virtuales", e);
            }
        }

        @Override
        protected void onSizeChanged(int w, int h, int oldw, int oldh) {
            super.onSizeChanged(w, h, oldw, oldh);
            for (VirtualControl ctrl : controls) {
                float realX = ctrl.x / 100f * w;
                float realY = ctrl.y / 100f * h;
                ctrl.left = realX - ctrl.size / 2;
                ctrl.top = realY - ctrl.size / 2;
                ctrl.right = realX + ctrl.size / 2;
                ctrl.bottom = realY + ctrl.size / 2;

                if ("joystick".equals(ctrl.type)) {
                    ctrl.knobX = realX;
                    ctrl.knobY = realY;
                }
            }
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            if (controls.isEmpty()) return;

            canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR);

            for (VirtualControl ctrl : controls) {
                float realX = ctrl.x / 100f * getWidth();
                float realY = ctrl.y / 100f * getHeight();
                boolean isPressed = pointerToControlMap.indexOfValue(ctrl) >= 0;

                paint.setColor(isPressed ? ctrl.pressedColor : ctrl.baseColor);
                paint.setAlpha((int) (ctrl.opacity / 100f * 255));

                if ("button".equals(ctrl.type)) {
                    if ("circle".equals(ctrl.shape)) {
                        canvas.drawCircle(realX, realY, ctrl.size / 2, paint);
                    } else {
                        canvas.drawRect(ctrl.left, ctrl.top, ctrl.right, ctrl.bottom, paint);
                    }
                    paint.setColor(Color.WHITE);
                    paint.setTextSize(ctrl.size * 0.3f);
                    paint.setTextAlign(Paint.Align.CENTER);
                    canvas.drawText(ctrl.label, realX, realY - ((paint.descent() + paint.ascent()) / 2), paint);
                } 
                else if ("joystick".equals(ctrl.type)) {
                    paint.setAlpha((int) (ctrl.opacity / 100f * 200));
                    canvas.drawCircle(realX, realY, ctrl.size, paint);
                    
                    paint.setAlpha(255);
                    canvas.drawCircle(ctrl.knobX, ctrl.knobY, ctrl.size / 2, paint);
                }
            }
        }

        @Override
        public boolean onTouchEvent(MotionEvent event) {
            int action = event.getActionMasked();
            int pointerIndex = event.getActionIndex();
            int pointerId = event.getPointerId(pointerIndex);

            switch (action) {
                case MotionEvent.ACTION_DOWN:
                case MotionEvent.ACTION_POINTER_DOWN: {
                    float x = event.getX(pointerIndex);
                    float y = event.getY(pointerIndex);

                    VirtualControl touchedControl = findControlAt(x, y);
                    if (touchedControl != null) {
                        pointerToControlMap.put(pointerId, touchedControl);
                        if ("button".equals(touchedControl.type)) {
                            pressButton(touchedControl.func);
                        } else if ("joystick".equals(touchedControl.type)) {
                            touchedControl.isJoystickDragged = true;
                        }
                    } else {
                        mousePointerId = pointerId;
                        lastMouseX = x;
                        lastMouseY = y;
                    }
                    break;
                }

                case MotionEvent.ACTION_MOVE: {
                    for (int i = 0; i < event.getPointerCount(); i++) {
                        int currentPointerId = event.getPointerId(i);
                        float moveX = event.getX(i);
                        float moveY = event.getY(i);

                        VirtualControl control = pointerToControlMap.get(currentPointerId);
                        if (control != null && "joystick".equals(control.type)) {
                            handleJoystickMove(control, moveX, moveY);
                        } else if (currentPointerId == mousePointerId) {
                            float dx = moveX - lastMouseX;
                            float dy = moveY - lastMouseY;
                            if (pojavLauncher != null) {
                                pojavLauncher.onPointerMotion(dx, dy);
                            }
                            lastMouseX = moveX;
                            lastMouseY = moveY;
                        }
                    }
                    break;
                }

                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_POINTER_UP:
                case MotionEvent.ACTION_CANCEL: {
                    VirtualControl releasedControl = pointerToControlMap.get(pointerId);
                    if (releasedControl != null) {
                        if ("button".equals(releasedControl.type)) {
                            releaseButton(releasedControl.func);
                        } else if ("joystick".equals(releasedControl.type)) {
                            resetJoystick(releasedControl);
                        }
                        pointerToControlMap.remove(pointerId);
                    } else if (pointerId == mousePointerId) {
                        mousePointerId = -1;
                    }
                    break;
                }
            }
            invalidate();
            return true;
        }

        private VirtualControl findControlAt(float x, float y) {
            for (VirtualControl ctrl : controls) {
                if (x >= ctrl.left && x <= ctrl.right && y >= ctrl.top && y <= ctrl.bottom) {
                    return ctrl;
                }
            }
            return null;
        }

        private int getKeyCodeForFunc(String func) {
            switch (func) {
                case "key_space": return KeyEvent.KEYCODE_SPACE;
                case "key_q": return KeyEvent.KEYCODE_Q;
                case "key_f5": return KeyEvent.KEYCODE_F5;
                case "ingame_menu": return KeyEvent.KEYCODE_ESCAPE;
                default: return 0;
            }
        }

        private void pressButton(String func) {
            if ("attack".equals(func)) {
                if (pojavLauncher != null) pojavLauncher.onMouseDown(MotionEvent.BUTTON_PRIMARY);
            } else if ("use".equals(func)) {
                if (pojavLauncher != null) pojavLauncher.onMouseDown(MotionEvent.BUTTON_SECONDARY);
            } else {
                int keyCode = getKeyCodeForFunc(func);
                if (keyCode != 0 && pojavLauncher != null) {
                    pojavLauncher.onKeyDown(keyCode, 0, 0);
                }
            }
        }

        private void releaseButton(String func) {
            if ("attack".equals(func)) {
                if (pojavLauncher != null) pojavLauncher.onMouseUp(MotionEvent.BUTTON_PRIMARY);
            } else if ("use".equals(func)) {
                if (pojavLauncher != null) pojavLauncher.onMouseUp(MotionEvent.BUTTON_SECONDARY);
            } else {
                int keyCode = getKeyCodeForFunc(func);
                if (keyCode != 0 && pojavLauncher != null) {
                    pojavLauncher.onKeyUp(keyCode, 0);
                }
            }
        }

        private void handleJoystickMove(VirtualControl ctrl, float touchX, float touchY) {
            float centerX = ctrl.x / 100f * getWidth();
            float centerY = ctrl.y / 100f * getHeight();
            float deltaX = touchX - centerX;
            float deltaY = touchY - centerY;

            float distance = (float) Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > ctrl.size) {
                ctrl.knobX = centerX + (deltaX / distance) * ctrl.size;
                ctrl.knobY = centerY + (deltaY / distance) * ctrl.size;
            } else {
                ctrl.knobX = touchX;
                ctrl.knobY = touchY;
            }

            float normalizedX = deltaX / ctrl.size;
            float normalizedY = deltaY / ctrl.size;

            if (pojavLauncher != null) {
                // Dirección W
                boolean wantW = normalizedY < -0.3f;
                if (wantW != ctrl.isWPressed) {
                    ctrl.isWPressed = wantW;
                    if (wantW) pojavLauncher.onKeyDown(KeyEvent.KEYCODE_W, 0, 0);
                    else pojavLauncher.onKeyUp(KeyEvent.KEYCODE_W, 0);
                }

                // Dirección S
                boolean wantS = normalizedY > 0.3f;
                if (wantS != ctrl.isSPressed) {
                    ctrl.isSPressed = wantS;
                    if (wantS) pojavLauncher.onKeyDown(KeyEvent.KEYCODE_S, 0, 0);
                    else pojavLauncher.onKeyUp(KeyEvent.KEYCODE_S, 0);
                }

                // Dirección A
                boolean wantA = normalizedX < -0.3f;
                if (wantA != ctrl.isAPressed) {
                    ctrl.isAPressed = wantA;
                    if (wantA) pojavLauncher.onKeyDown(KeyEvent.KEYCODE_A, 0, 0);
                    else pojavLauncher.onKeyUp(KeyEvent.KEYCODE_A, 0);
                }

                // Dirección D
                boolean wantD = normalizedX > 0.3f;
                if (wantD != ctrl.isDPressed) {
                    ctrl.isDPressed = wantD;
                    if (wantD) pojavLauncher.onKeyDown(KeyEvent.KEYCODE_D, 0, 0);
                    else pojavLauncher.onKeyUp(KeyEvent.KEYCODE_D, 0);
                }
            }
        }

        private void resetJoystick(VirtualControl ctrl) {
            ctrl.isJoystickDragged = false;
            ctrl.knobX = ctrl.x / 100f * getWidth();
            ctrl.knobY = ctrl.y / 100f * getHeight();

            if (pojavLauncher != null) {
                if (ctrl.isWPressed) { ctrl.isWPressed = false; pojavLauncher.onKeyUp(KeyEvent.KEYCODE_W, 0); }
                if (ctrl.isSPressed) { ctrl.isSPressed = false; pojavLauncher.onKeyUp(KeyEvent.KEYCODE_S, 0); }
                if (ctrl.isAPressed) { ctrl.isAPressed = false; pojavLauncher.onKeyUp(KeyEvent.KEYCODE_A, 0); }
                if (ctrl.isDPressed) { ctrl.isDPressed = false; pojavLauncher.onKeyUp(KeyEvent.KEYCODE_D, 0); }
            }
        }
    }
}