import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
let trigger: { stringData: string; intData: number[]; userSourceTypes?: number[] } | null = null;
let save: (() => void) | null = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes })
}));

vi.mock('../WiredSourcesSelector', () => ({
    CLICKED_USER_SOURCE_VALUE: 2,
    REACHED_USER_SOURCE_VALUE: 3,
    WiredSourcesSelector: () => null
}));

vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void }>) => {
        save = props.save;
        return <div>{props.children}</div>;
    }
}));

import { resolveHandItemOptions } from '../WiredHandItemField';
import { WiredActionBotGiveHandItemView } from './WiredActionBotGiveHandItemView';

describe('hand item options', () => {
    it('starts with 0 and appends an unknown stored id', () => {
        expect(resolveHandItemOptions(0)).toEqual([0, 2, 5, 7, 8, 9, 10, 27]);
        expect(resolveHandItemOptions(44)).toEqual([0, 2, 5, 7, 8, 9, 10, 27, 44]);
        expect(resolveHandItemOptions(44, [1126])).toEqual([0, 2, 5, 7, 8, 9, 10, 27, 1126, 44]);
        expect(resolveHandItemOptions(-1)).toEqual([0, 2, 5, 7, 8, 9, 10, 27]);
    });
});

describe('WiredActionBotGiveHandItemView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setStringParam.mockClear();
        setIntParams.mockClear();
        save = null;
    });

    it('checks "use the bot name" when a name is stored and sends it', () => {
        trigger = { stringData: 'Frank', intData: [7], userSourceTypes: [100, 0] };
        render(<WiredActionBotGiveHandItemView />);

        expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByDisplayValue('Frank')).toBeTruthy();

        act(() => save());
        expect(setStringParam).toHaveBeenCalledWith('Frank');
        expect(setIntParams).toHaveBeenCalledWith([7]);
    });

    it('leaves it unchecked without a name and sends no name', () => {
        trigger = { stringData: '', intData: [0], userSourceTypes: [100, 0] };
        render(<WiredActionBotGiveHandItemView />);

        expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
        expect(screen.queryByRole('textbox')).toBeNull();

        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bob' } });
        act(() => save());
        expect(setStringParam).toHaveBeenCalledWith('Bob');
    });
});
