package net.kdt.pojavlaunch.customcontrols;

public class ControlJoystickData extends ControlData {

    /* Whether the joystick can stay forward */
    public boolean forwardLock = false;
    /*
     * Whether the finger tracking is absolute (joystick jumps to where you touched)
     * or relative (joystick stays in the center)
     */
    public boolean absolute = false;

    public static final int JOY_LEFT = -10;
    public static final int JOY_RIGHT = -11;

    public ControlJoystickData(){
        super();
    }

    public ControlJoystickData(android.content.Context ctx, int[] keycodes, String dynamicX, String dynamicY, boolean isSquare, boolean forwardLock, boolean absolute, boolean passThru) {
        super("Joystick", keycodes, dynamicX, dynamicY, isSquare);
        this.forwardLock = forwardLock;
        this.absolute = absolute;
        this.passThruEnabled = passThru;
    }

    public ControlJoystickData(ControlJoystickData properties) {
        super(properties);
        forwardLock = properties.forwardLock;
        absolute = properties.absolute;
    }
}
