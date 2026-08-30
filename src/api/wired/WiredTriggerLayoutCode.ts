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
    public static RECEIVE_SIGNAL: number = 15;
    public static AVATAR_LEAVES_ROOM: number = 16;
    public static EXECUTE_PERIODICALLY_SHORT: number = 17;
    public static CLICK_FURNI: number = 18;
    public static CLICK_TILE: number = 19;
    public static CLICK_USER: number = 20;
    public static USER_PERFORMS_ACTION: number = 21;
    public static CLOCK_COUNTER: number = 22;
    public static VARIABLE_CHANGED: number = 23;
    public static USER_GETS_HANDITEM: number = 25;
    public static DICE_ROLLED: number = 24;
    public static PRESS_KEYBIND: number = 26;
    public static TRANSACTION_COMPLETE: number = 27;
    public static TRANSACTION_FAIL: number = 28;
    /**
     * Team wins and team loses take no settings. They used to answer CUSTOM, which shares code 13
     * with the bot-reached trigger, so the window asked them which bot had arrived.
     */
    public static TEAM_GAME_RESULT: number = 29;

}
