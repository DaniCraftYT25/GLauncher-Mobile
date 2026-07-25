package com.glauncher.mobile;

import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class GameActivity extends Activity {

    private FrameLayout mainLayout;
    private List<VirtualControl> controls = new ArrayList<>();
    private float lastMouseX, lastMouseY;

    private static class VirtualControl {
        String type, label, function;
        int size, x, y, width, height;
        float opacity;
        String color;

        VirtualControl(JSONObject json) throws JSONException {
            this.type = json.getString("type");
            this.label = json.optString("label", "");
            this.function = json.optString("function", "");
            this.size = json.optInt("size", 80);
            this.width = json.optInt("width", this.size);
            this.height = json.optInt("height", this.size);
            this.x = json.getInt("x");
            this.y = json.getInt("y");
            this.opacity = (float) json.optDouble("opacity", 70.0);
            this.color = json.optString("color", "#888888");
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        hideSystemUI();

        mainLayout = new FrameLayout(this);
        mainLayout.setBackgroundColor(Color.BLACK);
        setContentView(mainLayout);

        String controlsConfig = getIntent().getStringExtra("virtualControlsConfig");
        if (controlsConfig != null && !controlsConfig.isEmpty()) {
            setupVirtualControls(controlsConfig);
        }
    }

    private void setupVirtualControls(String jsonConfig) {
        try {
            JSONArray controlsArray = new JSONArray(jsonConfig);
            for (int i = 0; i < controlsArray.length(); i++) {
                VirtualControl control = new VirtualControl(controlsArray.getJSONObject(i));
                controls.add(control);
                addControlView(control);
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    private void addControlView(VirtualControl control) {
        if ("button".equals(control.type)) {
            Button button = new Button(this);
            button.setText(control.label);
            button.setTextColor(Color.WHITE);
            button.setAlpha(control.opacity / 100f);

            GradientDrawable shape = new GradientDrawable();
            shape.setShape(GradientDrawable.OVAL);
            shape.setColor(Color.parseColor(control.color));
            button.setBackground(shape);

            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(control.size, control.size);
            mainLayout.post(() -> {
                params.leftMargin = (mainLayout.getWidth() * control.x / 100) - (control.size / 2);
                params.topMargin = (mainLayout.getHeight() * control.y / 100) - (control.size / 2);
                button.setLayoutParams(params);
            });

            button.setOnTouchListener((v, event) -> {
                handleTouch(v, event, control);
                return true;
            });

            mainLayout.addView(button);

        } else if ("mouse".equals(control.type)) {
            View trackpad = new View(this);
            trackpad.setAlpha(control.opacity / 100f);

            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(control.width, control.height);
             mainLayout.post(() -> {
                params.leftMargin = (mainLayout.getWidth() * control.x / 100) - (control.width / 2);
                params.topMargin = (mainLayout.getHeight() * control.y / 100) - (control.height / 2);
                trackpad.setLayoutParams(params);
            });

            trackpad.setOnTouchListener((v, event) -> {
                float currentX = event.getX();
                float currentY = event.getY();
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        lastMouseX = currentX;
                        lastMouseY = currentY;
                        break;
                    case MotionEvent.ACTION_MOVE:
                        float dx = currentX - lastMouseX;
                        float dy = currentY - lastMouseY;
                        // PojavLauncher.mouseMove(dx, dy);
                        lastMouseX = currentX;
                        lastMouseY = currentY;
                        break;
                }
                return true;
            });
            mainLayout.addView(trackpad);
        }
    }

    private void handleTouch(View view, MotionEvent event, VirtualControl control) {
        boolean isDown = event.getAction() == MotionEvent.ACTION_DOWN;
        boolean isUp = event.getAction() == MotionEvent.ACTION_UP || event.getAction() == MotionEvent.ACTION_CANCEL;

        if (isDown) view.setAlpha(1.0f);
        if (isUp) view.setAlpha(control.opacity / 100f);

        if (control.function.startsWith("mouse_")) {
            int buttonId = -1;
            if ("mouse_left".equals(control.function)) buttonId = MotionEvent.BUTTON_PRIMARY;
            if ("mouse_right".equals(control.function)) buttonId = MotionEvent.BUTTON_SECONDARY;
            if (buttonId != -1) {
                // PojavLauncher.setMouseButton(buttonId, isDown);
            }
        } else {
            int keyCode = getKeyCodeFromFunction(control.function);
            if (keyCode != -1) {
                 // PojavLauncher.sendKeyEvent(keyCode, isDown);
            }
        }
    }

    private int getKeyCodeFromFunction(String function) {
        switch (function) {
            case "key_w": return KeyEvent.KEYCODE_W;
            case "key_a": return KeyEvent.KEYCODE_A;
            case "key_s": return KeyEvent.KEYCODE_S;
            case "key_d": return KeyEvent.KEYCODE_D;
            case "key_space": return KeyEvent.KEYCODE_SPACE;
            case "key_shift": return KeyEvent.KEYCODE_SHIFT_LEFT;
            case "key_e": return KeyEvent.KEYCODE_E;
            case "key_q": return KeyEvent.KEYCODE_Q;
            case "key_f": return KeyEvent.KEYCODE_F;
            case "key_t": return KeyEvent.KEYCODE_T;
            case "key_ctrl": return KeyEvent.KEYCODE_CTRL_LEFT;
            default: return -1;
        }
    }

    private void hideSystemUI() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN);
    }
}