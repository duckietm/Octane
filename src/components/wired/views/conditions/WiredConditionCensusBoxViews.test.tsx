import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { intData: number[]; stringData: string; selectedItems?: unknown[] } | null = null;

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
    Slider: ({ value, onChange }: { value: number; onChange: (value: number) => void }) => (
        <input aria-label="slider" type="range" value={value} onChange={(event) => onChange(parseInt(event.target.value, 10))} />
    )
}));

vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: ({
        userSource,
        furniSource,
        onChangeUsers,
        onChangeFurni
    }: {
        userSource?: number;
        furniSource?: number;
        onChangeUsers?: (value: number) => void;
        onChangeFurni?: (value: number) => void;
    }) => (
        <div>
            {onChangeUsers && (
                <button type="button" data-testid={`users-${userSource}`} onClick={() => onChangeUsers(200)}>
                    users
                </button>
            )}
            {onChangeFurni && (
                <button type="button" data-testid={`furni-${furniSource}`} onClick={() => onChangeFurni(200)}>
                    furni
                </button>
            )}
        </div>
    )
}));

vi.mock('./WiredConditionBaseView', () => ({
    WiredConditionBaseView: ({ children, save, validate, footer }: PropsWithChildren<{ save: () => void; validate?: () => boolean; footer?: ReactNode }>) => (
        <div>
            {children}
            {footer}
            <span data-testid="valid">{validate ? String(validate()) : 'none'}</span>
            <button type="button" onClick={save}>
                Save
            </button>
        </div>
    )
}));

import { WiredConditionFurniOpacityView } from './WiredConditionFurniOpacityView';
import { WiredConditionUserCooldownView } from './WiredConditionUserCooldownView';
import { WiredConditionUserHighscorePointsView } from './WiredConditionUserHighscorePointsView';
import { WiredConditionUserOnceView } from './WiredConditionUserOnceView';
import { WiredConditionUserRankView } from './WiredConditionUserRankView';

const save = () => fireEvent.click(screen.getByText('Save'));

describe('the six condition windows added with the 2026-09 census', () => {
    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        trigger = { intData: [], stringData: '' };
    });

    afterEach(cleanup);

    it('rank: sends [rank, comparison, userSource, quantifier] and reads them back', () => {
        trigger = { intData: [5, 2, 200, 1], stringData: '' };
        render(<WiredConditionUserRankView />);

        expect(screen.getByTestId('users-200')).toBeTruthy();
        save();

        expect(setIntParams).toHaveBeenCalledWith([5, 2, 200, 1]);
    });

    it('rank: an untouched window sends rank 1, at least, the triggering user, every user', () => {
        render(<WiredConditionUserRankView />);
        save();

        expect(setIntParams).toHaveBeenCalledWith([1, 5, 0, 0]);
    });

    it('opacity: sends [opacity, comparison, furniSource] and defaults to 100, equal, picked furni', () => {
        trigger = { intData: [40, 0, 200], stringData: '' };
        const { unmount } = render(<WiredConditionFurniOpacityView />);
        expect(screen.getByTestId('furni-200')).toBeTruthy();
        save();
        expect(setIntParams).toHaveBeenCalledWith([40, 0, 200]);
        unmount();

        trigger = { intData: [], stringData: '' };
        render(<WiredConditionFurniOpacityView />);
        save();
        expect(setIntParams).toHaveBeenLastCalledWith([100, 1, 100]);
    });

    it('cooldown: sends [seconds], never below one second', () => {
        trigger = { intData: [30], stringData: '' };
        const { unmount } = render(<WiredConditionUserCooldownView />);
        save();
        expect(setIntParams).toHaveBeenCalledWith([30]);
        unmount();

        trigger = { intData: [0], stringData: '' };
        render(<WiredConditionUserCooldownView />);
        save();
        expect(setIntParams).toHaveBeenLastCalledWith([1]);
    });

    it('first time and daily: no settings, an empty int list and an empty string', () => {
        render(<WiredConditionUserOnceView daily={true} />);
        expect(screen.getByText(/once per day/)).toBeTruthy();
        save();

        expect(setIntParams).toHaveBeenCalledWith([]);
        expect(setStringParam).toHaveBeenCalledWith('');
    });

    it('highscore points: sends [points, comparison, userSource, quantifier] and needs a scoreboard', () => {
        trigger = { intData: [500, 5, 0, 1], stringData: '', selectedItems: [] };
        const { unmount } = render(<WiredConditionUserHighscorePointsView />);
        expect(screen.getByTestId('valid').textContent).toBe('false');
        save();
        expect(setIntParams).toHaveBeenCalledWith([500, 5, 0, 1]);
        unmount();

        trigger = { intData: [500, 5, 0, 1], stringData: '', selectedItems: [{ id: 1 }] };
        render(<WiredConditionUserHighscorePointsView />);
        expect(screen.getByTestId('valid').textContent).toBe('true');
    });
});
