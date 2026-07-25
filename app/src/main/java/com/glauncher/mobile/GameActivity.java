package com.glauncher.mobile;

import android.app.Activity;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;

public class GameActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configurar para pantalla completa inmersiva
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);

        // Obtener la versión a lanzar y la configuración de controles
        String versionId = getIntent().getStringExtra("versionId");
        SharedPreferences prefs = getSharedPreferences("GLauncherPrefs", MODE_PRIVATE);
        String controlsConfig = prefs.getString("virtualControlsConfig", "{}");

        // Layout principal que contendrá el juego y los controles
        FrameLayout mainLayout = new FrameLayout(this);
        mainLayout.setBackgroundColor(0xFF000000); // Fondo negro

        // Aquí es donde se iniciaría el proceso de Minecraft (p. ej. con Pojav)
        // y se añadiría su vista al 'mainLayout'.

        // Aquí se parsearía 'controlsConfig' y se añadiría la vista de controles virtuales.

        setContentView(mainLayout);
    }
}