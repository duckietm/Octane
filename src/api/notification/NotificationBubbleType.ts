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
    public static LTD: string = 'ltd';
    public static EARNING: string = 'earning';
    public static WIRED: string = 'wired';
    public static TREASURE_HUNT: string = 'treasure_hunt';
    public static NFT_OPENING: string = 'nft_opening';

    /** The styles drawn with a coloured caption above the text, as the official client does. */
    public static CAPTIONED: string[] = [NotificationBubbleType.WIRED, NotificationBubbleType.TREASURE_HUNT, NotificationBubbleType.NFT_OPENING];

    /** The bubble style a server notification asks for: the first name that is a captioned style, else a plain info bubble. */
    public static resolve(...names: string[]): string {
        return names.find((name) => NotificationBubbleType.CAPTIONED.includes(name)) ?? NotificationBubbleType.INFO;
    }
}
