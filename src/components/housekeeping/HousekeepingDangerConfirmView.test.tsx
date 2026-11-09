/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HousekeepingDangerConfirmView } from './HousekeepingDangerConfirmView';

const mocks = vi.hoisted(() => ({
    setDangerRequest: vi.fn(),
    onConfirm: vi.fn(),
    dangerRequest: null as null | { message: string; expected: string; confirmLabel: string; onConfirm: () => void }
}));

vi.mock('../../api', () => ({
    LocalizeText: (key: string) => ({ 'housekeeping.danger.title': 'Danger', 'housekeeping.confirm.cancel': 'Cancel' })[key] ?? key,
    matchesDangerConfirmation: (typed: string, expected: string) => !!expected && typed.trim().toLowerCase() === expected.trim().toLowerCase()
}));

vi.mock('../../hooks', () => ({
    useHousekeepingStore: () => ({ dangerRequest: mocks.dangerRequest, setDangerRequest: mocks.setDangerRequest })
}));

vi.mock('./views/common/HousekeepingParts', () => ({
    HousekeepingButton: ({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) => (
        <button disabled={disabled} type="button" onClick={onClick}>
            {children}
        </button>
    )
}));

describe('HousekeepingDangerConfirmView', () => {
    beforeEach(() => {
        mocks.setDangerRequest.mockClear();
        mocks.onConfirm.mockClear();
        mocks.dangerRequest = { message: 'Delete everything?', expected: 'ROOM 7', confirmLabel: 'Delete', onConfirm: mocks.onConfirm };
    });
    afterEach(() => cleanup());

    it('renders nothing without a request', () => {
        mocks.dangerRequest = null;
        render(<HousekeepingDangerConfirmView />);

        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('is a dialog that keeps the confirm locked until the target is typed', () => {
        render(<HousekeepingDangerConfirmView />);

        expect(screen.getByRole('dialog', { name: 'Danger' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'room 7' } });

        expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    });

    it('runs the action and closes once confirmed', () => {
        render(<HousekeepingDangerConfirmView />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ROOM 7' } });
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(mocks.setDangerRequest).toHaveBeenCalledWith(null);
        expect(mocks.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('closes on Escape without running the action', () => {
        render(<HousekeepingDangerConfirmView />);
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

        expect(mocks.setDangerRequest).toHaveBeenCalledWith(null);
        expect(mocks.onConfirm).not.toHaveBeenCalled();
    });
});
