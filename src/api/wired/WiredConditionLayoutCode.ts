export class WiredConditionlayout {
    public static STATES_MATCH: number = 0;
    public static FURNIS_HAVE_AVATARS: number = 1;
    public static ACTOR_IS_ON_FURNI: number = 2;
    public static TIME_ELAPSED_MORE: number = 3;
    public static TIME_ELAPSED_LESS: number = 4;
    public static USER_COUNT_IN: number = 5;
    public static ACTOR_IS_IN_TEAM: number = 6;
    public static HAS_STACKED_FURNIS: number = 7;
    public static STUFF_TYPE_MATCHES: number = 8;
    public static STUFFS_IN_FORMATION: number = 9;
    public static ACTOR_IS_GROUP_MEMBER: number = 10;
    public static ACTOR_IS_WEARING_BADGE: number = 11;
    public static ACTOR_IS_WEARING_EFFECT: number = 12;
    public static NOT_STATES_MATCH: number = 13;
    public static FURNI_NOT_HAVE_HABBO: number = 14;
    public static NOT_ACTOR_ON_FURNI: number = 15;
    public static NOT_USER_COUNT_IN: number = 16;
    public static NOT_ACTOR_IN_TEAM: number = 17;
    public static NOT_HAS_STACKED_FURNIS: number = 18;
    public static NOT_FURNI_IS_OF_TYPE: number = 19;
    public static NOT_STUFFS_IN_FORMATION: number = 20;
    public static NOT_ACTOR_IN_GROUP: number = 21;
    public static NOT_ACTOR_WEARS_BADGE: number = 22;
    public static NOT_ACTOR_WEARING_EFFECT: number = 23;
    public static DATE_RANGE_ACTIVE: number = 24;
    public static ACTOR_HAS_HANDITEM: number = 25;
    public static MOVEMENT_VALIDATION: number = 26;
    public static COUNTER_TIME_MATCHES: number = 27;
    public static USER_PERFORMS_ACTION: number = 28;
    public static HAS_ALTITUDE: number = 29;
    public static NOT_USER_PERFORMS_ACTION: number = 30;
    public static NOT_ACTOR_HAS_HANDITEM: number = 31;
    public static TRIGGERER_MATCH: number = 32;
    public static NOT_TRIGGERER_MATCH: number = 33;
    public static TEAM_HAS_SCORE: number = 34;
    public static TEAM_HAS_RANK: number = 35;
    public static MATCH_TIME: number = 36;
    public static MATCH_DATE: number = 37;
    public static ACTOR_DIR: number = 38;
    public static SLC_QUANTITY: number = 39;
    public static HAS_VAR: number = 40;
    public static NEG_HAS_VAR: number = 41;
    public static VAR_VAL_MATCH: number = 42;
    public static VAR_AGE_MATCH: number = 43;
    public static NO_BATTLEBANZAI: number = 44;
    public static USER_ON_FURNI_WITH_STATE: number = 45;
    public static TRG_FURNI_ADJACENT_STATE: number = 46;
    public static CHEST_HAS_ITEMS: number = 47;
    public static CHEST_HAS_ITEM_TYPE: number = 48;
    /**
     * A condition answered by the user themselves — gender, room rights. Same dialog as the badge
     * conditions minus the badge-code field, which those boxes showed and never read.
     */
    public static USER_ATTRIBUTE: number = 49;
    public static NOT_USER_ATTRIBUTE: number = 50;
    /**
     * A threshold on something the user holds — inventory items, credits, diamonds, duckets. Same
     * dialog as the team score minus the team colour and the comparison operator, neither of which
     * those boxes consult, and with the amount ceiling the server actually enforces.
     */
    public static USER_AMOUNT: number = 51;
    /**
     * A boolean state the user is in — frozen. Same dialog as the wearing-effect conditions minus the
     * effect id, which those boxes show and never read.
     */
    public static USER_STATE: number = 52;
    public static NOT_USER_STATE: number = 53;
    /**
     * Text read off the user that is not a badge code. The field is genuinely used by these boxes —
     * it was only labelled "Badge code", with the badge's length limit instead of its own.
     */
    public static USER_TAG: number = 54;
    public static NOT_USER_TAG: number = 55;
    public static USER_MOTTO: number = 56;
    /**
     * The three shapes that borrowed the altitude dialog. They inherited its counter-only furni gate,
     * which refuses every furni that is not a game counter — and with it a radius labelled as an
     * altitude, a furni picker where a user source is meant, and a comparison two of them never read.
     */
    public static USER_RANGE: number = 57;
    public static FURNI_RANGE: number = 58;
    public static FURNI_PROPERTY: number = 59;
}
