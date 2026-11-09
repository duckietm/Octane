import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
let trigger: {
    intData: number[];
    stringData: string;
    selectedItems?: unknown[];
    furniSourceTypes?: number[];
    userSourceTypes?: number[];
    getBoolean?: (index: number) => boolean;
} | null = null;

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
    Slider: ({ value }: { value: number }) => <input aria-label="slider" type="range" readOnly value={value} />
}));

vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: ({ userSource, furniSource }: { userSource?: number; furniSource?: number }) => (
        <div>
            {userSource !== undefined && <span data-testid={`users-${userSource}`} />}
            {furniSource !== undefined && <span data-testid={`furni-${furniSource}`} />}
        </div>
    )
}));

vi.mock('./WiredConditionBaseView', () => ({
    WiredConditionBaseView: ({ children, save, footer }: PropsWithChildren<{ save: () => void; footer?: ReactNode }>) => (
        <div>
            {children}
            {footer}
            <button type="button" onClick={save}>
                Save
            </button>
        </div>
    )
}));

import { WiredConditionActorIsOnFurniView } from './WiredConditionActorIsOnFurniView';
import { WiredConditionActorIsWearingBadgeView } from './WiredConditionActorIsWearingBadgeView';
import { WiredConditionActorIsWearingEffectView } from './WiredConditionActorIsWearingEffectView';
import { WiredConditionFurniMatchesSnapshotView } from './WiredConditionFurniMatchesSnapshotView';
import { WiredConditionUserCountInRoomView } from './WiredConditionUserCountInRoomView';
import { WiredConditionUserLevelView } from './WiredConditionUserLevelView';
import { WiredConditionUserOnFurniWithStateView } from './WiredConditionUserOnFurniWithStateView';

const save = () => fireEvent.click(screen.getByText('Save'));

describe('conditions whose source moved from the ints to the official source slot', () => {
    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setSourceTypes.mockClear();
    });

    afterEach(cleanup);

    it('user level: [level, comparison], the users in the slot', () => {
        trigger = { intData: [12, 2], stringData: '', userSourceTypes: [200] };
        render(<WiredConditionUserLevelView />);

        expect(screen.getByTestId('users-200')).toBeTruthy();
        save();

        expect(setIntParams).toHaveBeenCalledWith([12, 2]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [], users: [200] });
    });

    it('user count: the official [min, max], the users in the slot', () => {
        trigger = { intData: [2, 8], stringData: '', userSourceTypes: [201] };
        render(<WiredConditionUserCountInRoomView />);

        expect(screen.getByTestId('users-201')).toBeTruthy();
        save();

        expect(setIntParams).toHaveBeenCalledWith([2, 8]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [], users: [201] });
    });

    it('user on furni with state: no ints, furni and users in the slots, the state in the string', () => {
        trigger = { intData: [], stringData: '2', furniSourceTypes: [201], userSourceTypes: [200] };
        render(<WiredConditionUserOnFurniWithStateView />);

        expect(screen.getByTestId('furni-201')).toBeTruthy();
        expect(screen.getByTestId('users-200')).toBeTruthy();
        save();

        expect(setIntParams).toHaveBeenCalledWith([]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [201], users: [200] });
        expect(setStringParam).toHaveBeenCalledWith('2');
    });

    it('furni matches snapshot: the official [state, direction, position, altitude] only', () => {
        const intData = [1, 0, 1, 1];
        trigger = { intData, stringData: '', furniSourceTypes: [200], getBoolean: (index) => intData[index] === 1 };
        render(<WiredConditionFurniMatchesSnapshotView />);

        expect(screen.getByTestId('furni-200')).toBeTruthy();
        save();

        expect(setIntParams).toHaveBeenCalledWith([1, 0, 1, 1]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [200], users: [] });
    });

    it('furni matches snapshot: a fresh box with picks opens on the picked furni', () => {
        const intData = [0, 0, 0, 0];
        trigger = { intData, stringData: '', selectedItems: [{ id: 1 }], getBoolean: (index) => intData[index] === 1 };
        render(<WiredConditionFurniMatchesSnapshotView />);
        save();

        expect(setIntParams).toHaveBeenCalledWith([0, 0, 0, 0]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [100], users: [] });
    });

    it('quantified user conditions send only their own params: the quantifier goes in the save slot', () => {
        // A box saved before still sends its old trailing quantifier int; the view drops it.
        trigger = { intData: [7, 1], stringData: '', userSourceTypes: [200] };
        const effect = render(<WiredConditionActorIsWearingEffectView />);
        save();
        expect(setIntParams).toHaveBeenLastCalledWith([7]);
        effect.unmount();

        trigger = { intData: [1], stringData: 'ACH1', userSourceTypes: [0] };
        const badge = render(<WiredConditionActorIsWearingBadgeView />);
        save();
        expect(setIntParams).toHaveBeenLastCalledWith([]);
        expect(setStringParam).toHaveBeenLastCalledWith('ACH1');
        badge.unmount();

        trigger = { intData: [1], stringData: '', furniSourceTypes: [100], userSourceTypes: [0] };
        render(<WiredConditionActorIsOnFurniView />);
        save();
        expect(setIntParams).toHaveBeenLastCalledWith([]);
        expect(setSourceTypes).toHaveBeenLastCalledWith({ furni: [100], users: [0] });
        expect(screen.queryByText('wiredfurni.params.quantifier_selection')).toBeNull();
    });
});
