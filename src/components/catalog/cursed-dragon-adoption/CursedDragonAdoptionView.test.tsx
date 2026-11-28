/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CursedDragonClaimState } from '../../../api/catalog/CursedDragonAdoption';
import { DESKTOP_LAYOUT } from '../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../state/handheldStore';
import { CursedDragonAdoptionView } from './CursedDragonAdoptionView';

const adoption = vi.hoisted(() => ({ isVisible: true, claimState: 2, canClaim: true, close: vi.fn(), makeClaim: vi.fn() }));
const showConfirm = vi.hoisted(() => vi.fn());

vi.mock('../../../hooks/catalog/useCursedDragonAdoption', () => ({ useCursedDragonAdoption: () => adoption }));
vi.mock('../../../hooks', () => ({ useNotification: () => ({ showConfirm }) }));
vi.mock('../../../common/draggable-window', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    DraggableWindow: ({ children, handheldSheet }: { children: React.ReactNode; handheldSheet?: boolean }) => (
        <div data-sheet={String(!!handheldSheet)}>{children}</div>
    )
}));
vi.mock('../../../common', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    LayoutPetImageView: (props: { paletteId: number; typeId: number; posture: string }) => <i data-testid={`pet-${props.paletteId}`} data-posture={props.posture} data-type={props.typeId} />
}));

describe('CursedDragonAdoptionView', () => {
    beforeEach(() => {
        adoption.isVisible = true;
        adoption.claimState = CursedDragonClaimState.AVAILABLE;
        adoption.canClaim = true;
        adoption.makeClaim.mockClear();
        showConfirm.mockClear();
    });

    afterEach(cleanup);

    it('shows nothing until the link opens it', () => {
        adoption.isVisible = false;

        const { container } = render(<CursedDragonAdoptionView />);

        expect(container).toBeEmptyDOMElement();
    });

    it('draws a dragon of each colour on its crate', () => {
        render(<CursedDragonAdoptionView />);

        expect(screen.getByTestId('pet-0')).toHaveAttribute('data-type', '37');
        expect(screen.getByTestId('pet-1')).toHaveAttribute('data-posture', 'std');
        expect(screen.getAllByRole('button', { name: 'Adopt' })).toHaveLength(2);
    });

    it('claims the chosen dragon only after the confirmation', () => {
        render(<CursedDragonAdoptionView />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Adopt' })[1]);

        expect(showConfirm).toHaveBeenCalledTimes(1);
        expect(showConfirm.mock.calls[0][0]).toContain('purple');
        expect(adoption.makeClaim).not.toHaveBeenCalled();

        showConfirm.mock.calls[0][1]();

        expect(adoption.makeClaim).toHaveBeenCalledWith(1);
    });

    it('shows the dragons as adopted and switches the buttons off once claimed', () => {
        adoption.claimState = CursedDragonClaimState.CLAIMED;
        adoption.canClaim = false;

        render(<CursedDragonAdoptionView />);

        const buttons = screen.getAllByRole('button', { name: 'Adopted' });

        expect(buttons).toHaveLength(2);
        fireEvent.click(buttons[0]);
        expect(showConfirm).not.toHaveBeenCalled();
    });

    it('offers the same two dragons on a phone sheet and claims only after the confirmation', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));

        try {
            render(<CursedDragonAdoptionView />);

            expect(screen.getByTestId('handheld-cursed-dragon')).toBeInTheDocument();
            expect(screen.getByTestId('pet-0')).toHaveAttribute('data-type', '37');
            expect(screen.getByTestId('pet-1')).toBeInTheDocument();

            fireEvent.click(screen.getByTestId('handheld-dragon-adopt-blue'));
            expect(showConfirm).toHaveBeenCalledTimes(1);
            expect(showConfirm.mock.calls[0][0]).toContain('blue');
            expect(adoption.makeClaim).not.toHaveBeenCalled();

            showConfirm.mock.calls[0][1]();
            expect(adoption.makeClaim).toHaveBeenCalledWith(0);
        } finally {
            act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
        }
    });
});
