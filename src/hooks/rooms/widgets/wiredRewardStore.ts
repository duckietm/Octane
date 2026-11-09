import { IWiredTradeNode, IWiredTradeRule, WIRED_TRANSACTION_SUCCESS_REWARD } from '@octane/renderer';
import { WIRED_CHEST_REWARD_LINK } from '../../../api/wired/WiredChests';
import { createOctaneStore } from '../../../state/createOctaneStore';

/** AIR RewardNotificationController.MAX_OPEN_REWARD_NOTIFICATIONS. */
export const WIRED_REWARD_MAX_OPEN = 10;

/** One reward the server handed out (AIR WiredTransactionSuccessContents of type 2). */
export interface IWiredRewardReceipt {
    id: number;
    nodes: IWiredTradeNode[];
    text: string;
}

export type WiredRewardState = {
    /** Every reward of this room by id, so a notification can still open its own reward later. */
    receipts: Record<number, IWiredRewardReceipt>;
    /** The open reward windows, oldest first. */
    open: number[];
    nextId: number;
};

export type WiredRewardActions = {
    /** Keeps a reward and answers its id (AIR keys the contents by a running number). */
    add(nodes: IWiredTradeNode[], text: string): number;
    /** Opens a reward's window; an open one stays where it is, and the oldest closes past ten. */
    openReward(id: number): void;
    closeReward(id: number): void;
    /** The room went away: so do its rewards (AIR ROOM_DISPOSED). */
    clear(): void;
};

export const useWiredRewardStore = createOctaneStore<WiredRewardState & WiredRewardActions>()((set, get) => ({
    receipts: {},
    open: [],
    nextId: 1,

    add: (nodes, text) =>
    {
        const id = get().nextId;

        set(state => ({ receipts: { ...state.receipts, [id]: { id, nodes: [ ...(nodes ?? []) ], text: text ?? '' } }, nextId: id + 1 }));

        return id;
    },

    openReward: id => set(state =>
    {
        if(!state.receipts[id] || state.open.includes(id)) return state;

        const open = [ ...state.open, id ];

        return { open: open.slice(Math.max(0, open.length - WIRED_REWARD_MAX_OPEN)) };
    }),

    closeReward: id => set(state => ({ open: state.open.filter(value => value !== id) })),

    clear: () => set({ receipts: {}, open: [] })
}));

/** What the WiredTransactionSuccess parser carries for a reward. */
export interface IWiredRewardSuccess {
    successType: number;
    hasRewardContents: boolean;
    rewardRule: IWiredTradeRule;
    rewardText: string;
    openByDefault: boolean;
}

/**
 * AIR RewardNotificationController.onTransactionSuccess: keeps the reward of a success message under a new id and
 * opens its window when it opens by default. Answers the link the success notification opens the reward with (its
 * click-to-popup text), or null when there is nothing to open from the notification.
 */
export const receiveWiredReward = (success: IWiredRewardSuccess): string | null =>
{
    if(!success || success.successType !== WIRED_TRANSACTION_SUCCESS_REWARD || !success.hasRewardContents || !success.rewardRule) return null;

    const store = useWiredRewardStore.getState();
    const id = store.add(success.rewardRule.nodes, success.rewardText);

    if(success.openByDefault)
    {
        store.openReward(id);

        return null;
    }

    return `${ WIRED_CHEST_REWARD_LINK }/${ id }`;
};
