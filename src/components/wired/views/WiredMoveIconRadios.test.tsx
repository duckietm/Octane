import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setSourceTypes = vi.fn();
let trigger: { code?: number; intData: number[]; userSourceTypes?: number[]; furniSourceTypes?: number[] } | null = null;
let save: (() => void) | null = null;

vi.mock('../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setSourceTypes })
}));

vi.mock('./WiredSourcesSelector', () => ({
    WiredSourcesSelector: () => null
}));

const { captureSave } = vi.hoisted(() => ({
    captureSave: (props: PropsWithChildren<{ save: () => void }>) => {
        save = props.save;
        return props.children as never;
    }
}));

vi.mock('./actions/WiredActionBaseView', () => ({ WiredActionBaseView: captureSave }));
vi.mock('./conditions/WiredConditionBaseView', () => ({ WiredConditionBaseView: captureSave }));

import { WiredActionMoveAndRotateFurniView } from './actions/WiredActionMoveAndRotateFurniView';
import { WiredActionMoveFurniView } from './actions/WiredActionMoveFurniView';
import { WiredActionMoveRotateUserView } from './actions/WiredActionMoveRotateUserView';
import { WiredConditionActorDirView } from './conditions/WiredConditionActorDirView';

/** The values of a radio / checkbox group in DOM order. */
const groupValues = (container: HTMLElement, name?: string) =>
    Array.from(container.querySelectorAll<HTMLElement>('label[data-value]'))
        .filter((label) => !name || label.querySelector(`[data-radio-name="${name}"]`))
        .map((label) => Number(label.dataset.value));

const click = (container: HTMLElement, name: string, value: number) => {
    const label = Array.from(container.querySelectorAll<HTMLElement>('label[data-value]')).find(
        (entry) => Number(entry.dataset.value) === value && entry.querySelector(`[data-radio-name="${name}"]`)
    );

    fireEvent.click(label.querySelector('[role="radio"]'));
};

describe('official move / direction radio groups', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        save = null;
    });

    it('lists the move furni movements in the official order and saves the pick', () => {
        trigger = { intData: [], furniSourceTypes: [0] };
        const { container } = render(<WiredActionMoveFurniView />);

        expect(groupValues(container, 'movement')).toEqual([0, 4, 8, 5, 9, 6, 10, 7, 11, 2, 3, 1]);
        expect(groupValues(container, 'rotation')).toEqual([0, 1, 2, 3]);

        click(container, 'movement', 9);
        act(() => save());

        expect(setIntParams).toHaveBeenCalledWith([9, 0]);
    });

    it('lists move user 0..7 in order with the turns after them', () => {
        trigger = { intData: [3, 10], userSourceTypes: [0] };
        const { container } = render(<WiredActionMoveRotateUserView />);

        expect(groupValues(container, 'wired-move-user-direction')).toEqual([-1, 0, 1, 2, 3, 4, 5, 6, 7]);
        expect(groupValues(container, 'wired-rotate-user-direction')).toEqual([-1, 0, 1, 2, 3, 4, 5, 6, 7, 9, 10]);

        act(() => save());
        expect(setIntParams).toHaveBeenCalledWith([3, 10]);
    });

    it('lists the move to direction start directions 0..7 in order', () => {
        trigger = { intData: [5, 2, 1], furniSourceTypes: [0] };
        const { container } = render(<WiredActionMoveAndRotateFurniView />);

        expect(groupValues(container, 'movement')).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

        act(() => save());
        expect(setIntParams).toHaveBeenCalledWith([5, 2, 1]);
    });

    it('lists the user direction checkboxes 0..7 in order and keeps the mask', () => {
        trigger = { intData: [1 << 2], userSourceTypes: [0] };
        const { container } = render(<WiredConditionActorDirView />);

        expect(groupValues(container)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

        const seven = container.querySelector<HTMLElement>('label[data-value="7"] [role="checkbox"]');

        fireEvent.click(seven);
        act(() => save());

        expect(setIntParams).toHaveBeenCalledWith([(1 << 2) | (1 << 7)]);
    });
});
