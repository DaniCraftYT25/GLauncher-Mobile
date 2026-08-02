package net.kdt.pojavlaunch;

import android.content.Context;
import com.oracle.dalvik.VMLauncher;
import java.util.ArrayList;
import java.util.Collections;

public class PojavLauncher {
    private final ArrayList<String> mArgs;

    public PojavLauncher(ArrayList<String> args) {
        this.mArgs = args;
    }

    public static ArrayList<String> constructArguments(
            Context context,
            String jrePath,
            String ramMb,
            String version,
            String gameJar,
            String versionDir,
            String gameDir,
            String nativeDir,
            String username,
            String uuid,
            String accessToken,
            String userType,
            String customArgs,
            String width,
            String height,
            String language) {
        ArrayList<String> args = new ArrayList<>();
        args.add("java");
        if (jrePath != null) {
            args.add(jrePath);
        }
        if (ramMb != null) args.add("-Xmx" + ramMb + "M");
        if (gameDir != null) Collections.addAll(args, "-Dminecraft.app.dir=" + gameDir, "-Duser.home=" + gameDir);
        if (nativeDir != null) args.add("-Djava.library.path=" + nativeDir);
        if (gameJar != null) Collections.addAll(args, "-cp", gameJar);
        args.add("net.minecraft.client.main.Main");
        if (username != null) Collections.addAll(args, "--username", username);
        if (version != null) Collections.addAll(args, "--version", version);
        if (gameDir != null) Collections.addAll(args, "--gameDir", gameDir);
        if (uuid != null) Collections.addAll(args, "--uuid", uuid);
        if (accessToken != null) Collections.addAll(args, "--accessToken", accessToken);
        if (userType != null) Collections.addAll(args, "--userType", userType);
        if (width != null) Collections.addAll(args, "--width", width);
        if (height != null) Collections.addAll(args, "--height", height);
        return args;
    }

    public void onPause() {
    }

    public void onResume() {
    }

    public void onDestroy() {
    }

    public void setSurface(android.view.Surface surface) {
        if (surface != null) {
            net.kdt.pojavlaunch.utils.JREUtils.setupBridgeWindow(surface);
        } else {
            net.kdt.pojavlaunch.utils.JREUtils.releaseBridgeWindow();
        }
    }

    public boolean onKeyDown(int keyCode, int scanCode, int unicodeChar) {
        return false;
    }

    public boolean onKeyUp(int keyCode, int scanCode) {
        return false;
    }

    public void onPointerMotion(float dx, float dy) {
    }

    public void onMouseDown(int button) {
    }

    public void onMouseUp(int button) {
    }

    public int launch() {
        if (mArgs == null) return -1;
        try {
            String[] argsArray = mArgs.toArray(new String[0]);
            return VMLauncher.launchJVM(argsArray);
        } catch (Throwable t) {
            t.printStackTrace();
            return -1;
        }
    }
}
