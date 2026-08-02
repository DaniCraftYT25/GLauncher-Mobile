package net.kdt.pojavlaunch;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.util.ArrayList;

public class PojavLauncherTest {
    @Test
    public void constructArgumentsUsesJavaProgramNameAsFirstArg() {
        ArrayList<String> args = PojavLauncher.constructArguments(
                null,
                "/data/app/jre/bin/java",
                "1024",
                "1.17.1",
                "/data/app/versions/1.17.1/1.17.1.jar",
                "/data/app/versions/1.17.1",
                "/data/app/.minecraft",
                "/data/app/natives",
                "Player",
                "uuid",
                "token",
                "mojang",
                "",
                "800",
                "600",
                "en_US"
        );

        assertTrue(args.size() > 0);
        assertEquals("/data/app/jre/bin/java", args.get(0));
        assertTrue(args.contains("net.minecraft.client.main.Main"));
    }
}
