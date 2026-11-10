/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CursedDragonClaimState as State, cursedDragonStateAfterCheck, showsCursedDragonButton } from '../../../api/catalog/CursedDragonAdoption';
import { HotelViewDragonAdoptionButton } from './HotelViewDragonAdoptionButton';

const adoption = vi.hoisted(() => ({ claimState: 0, open: vi.fn(), checkAvailability: vi.fn() }));

vi.mock('../../../hooks/catalog/useCursedDragonAdoption', () => ({ useCursedDragonAdoption: () => adoption }));

describe('free cursed dragon button', () => {
    beforeEach(() => {
        adoption.claimState = State.UNKNOWN;
        adoption.open.mockClear();
        adoption.checkAvailability.mockClear();
    });

    afterEach(cleanup);

    it('asks the server on the home screen and stays hidden until the adoption is open', () => {
        const { container } = render(<HotelViewDragonAdoptionButton />);

        expect(adoption.checkAvailability).toHaveBeenCalledTimes(1);
        expect(container).toBeEmptyDOMElement();
    });

    it('opens the adoption window while the user can still adopt', () => {
        adoption.claimState = State.AVAILABLE;

        render(<HotelViewDragonAdoptionButton />);
        fireEvent.click(screen.getByRole('button', { name: /Free Cursed Dragon/ }));

        expect(adoption.open).toHaveBeenCalledTimes(1);
    });

    it('is gone once the user adopted or when the hotel does not offer it', () => {
        adoption.claimState = State.CLAIMED;

        const { container } = render(<HotelViewDragonAdoptionButton />);

        expect(container).toBeEmptyDOMElement();
    });

    it('shows for an open claim and a claim under way only', () => {
        expect(showsCursedDragonButton(State.AVAILABLE)).toBe(true);
        expect(showsCursedDragonButton(State.CLAIMING)).toBe(true);
        expect(showsCursedDragonButton(State.UNKNOWN)).toBe(false);
        expect(showsCursedDragonButton(State.FETCHING)).toBe(false);
        expect(showsCursedDragonButton(State.CLAIMED)).toBe(false);
        expect(showsCursedDragonButton(State.UNAVAILABLE)).toBe(false);
    });

    it('takes the answer to its own question, but leaves a claim under way alone', () => {
        expect(cursedDragonStateAfterCheck(State.UNKNOWN, false)).toBe(State.AVAILABLE);
        expect(cursedDragonStateAfterCheck(State.UNKNOWN, true)).toBe(State.CLAIMED);
        expect(cursedDragonStateAfterCheck(State.CLAIMED, false)).toBe(State.AVAILABLE);
        expect(cursedDragonStateAfterCheck(State.AVAILABLE, true)).toBe(State.CLAIMED);
        expect(cursedDragonStateAfterCheck(State.CLAIMING, true)).toBe(State.CLAIMING);
    });
});
