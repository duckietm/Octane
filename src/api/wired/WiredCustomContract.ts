/**
 * The official Custom Contract (addon 20, AIR `chests/class_4234`): one payment element and one reward element,
 * each coins or furni and a fixed amount (1..100000) or a global / context variable.
 *
 *   ints [payment on, payment type, from a variable, amount, target, reward on, reward type, from a variable, amount, target]
 *   variable ids [payment variable, reward variable]
 *   furni slot 0 the payment furni (first picks), slot 1 the reward furni (second picks)
 *
 * Contracts our older free-form editor saved (`[-1, rules...]`) keep that editor; the server sends the official ints
 * for every contract the official form can say.
 */
export const CUSTOM_CONTRACT_COINS = 0;
export const CUSTOM_CONTRACT_FURNI = 1;
export const CUSTOM_CONTRACT_MIN_AMOUNT = 1;
export const CUSTOM_CONTRACT_MAX_AMOUNT = 100000;
export const CUSTOM_CONTRACT_GLOBAL_TARGET = -10;
export const CUSTOM_CONTRACT_CONTEXT_TARGET = -20;
export const CUSTOM_CONTRACT_PARAMS = 10;

export interface CustomContractElement {
    enabled: boolean;
    type: number;
    fromVariable: boolean;
    /** The amount as typed (the field may be empty while editing). */
    literal: string;
    target: number;
    /** The variable token the picker shows, or ''. */
    token: string;
}

export const emptyCustomContractElement = (): CustomContractElement => ({
    enabled: false,
    type: CUSTOM_CONTRACT_COINS,
    fromVariable: false,
    literal: String(CUSTOM_CONTRACT_MIN_AMOUNT),
    target: CUSTOM_CONTRACT_GLOBAL_TARGET,
    token: ''
});

const clampAmount = (amount: number) =>
    Math.min(CUSTOM_CONTRACT_MAX_AMOUNT, Math.max(CUSTOM_CONTRACT_MIN_AMOUNT, Number.isFinite(amount) ? Math.round(amount) : CUSTOM_CONTRACT_MIN_AMOUNT));

/** Whether the ints are the official form (a fresh box sends none or the official defaults). */
export const isOfficialCustomContractParams = (data: number[] = []): boolean =>
    data.length === 0 || (data.length === CUSTOM_CONTRACT_PARAMS && (data[0] === 0 || data[0] === 1) && (data[5] === 0 || data[5] === 1));

/**
 * One element from the ints at `offset`. AIR `onEditStart`: an element that is off, or reads a variable, shows the
 * value 1; an element on a fixed value shows no variable.
 */
export const readCustomContractElement = (data: number[], offset: number, variableToken: string): CustomContractElement => {
    const enabled = data[offset] === 1;
    const fromVariable = data[offset + 2] === 1 && enabled && !!variableToken;

    return {
        enabled,
        type: data[offset + 1] === CUSTOM_CONTRACT_FURNI ? CUSTOM_CONTRACT_FURNI : CUSTOM_CONTRACT_COINS,
        fromVariable,
        literal: String(enabled && !fromVariable ? clampAmount(data[offset + 3] ?? CUSTOM_CONTRACT_MIN_AMOUNT) : CUSTOM_CONTRACT_MIN_AMOUNT),
        target: data[offset + 4] === CUSTOM_CONTRACT_CONTEXT_TARGET ? CUSTOM_CONTRACT_CONTEXT_TARGET : CUSTOM_CONTRACT_GLOBAL_TARGET,
        token: fromVariable ? variableToken : ''
    };
};

/** The five ints of one element (AIR `readIntParamsFromForm`). */
export const writeCustomContractElement = (element: CustomContractElement, variableId: number): number[] => [
    element.enabled ? 1 : 0,
    element.type,
    element.fromVariable && variableId > 0 ? 1 : 0,
    clampAmount(parseInt(element.literal, 10)),
    element.target
];
