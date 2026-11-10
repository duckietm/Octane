import { describe, expect, it } from 'vitest';
import {
    CursedDragonChoice,
    CursedDragonClaimState as State,
    cursedDragonPosture,
    cursedDragonStateAfterHasClaimed,
    cursedDragonStateAfterResult,
    isCursedDragonOpenLink,
    resolveCursedDragonClaimId,
    shouldFetchCursedDragonClaim
} from './CursedDragonAdoption';

const ID = 'cursed_dragon_adoption';

describe('cursed dragon adoption', () => {
    it('uses the default claim id when none is configured', () => {
        expect(resolveCursedDragonClaimId('')).toBe(ID);
        expect(resolveCursedDragonClaimId(null)).toBe(ID);
        expect(resolveCursedDragonClaimId(' dragons_2026 ')).toBe('dragons_2026');
    });

    it('opens on the open link only', () => {
        expect(isCursedDragonOpenLink('cursed_dragon_adoption/open')).toBe(true);
        expect(isCursedDragonOpenLink('cursed_dragon_adoption/close')).toBe(false);
        expect(isCursedDragonOpenLink('cursed_dragon_adoption')).toBe(false);
    });

    it('asks for the claim again unless it is in flight or already made', () => {
        expect(shouldFetchCursedDragonClaim(State.UNKNOWN)).toBe(true);
        expect(shouldFetchCursedDragonClaim(State.AVAILABLE)).toBe(true);
        expect(shouldFetchCursedDragonClaim(State.UNAVAILABLE)).toBe(true);
        expect(shouldFetchCursedDragonClaim(State.FETCHING)).toBe(false);
        expect(shouldFetchCursedDragonClaim(State.CLAIMING)).toBe(false);
        expect(shouldFetchCursedDragonClaim(State.CLAIMED)).toBe(false);
    });

    it('takes the has-claimed answer only for its claim and only while fetching', () => {
        expect(cursedDragonStateAfterHasClaimed(State.FETCHING, ID, ID, false)).toBe(State.AVAILABLE);
        expect(cursedDragonStateAfterHasClaimed(State.FETCHING, ID, ID, true)).toBe(State.CLAIMED);
        expect(cursedDragonStateAfterHasClaimed(State.FETCHING, ID, 'chests_starter', true)).toBe(State.FETCHING);
        expect(cursedDragonStateAfterHasClaimed(State.CLAIMING, ID, ID, true)).toBe(State.CLAIMING);
    });

    it('reads the claim result as AIR does', () => {
        expect(cursedDragonStateAfterResult(State.CLAIMING, ID, ID, 0)).toBe(State.CLAIMED);
        expect(cursedDragonStateAfterResult(State.CLAIMING, ID, ID, 1)).toBe(State.CLAIMED);
        expect(cursedDragonStateAfterResult(State.CLAIMING, ID, ID, 2)).toBe(State.UNAVAILABLE);
        expect(cursedDragonStateAfterResult(State.CLAIMING, ID, ID, 3)).toBe(State.UNAVAILABLE);
        expect(cursedDragonStateAfterResult(State.CLAIMING, ID, ID, 4)).toBe(State.AVAILABLE);
        expect(cursedDragonStateAfterResult(State.CLAIMING, ID, 'other', 0)).toBe(State.CLAIMING);
        expect(cursedDragonStateAfterResult(State.AVAILABLE, ID, ID, 0)).toBe(State.AVAILABLE);
    });

    it('cycles the postures, the purple dragon two seconds after the blue one', () => {
        expect(cursedDragonPosture(CursedDragonChoice.BLUE, 0)).toBe('std');
        expect(cursedDragonPosture(CursedDragonChoice.BLUE, 3000)).toBe('flm');
        expect(cursedDragonPosture(CursedDragonChoice.PURPLE, 3000)).toBe('std');
        expect(cursedDragonPosture(CursedDragonChoice.PURPLE, 5000)).toBe('flm');
        expect(cursedDragonPosture(CursedDragonChoice.BLUE, 11000)).toBe('eat');
        expect(cursedDragonPosture(CursedDragonChoice.PURPLE, 18999)).toBe('eat');
        expect(cursedDragonPosture(CursedDragonChoice.BLUE, 24000 + 3000)).toBe('flm');
    });
});
