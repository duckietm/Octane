export class NotificationBubbleType {
    public static FRIENDOFFLINE: string = 'friendoffline';
    public static FRIENDONLINE: string = 'friendonline';
    public static THIRDPARTYFRIENDOFFLINE: string = 'thirdpartyfriendoffline';
    public static THIRDPARTYFRIENDONLINE: string = 'thirdpartyfriendonline';
    public static ACHIEVEMENT: string = 'achievement';
    public static BADGE_RECEIVED: string = 'badge_received';
    public static INFO: string = 'info';
    public static RECYCLEROK: string = 'recyclerok';
    public static RESPECT: string = 'respect';
    public static CLUB: string = 'club';
    public static SOUNDMACHINE: string = 'soundmachine';
    public static SOUNDBOARD: string = 'soundboard';
    public static PETLEVEL: string = 'petlevel';
    public static CLUBGIFT: string = 'clubgift';
    public static BUYFURNI: string = 'buyfurni';
    public static VIP: string = 'vip';
    public static ROOMMESSAGESPOSTED: string = 'roommessagesposted';
    public static MENTION: string = 'mention';
    /** EarningsController.onIncomeRewardNotificationMessageEvent: addItem(..., 'earning', ...). */
    public static EARNING: string = 'earning';
    /** AIR 13 LTD raffle result (`HabboCatalog.onLtdRaffleResult` adds its item with type "ltd"). */
    public static LTD: string = 'ltd';
    /** AIR 13 treasure hunt (`NotificationType.TREASURE_HUNT`, layout `notification_treasurehunt`). */
    public static TREASURE_HUNT: string = 'treasure_hunt';
}
