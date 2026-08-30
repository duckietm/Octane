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
    public static FURNI_AREA_SELECTOR: number = 28;
    public static FURNI_NEIGHBORHOOD_SELECTOR: number = 29;
    public static FURNI_BYTYPE_SELECTOR: number = 30;
    public static USERS_AREA_SELECTOR: number = 31;
    public static USERS_NEIGHBORHOOD_SELECTOR: number = 32;
    public static SEND_SIGNAL: number = 33;
    public static FREEZE: number = 34;
    public static UNFREEZE: number = 35;
    public static FURNI_TO_USER: number = 36;
    public static USER_TO_FURNI: number = 37;
    public static FURNI_TO_FURNI: number = 38;
    public static SET_ALTITUDE: number = 39;
    public static RELATIVE_MOVE: number = 40;
    public static CONTROL_CLOCK: number = 41;
    public static ADJUST_CLOCK: number = 42;
    public static MOVE_ROTATE_USER: number = 43;
    public static FURNI_ALTITUDE_SELECTOR: number = 44;
    public static FURNI_ON_FURNI_SELECTOR: number = 45;
    public static FURNI_PICKS_SELECTOR: number = 46;
    public static FURNI_SIGNAL_SELECTOR: number = 47;
    public static USERS_SIGNAL_SELECTOR: number = 48;
    public static USERS_BY_TYPE_SELECTOR: number = 49;
    public static USERS_TEAM_SELECTOR: number = 50;
    public static USERS_BY_ACTION_SELECTOR: number = 51;
    public static USERS_BY_NAME_SELECTOR: number = 52;
    public static USERS_ON_FURNI_SELECTOR: number = 53;
    public static USERS_GROUP_SELECTOR: number = 54;
    public static USERS_HANDITEM_SELECTOR: number = 55;
    public static FILTER_FURNI_EXTRA: number = 56;
    public static FILTER_USER_EXTRA: number = 57;
    public static MOVE_CARRY_USERS_EXTRA: number = 58;
    public static MOVE_NO_ANIMATION_EXTRA: number = 59;
    public static ANIMATION_TIME_EXTRA: number = 60;
    public static MOVE_PHYSICS_EXTRA: number = 61;
    public static UNSEEN_EXTRA: number = 62;
    public static RANDOM_EXTRA: number = 63;
    public static EXEC_IN_ORDER_EXTRA: number = 64;
    public static EXECUTION_LIMIT_EXTRA: number = 65;
    public static OR_EVAL_EXTRA: number = 66;
    public static TEXT_OUTPUT_USERNAME_EXTRA: number = 67;
    public static TEXT_OUTPUT_FURNI_NAME_EXTRA: number = 68;
    public static GIVE_VARIABLE: number = 69;
    public static USER_VARIABLE_EXTRA: number = 70;
    public static FURNI_VARIABLE_EXTRA: number = 71;
    public static ROOM_VARIABLE_EXTRA: number = 72;
    public static REMOVE_VARIABLE: number = 73;
    public static CHANGE_VARIABLE_VALUE: number = 74;
    public static FURNI_WITH_VARIABLE_SELECTOR: number = 75;
    public static USERS_WITH_VARIABLE_SELECTOR: number = 76;
    public static FILTER_USERS_BY_VARIABLE_EXTRA: number = 77;
    public static FILTER_FURNI_BY_VARIABLE_EXTRA: number = 78;
    public static VARIABLE_TEXT_CONNECTOR_EXTRA: number = 79;
    public static TEXT_OUTPUT_VARIABLE_EXTRA: number = 80;
    public static VARIABLE_REFERENCE_EXTRA: number = 81;
    public static VARIABLE_LEVELUP_SYSTEM_EXTRA: number = 82;
    public static VARIABLE_ECHO_EXTRA: number = 83;
    public static CONTEXT_VARIABLE_EXTRA: number = 84;
    public static TEXT_INPUT_VARIABLE_EXTRA: number = 85;
    public static NEG_CALL_ANOTHER_STACK: number = 86;
    public static NEG_SEND_SIGNAL: number = 87;
    public static SET_ROLLER_SPEED: number = 88;
    public static BOT_DANCE: number = 89;
    public static GIVE_POINTS_TYPE: number = 90;
    public static GIVE_OR_TAKE_FURNI: number = 91;
    public static PLAY_YOUTUBE: number = 92;
    public static QUICK_BOPPER: number = 93;
    public static SET_ROOM_AD: number = 94;
    public static MOVE_FURNI_AS_GROUP: number = 95;
    public static REMOTE_SELECTOR: number = 96;
    public static MOVEMENT_CURVE_EXTRA: number = 97;
    public static TIME_UTILITIES_EXTRA: number = 98;
    public static GIVE_CURRENCY_FROM_CHEST: number = 99;
    public static CURRENCY_CHEST: number = 100;
    public static FURNI_CHEST: number = 101;
    public static GIVE_FURNI_FROM_CHEST: number = 102;
    public static SCAN_CHEST_FURNI_BY_TYPE: number = 103;
    public static INIT_TRANSACTION: number = 104;
    public static CANCEL_TRANSACTION: number = 105;
    public static PLACE_FURNI: number = 106;
    public static REMOVE_FURNI: number = 107;
    public static QUEST_EXTRA: number = 108;
    public static QUEST_CHAIN_EXTRA: number = 109;
    public static CONTRACT_PAYMENT: number = 110;
    public static CONTRACT_REWARD: number = 111;
    public static CONTRACT_TRADE: number = 112;
    public static CUSTOM_CONTRACT: number = 113;
    public static CHANGE_OPACITY: number = 114;
    /**
     * Walking to a furni borrowed TELEPORT, whose window offers a "teleport instantly" checkbox that
     * this effect never reads — it walks. Same three slots, one control fewer.
     */
    public static WALK_TO_FURNI: number = 115;
    /** Sit, lie down, fast walk: they only need to know which users, not a kick message. */
    public static USER_TARGET: number = 116;
    /** Move a user N tiles — the fourth slot the move/rotate window never sent. */
    public static MOVE_USER_TILES: number = 117;
    /**
     * The shapes that borrowed the chat composer. They store one string and a user source like the
     * chat effects do, but the bubble style and the visibility choice mean nothing to them, and what
     * the textarea held was never a message.
     */
    public static EFFECT_AMOUNT: number = 118;
    public static EFFECT_BADGE: number = 119;
    public static EFFECT_TAG: number = 120;
    public static EFFECT_ID: number = 121;
    public static EFFECT_MESSAGE: number = 122;
    public static EFFECT_TEXT: number = 123;
}
