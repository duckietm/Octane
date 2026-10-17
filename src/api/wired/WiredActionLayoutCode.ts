/**
 * Official action codes (AIR ActionTypeCodes, build WIN63-202610131318). Codes from 1000 up are our
 * own actions: 1000 plus the code they had before the official table, so they stay traceable.
 */
export class WiredActionLayoutCode {
    public static TOGGLE_FURNI_STATE: number = 0;
    public static RESET: number = 1;
    public static SET_FURNI_STATE: number = 3;
    public static MOVE_FURNI: number = 4;
    public static GIVE_SCORE: number = 6;
    public static CHAT: number = 7;
    public static TELEPORT: number = 8;
    public static JOIN_TEAM: number = 9;
    public static LEAVE_TEAM: number = 10;
    public static CHASE: number = 11;
    public static FLEE: number = 12;
    public static MOVE_AND_ROTATE_FURNI: number = 13;
    public static GIVE_SCORE_TO_PREDEFINED_TEAM: number = 14;
    public static TOGGLE_TO_RANDOM_STATE: number = 15;
    public static MOVE_FURNI_TO: number = 16;
    public static GIVE_REWARD: number = 17;
    public static CALL_ANOTHER_STACK: number = 18;
    public static KICK_FROM_ROOM: number = 19;
    public static MUTE_USER: number = 20;
    public static BOT_TELEPORT: number = 21;
    public static BOT_MOVE: number = 22;
    public static BOT_TALK: number = 23;
    public static BOT_GIVE_HAND_ITEM: number = 24;
    public static BOT_FOLLOW_AVATAR: number = 25;
    public static BOT_CHANGE_FIGURE: number = 26;
    public static BOT_TALK_DIRECT_TO_AVTR: number = 27;
    public static CONTROL_CLOCK: number = 28;
    public static SET_ALTITUDE: number = 29;
    public static SEND_SIGNAL: number = 30;
    public static FREEZE: number = 31;
    public static UNFREEZE: number = 32;
    public static RELATIVE_MOVE: number = 33;
    public static FURNI_TO_FURNI: number = 34;
    public static FURNI_TO_USER: number = 35;
    public static NEG_CALL_ANOTHER_STACK: number = 36;
    public static NEG_SEND_SIGNAL: number = 37;
    public static ADJUST_CLOCK: number = 38;
    public static GIVE_VARIABLE: number = 39;
    public static REMOVE_VARIABLE: number = 40;
    public static CHANGE_VARIABLE_VALUE: number = 41;
    public static MOVE_ROTATE_USER: number = 42;
    public static USER_TO_FURNI: number = 43;
    public static TELEPORT_TO_ROOM: number = 44;
    public static GIVE_CURRENCY_FROM_CHEST: number = 45;
    public static GIVE_FURNI_FROM_CHEST: number = 46;
    public static INIT_TRANSACTION: number = 47;
    public static CANCEL_TRANSACTION: number = 48;
    public static WRITE_TO_LOGS: number = 49;
    public static PROGRESS_ACHIEVEMENT: number = 51;
    /** Official give effect (wf_act_give_effect). */
    public static EFFECT_ID: number = 52;
    public static OVERRIDE_HEIGHT: number = 53;
    public static CLICK_SETTINGS: number = 54;
    public static PLACE_FURNI: number = 55;
    public static REMOVE_FURNI: number = 56;
    public static MOVE_FURNI_AS_GROUP: number = 57;
    public static PROGRESS_REWARD_TRACK: number = 58;
    public static RESET_REWARD_TRACK: number = 59;
    public static CHANGE_OPACITY: number = 61;
    public static SET_FURNI_HIGHLIGHT: number = 62;

    // Ours.
    public static SET_ROLLER_SPEED: number = 1088;
    public static BOT_DANCE: number = 1089;
    public static GIVE_POINTS_TYPE: number = 1090;
    public static GIVE_OR_TAKE_FURNI: number = 1091;
    public static PLAY_YOUTUBE: number = 1092;
    public static QUICK_BOPPER: number = 1093;
    public static SET_ROOM_AD: number = 1094;
    public static WALK_TO_FURNI: number = 1115;
    public static USER_TARGET: number = 1116;
    public static MOVE_USER_TILES: number = 1117;
    public static EFFECT_AMOUNT: number = 1118;
    public static EFFECT_BADGE: number = 1119;
    public static EFFECT_TAG: number = 1120;
    public static EFFECT_MESSAGE: number = 1122;
    public static EFFECT_TEXT: number = 1123;
    public static ALL_USERS_LEAVE_TEAM: number = 1124;
    public static MODIFY_ARRAY: number = 1126;
    /** Ours (wf_act_move_group_step): the selected furni step one tile in a compass direction. */
    public static MOVE_FURNI_GROUP_STEP: number = 1154;
    /** Ours (wf_act_spawn_furni): mint a new furni by base item id. */
    public static SPAWN_FURNI: number = 1155;
    /** Ours (wf_act_pickup_furni): pick the furni up into its owner's inventory. */
    public static PICKUP_FURNI: number = 1156;
    /** Ours (wf_act_give_handitem): it shared the official give effect's code (52). */
    public static GIVE_HAND_ITEM: number = 1157;
}
