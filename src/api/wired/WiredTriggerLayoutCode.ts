/**
 * Trigger editor codes as the official AIR client numbers them (TriggerConfCodes, build
 * WIN63-202610131318). Triggers the official client does not have use 1000 and up.
 */
export class WiredTriggerLayout {
    public static AVATAR_SAYS_SOMETHING: number = 0;
    public static AVATAR_WALKS_ON_FURNI: number = 1;
    public static AVATAR_WALKS_OFF_FURNI: number = 2;
    public static EXECUTE_ONCE: number = 3;
    public static TOGGLE_FURNI: number = 4;
    public static EXECUTE_PERIODICALLY: number = 6;
    public static AVATAR_ENTERS_ROOM: number = 7;
    public static GAME_STARTS: number = 8;
    public static GAME_ENDS: number = 9;
    public static SCORE_ACHIEVED: number = 10;
    public static COLLISION: number = 11;
    public static EXECUTE_PERIODICALLY_LONG: number = 12;
    public static BOT_REACHED_STUFF: number = 13;
    public static BOT_REACHED_AVATAR: number = 14;
    public static RECEIVE_SIGNAL: number = 17;
    public static AVATAR_LEAVES_ROOM: number = 23;
    public static EXECUTE_PERIODICALLY_SHORT: number = 19;
    public static CLICK_FURNI: number = 18;
    public static CLICK_TILE: number = 21;
    public static CLICK_USER: number = 24;
    public static USER_PERFORMS_ACTION: number = 16;
    public static CLOCK_COUNTER: number = 15;
    public static VARIABLE_CHANGED: number = 22;
    public static USER_GETS_HANDITEM: number = 1001;
    public static DICE_ROLLED: number = 1000;
    public static PRESS_KEYBIND: number = 1002;
    public static TRANSACTION_COMPLETE: number = 25;
    public static TRANSACTION_FAIL: number = 26;
    /**
     * Team wins and team loses take no settings. They used to answer CUSTOM, which shares code 13
     * with the bot-reached trigger, so the window asked them which bot had arrived.
     */
    public static TEAM_GAME_RESULT: number = 1003;
    /** The long one-shot timer, in 5-second steps; it used to borrow EXECUTE_ONCE and its half seconds. */
    public static EXECUTE_ONCE_LONG: number = 1004;
    /** Say your username: the keyword dialog without the keyword and the match mode it never read. */
    public static AVATAR_SAYS_USERNAME: number = 1005;
    /**
     * Furni state is changed by anyone or anything, wired effects included; TOGGLE_FURNI (4) only
     * answers a user's click. The emulator registers it on wf_trg_state_changed.
     */
    public static STATE_CHANGE: number = 20;
    /** Official: fires once when the room loads, before any other trigger. */
    public static ROOM_INITIALIZED: number = 28;
    /** Official WIRED Link triggers: a picked Link received a message / a dataframe. */
    public static RECEIVE_LINK_MESSAGE: number = 29;
    public static RECEIVE_LINK_DATAFRAME: number = 30;
}
