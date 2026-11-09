/** Official condition quantifier types (the definition's quantifierType byte). */
export const WIRED_QUANTIFIER_NONE = 0;
export const WIRED_QUANTIFIER_FURNI = 1;
export const WIRED_QUANTIFIER_USERS = 2;
export const WIRED_QUANTIFIER_VARIABLES = 3;

/** Quantifier codes: every target has to match (0) or one is enough (1). */
export const WIRED_QUANTIFIER_ALL = 0;
export const WIRED_QUANTIFIER_ANY = 1;

const FAMILIES: Record<number, string> = {
    [WIRED_QUANTIFIER_FURNI]: 'furni',
    [WIRED_QUANTIFIER_USERS]: 'users',
    [WIRED_QUANTIFIER_VARIABLES]: 'variables'
};

/** Whether the condition definition carries a quantifier section. */
export const hasWiredQuantifier = (quantifierType: number | null | undefined): boolean => !!FAMILIES[quantifierType ?? WIRED_QUANTIFIER_NONE];

/**
 * Official UserDefinedRoomEventsCtrl.getQuantifierKey plus the option id: `wiredfurni.params.quantifier.` + furni,
 * users or variables, then `.neg.` when the server marks the condition inverted, else `.`, then 0 or 1.
 */
export const wiredQuantifierLabelKey = (quantifierType: number, isInvert: boolean, value: number): string =>
    `wiredfurni.params.quantifier.${FAMILIES[quantifierType] ?? ''}${isInvert ? '.neg.' : '.'}${value}`;

/** The 0 / 1 code a stored or sent quantifier stands for: anything but 1 is "all". */
export const normalizeWiredQuantifier = (value: number | null | undefined): number => (value === WIRED_QUANTIFIER_ANY ? WIRED_QUANTIFIER_ANY : WIRED_QUANTIFIER_ALL);

/**
 * The quantifier a condition save sends in its slot: the one the quantifier section last set, else the one the
 * definition came with, so a box whose section was never touched keeps its choice.
 */
export const resolveWiredQuantifier = (edited: number | null | undefined, sent: number | null | undefined): number =>
    normalizeWiredQuantifier(edited ?? sent);
