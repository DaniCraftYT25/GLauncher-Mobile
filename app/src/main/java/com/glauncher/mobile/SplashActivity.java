package com.glauncher.mobile;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.res.AssetManager;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;

import java.io.IOException;
import java.io.InputStream;

@SuppressLint("CustomSplashScreen")
public class SplashActivity extends Activity {

    private static final int SPLASH_DELAY = 2000; // 2 segundos

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ocupar el espacio del notch/cámara y poner en pantalla completa
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        hideSystemUI();

        setContentView(R.layout.activity_splash);

        // Cargar imágenes desde assets
        ImageView faviconLogo = findViewById(R.id.favicon_logo);
        ImageView minecraftTitleLogo = findViewById(R.id.minecraft_title_logo);

        try {
            AssetManager assets = getAssets();

            // Cargar favicon
            InputStream faviconStream = assets.open("icons/favicon.png");
            Drawable faviconDrawable = Drawable.createFromStream(faviconStream, null);
            faviconLogo.setImageDrawable(faviconDrawable);

            // Cargar título de Minecraft
            InputStream titleStream = assets.open("icons/minecraft_title.png");
            Drawable titleDrawable = Drawable.createFromStream(titleStream, null);
            minecraftTitleLogo.setImageDrawable(titleDrawable);

        } catch (IOException e) {
            e.printStackTrace();
        }

        // Handler para iniciar MainActivity después del retraso
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            Intent intent = new Intent(SplashActivity.this, MainActivity.class);
            startActivity(intent);
            finish();
        }, SPLASH_DELAY);
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
}