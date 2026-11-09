import { FurnitureType, IFurnitureData, IWiredContractContents, IWiredContractItemType, IWiredContractNode, IWiredContractRule } from '@octane/renderer';

/** AIR contract types (WiredContractController): payment, trade, reward. */
export const WIRED_CONTRACT_PAYMENT = 0;
export const WIRED_CONTRACT_TRADE = 1;
export const WIRED_CONTRACT_REWARD = 2;

/** AIR TradeRequirementNode.TYPE_COIN / TYPE_FURNI. */
export const WIRED_CONTRACT_COIN = 0;
export const WIRED_CONTRACT_FURNI = 1;

/** AIR AddEditContractElement.MAX_COINS / MAX_FURNI. */
export const WIRED_CONTRACT_MAX_COINS = 100000;
export const WIRED_CONTRACT_MAX_FURNI = 500;

/** AIR TradeRuleEditorPreset.MAX_NODES_IN_RULE / TradeRuleListEditorPreset.MAX_RULES. */
export const WIRED_CONTRACT_MAX_NODES = 5;
export const WIRED_CONTRACT_MAX_RULES = 3;

/** AIR PaymentContract.LAYOUT_TYPES and RewardContract earnings categories, in dropdown order. */
export const WIRED_CONTRACT_LAYOUTS = [ 'generic', 'games' ];
export const WIRED_CONTRACT_EARNINGS = [ 11, 13 ];

/** AIR PaymentContract mode: 0 "something (donation)", 1 "specific payment". */
export const WIRED_CONTRACT_MODE_DONATION = 0;
export const WIRED_CONTRACT_MODE_SPECIFIC = 1;

/** AIR text input limits: receive text (TextInputParam 60), reward text (TextAreaParam 200), search (220). */
export const WIRED_CONTRACT_RECEIVE_TEXT_MAX = 60;
export const WIRED_CONTRACT_REWARD_TEXT_MAX = 200;
export const WIRED_CONTRACT_SEARCH_MAX = 220;

/** AIR ItemTypeSelectionPreset.POSTER_IDS: the legacy posters the editor lists as their own rows. */
export const WIRED_CONTRACT_POSTER_IDS = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
    83, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 520, 521, 522,
    523, 1000, 1001, 1002, 1003, 1004, 1005, 1006, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008
];

/** One row of the element editor's furni table (AIR ItemTypeTableObject). */
export interface IWiredContractCandidate
{
    itemType: IWiredContractItemType;
    code: string;
    name: string;
    tradeable: boolean;
}

/** A deep copy, so the editor never edits a parser the connection may reuse. */
export const cloneWiredContractRule = (rule: IWiredContractRule): IWiredContractRule =>
    ({ nodes: rule.nodes.map(node => ({ ...node, itemType: node.itemType ? { ...node.itemType } : null })) });

export const cloneWiredContractContents = (contents: IWiredContractContents): IWiredContractContents => ({
    contractId: contents.contractId,
    contractType: contents.contractType,
    definition: {
        youGiveRule: contents.definition.youGiveRule ? contents.definition.youGiveRule.map(cloneWiredContractRule) : null,
        youGetRule: contents.definition.youGetRule ? cloneWiredContractRule(contents.definition.youGetRule) : null
    },
    paymentMode: contents.paymentMode,
    receiveText: contents.receiveText,
    layoutType: contents.layoutType,
    rewardCategory: contents.rewardCategory,
    showDialog: contents.showDialog,
    rewardText: contents.rewardText
});

/**
 * AIR PaymentContract / TradeContract / RewardContract.show: a type with a payment list needs one, a type with a reward
 * rule needs one; anything else is not opened.
 */
export const canShowWiredContract = (contents: IWiredContractContents): boolean =>
{
    if(contents.contractType !== WIRED_CONTRACT_REWARD && !contents.definition.youGiveRule) return false;
    if(contents.contractType !== WIRED_CONTRACT_PAYMENT && !contents.definition.youGetRule) return false;

    return true;
};

/** AIR TradeRuleListEditorPreset.rules: an empty list still shows one (empty) payment option. */
export const editableWiredContract = (contents: IWiredContractContents): IWiredContractContents =>
{
    const copy = cloneWiredContractContents(contents);

    if(copy.definition.youGiveRule && !copy.definition.youGiveRule.length) copy.definition.youGiveRule = [ { nodes: [] } ];

    return copy;
};

/** AIR TradeRuleListEditorPreset.finalizeRules: payment options with no element are not sent. */
export const finalizeWiredContract = (draft: IWiredContractContents): IWiredContractContents =>
{
    const copy = cloneWiredContractContents(draft);

    if(copy.definition.youGiveRule) copy.definition.youGiveRule = copy.definition.youGiveRule.filter(rule => rule.nodes.length > 0);

    return copy;
};

/** AIR RewardContract.hasCreditNode: the earnings category only means something when credits are handed out. */
export const wiredContractHasCreditNode = (rule: IWiredContractRule | null): boolean =>
    !!rule && rule.nodes.some(node => node.type === WIRED_CONTRACT_COIN);

/**
 * AIR ItemTypeSelectionPreset.createAllFurnis: every floor and wall furni with a code, each legacy poster as its own
 * row, sorted by name.
 */
export const wiredContractCandidates = (items: IFurnitureData[], localize: (key: string) => string = key => key): IWiredContractCandidate[] =>
{
    const candidates: IWiredContractCandidate[] = [];

    for(const item of items)
    {
        const code = item.fullName || item.className;

        if(!code) continue;

        const isWallItem = (item.type === FurnitureType.WALL);
        const tradeable = (item.tradeable !== false);

        if(isWallItem && item.className === 'poster')
        {
            for(const posterId of WIRED_CONTRACT_POSTER_IDS)
            {
                candidates.push({ itemType: { isWallItem, typeId: item.id, legacyPosterId: String(posterId) }, code: `poster*${ posterId }`, name: localize(`poster_${ posterId }_name`), tradeable });
            }

            continue;
        }

        candidates.push({ itemType: { isWallItem, typeId: item.id, legacyPosterId: '' }, code, name: item.name || code, tradeable });
    }

    return candidates.sort((a, b) => a.name.localeCompare(b.name));
};

/** AIR ItemTypeSelectionPreset.updateFilters / ItemTypeTableObject.matchesSubstring: under two characters the whole list, else the lower-case name or the code contains the lower-case search. */
export const filterWiredContractCandidates = (candidates: IWiredContractCandidate[], query: string): IWiredContractCandidate[] =>
{
    const search = query.toLowerCase();

    if(search.length < 2) return candidates;

    return candidates.filter(candidate => candidate.name.toLowerCase().includes(search) || candidate.code.includes(search));
};

export const wiredContractItemKey = (item: IWiredContractItemType | null): string =>
    item ? `${ item.isWallItem ? 'i' : 's' }:${ item.typeId }:${ item.legacyPosterId || '' }` : '';

/**
 * AIR AddEditContractElement.validate: the localization key of the first problem, or null. Coins go up to
 * MAX_COINS (the number input's maximum), furni to MAX_FURNI and only a tradeable furni may be picked.
 */
export const validateWiredContractElement = (type: number, amount: number, candidate: IWiredContractCandidate | null): string | null =>
{
    if(!Number.isInteger(amount) || amount < 1) return 'wiredcontracts.element.amount';
    if(type === WIRED_CONTRACT_COIN) return (amount > WIRED_CONTRACT_MAX_COINS) ? 'wiredcontracts.element.amount' : null;
    if(amount > WIRED_CONTRACT_MAX_FURNI) return 'wiredcontracts.element.too_many_items';
    if(!candidate || !candidate.tradeable) return 'wiredcontracts.element.item_not_allowed';

    return null;
};

/** The node the element editor makes (AIR AddEditContractElement.createNode). */
export const createWiredContractNode = (type: number, amount: number, itemType: IWiredContractItemType | null): IWiredContractNode =>
    ({ type: (type === WIRED_CONTRACT_FURNI) ? 1 : 0, amount, itemType: (type === WIRED_CONTRACT_FURNI && itemType) ? { ...itemType } : null });
