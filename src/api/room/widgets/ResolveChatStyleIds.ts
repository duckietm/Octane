/** One `chat.styles` entry of the UI configuration. */
export interface ChatStyleConfigEntry {
    styleId: number;
    minRank: number;
    isSystemStyle: boolean;
    isHcOnly: boolean;
    isAmbassadorOnly: boolean;
    /** Sold in the catalog (server `chat_bubbles.catalog_item_id`): only its owners may pick it. */
    isPurchasable?: boolean;
}

export interface ChatStyleAccess {
    hasSecurity: (rank: number) => boolean;
    /** acc_anychatcolor: the server keeps the system bubbles for these accounts. */
    canUseSystemStyles: boolean;
    disabledStyleIds: readonly number[];
    isClubMember: boolean;
    isAmbassador: boolean;
    /** Purchasable styles this account bought (events 946 / 2580). */
    ownedPurchasableStyleIds: readonly number[];
}

/**
 * The bubble styles the chat-style selector offers. Mirrors AIR RoomChatInputView: a
 * purchasable style is only offered once the account owns it (`hasPurchasableChatStyle`),
 * whatever its other flags; every other style keeps the rank / club / ambassador rules.
 */
export const ResolveChatStyleIds = (styles: readonly ChatStyleConfigEntry[], access: ChatStyleAccess): number[] => {
    const styleIds: number[] = [];

    for (const style of styles ?? []) {
        if (!style) continue;

        if (style.isPurchasable) {
            if (access.ownedPurchasableStyleIds.includes(style.styleId)) styleIds.push(style.styleId);

            continue;
        }

        // AIR never offers a system style, whatever its rank; staff keep them for :chatcolor parity with the server.
        if (style.isSystemStyle) {
            if (access.canUseSystemStyles && (style.minRank <= 0 || access.hasSecurity(style.minRank))) styleIds.push(style.styleId);

            continue;
        }

        if (style.minRank > 0) {
            if (access.hasSecurity(style.minRank)) styleIds.push(style.styleId);

            continue;
        }

        if (access.disabledStyleIds.indexOf(style.styleId) >= 0) continue;

        if (style.isHcOnly && access.isClubMember) {
            styleIds.push(style.styleId);

            continue;
        }

        if (style.isAmbassadorOnly && access.isAmbassador) {
            styleIds.push(style.styleId);

            continue;
        }

        if (!style.isHcOnly && !style.isAmbassadorOnly) styleIds.push(style.styleId);
    }

    return styleIds;
};
