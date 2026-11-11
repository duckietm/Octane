/**
 * AIR CursedDragonAdoptionController: the adoption window lets the user take one of two dragons, once. The claim runs
 * over the free-claim packets (has-claimed request, claim with a choice, claim result).
 */
export const CURSED_DRAGON_LINK_PREFIX = 'cursed_dragon_adoption/';
export const CURSED_DRAGON_DEFAULT_CLAIM_ID = 'cursed_dragon_adoption';
/** AIR CursedDragonPreviewView.PET_TYPE: the pet drawn on the crates, palette 0 (blue) and 1 (purple). */
export const CURSED_DRAGON_DEFAULT_PET_TYPE = 37;

export const CursedDragonChoice = {
    BLUE: 0,
    PURPLE: 1
} as const;

export type CursedDragonChoiceValue = (typeof CursedDragonChoice)[keyof typeof CursedDragonChoice];

export const CursedDragonClaimState = {
    UNKNOWN: 0,
    FETCHING: 1,
    AVAILABLE: 2,
    CLAIMING: 3,
    CLAIMED: 4,
    UNAVAILABLE: 5
} as const;

export type CursedDragonClaimStateValue = (typeof CursedDragonClaimState)[keyof typeof CursedDragonClaimState];

/** AIR `getProperty("cursed_dragon_adoption.claim_id")`, falling back to the default id when empty. */
export const resolveCursedDragonClaimId = (configured: string): string => {
    const claimId = (configured ?? '').trim();

    return claimId.length > 0 ? claimId : CURSED_DRAGON_DEFAULT_CLAIM_ID;
};

/** AIR `open()`: the claim is asked for again unless it is being fetched, being claimed or already claimed. */
export const shouldFetchCursedDragonClaim = (state: CursedDragonClaimStateValue): boolean =>
    state !== CursedDragonClaimState.FETCHING && state !== CursedDragonClaimState.CLAIMING && state !== CursedDragonClaimState.CLAIMED;

/** AIR `onHasClaimedProductResponse`: only the answer for this claim, and only while it is being fetched. */
export const cursedDragonStateAfterHasClaimed = (
    state: CursedDragonClaimStateValue,
    claimId: string,
    answeredClaimId: string,
    hasClaimed: boolean
): CursedDragonClaimStateValue => {
    if (answeredClaimId !== claimId || state !== CursedDragonClaimState.FETCHING) return state;

    return hasClaimed ? CursedDragonClaimState.CLAIMED : CursedDragonClaimState.AVAILABLE;
};

/**
 * AIR `onClaimProductResult`: only the result for this claim, and only while it is being claimed. 0 and 1 are claimed,
 * 2 and 3 not available, anything else lets the user try again.
 */
export const cursedDragonStateAfterResult = (
    state: CursedDragonClaimStateValue,
    claimId: string,
    answeredClaimId: string,
    result: number
): CursedDragonClaimStateValue => {
    if (answeredClaimId !== claimId || state !== CursedDragonClaimState.CLAIMING) return state;

    switch (result) {
        case 0:
        case 1:
            return CursedDragonClaimState.CLAIMED;
        case 2:
        case 3:
            return CursedDragonClaimState.UNAVAILABLE;
        default:
            return CursedDragonClaimState.AVAILABLE;
    }
};

/**
 * The answer to the home screen button's own question (asked whatever the state, so a hotel that opens the adoption
 * shows the button at the next visit of the home screen): the claim is open or not. A claim being made is left alone.
 */
export const cursedDragonStateAfterCheck = (state: CursedDragonClaimStateValue, hasClaimed: boolean): CursedDragonClaimStateValue => {
    if (state === CursedDragonClaimState.CLAIMING) return state;

    return hasClaimed ? CursedDragonClaimState.CLAIMED : CursedDragonClaimState.AVAILABLE;
};

/**
 * The home screen button shows while the user can still adopt: the server says the claim is open (it answers
 * "claimed" both for a user who adopted and for a hotel that does not offer the adoption), or a claim is under way.
 */
export const showsCursedDragonButton = (state: CursedDragonClaimStateValue): boolean =>
    state === CursedDragonClaimState.AVAILABLE || state === CursedDragonClaimState.CLAIMING;

/** AIR `linkReceived`: `cursed_dragon_adoption/open`. */
export const isCursedDragonOpenLink = (url: string): boolean => {
    const parts = (url ?? '').split('/');

    return parts.length >= 2 && parts[1] === 'open';
};

/** AIR CursedDragonPreviewView.update: the length of the posture loop, in milliseconds. */
export const CURSED_DRAGON_POSTURE_LOOP_MS = 24000;

/**
 * AIR CursedDragonPreviewView.update: each dragon breathes fire and eats at its own moment of a 24 second loop, the
 * purple one two seconds after the blue one.
 */
export const cursedDragonPosture = (choice: CursedDragonChoiceValue, elapsedMs: number): string => {
    const time = (((elapsedMs % CURSED_DRAGON_POSTURE_LOOP_MS) + CURSED_DRAGON_POSTURE_LOOP_MS) % CURSED_DRAGON_POSTURE_LOOP_MS) - (choice === CursedDragonChoice.PURPLE ? 2000 : 0);

    if (time >= 3000 && time < 7000) return 'flm';
    if (time >= 11000 && time < 17000) return 'eat';

    return 'std';
};
