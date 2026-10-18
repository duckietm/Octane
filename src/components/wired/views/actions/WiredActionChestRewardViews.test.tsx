import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
const setVariableIds = vi.fn();
let trigger: { stringData: string; intData: number[]; userSourceTypes?: number[]; variableIds?: string[] } | null = null;
let baseProps: { save: () => void; validate?: () => boolean } | null = null;
const variable = (itemId: number, name: string, hasValue = true) => ({ itemId, name, availability: 0, hasValue, isReadOnly: false, variableType: 0 });
const tools = {
    userVariableDefinitions: [variable(5, 'score')],
    furniVariableDefinitions: [variable(7, 'height')],
    roomVariableDefinitions: [variable(8, 'round'), variable(9, 'flag', false)],
    contextVariableDefinitions: [variable(10, 'combo')]
};

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback?: string) => fallback ?? key,
    GetRoomSession: () => ({ roomId: 1 }),
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 }
}));
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes, setVariableIds }),
    useWiredTools: () => tools
}));

vi.mock('../../../../common', () => ({
    Button: ({ children, disabled, onClick }: PropsWithChildren<{ disabled?: boolean; onClick?: () => void }>) => (
        <button disabled={disabled} type="button" onClick={onClick}>
            {children}
        </button>
    ),
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: () => <div>sources</div>,
    sortWiredSourceOptions: (options: unknown[]) => options,
    useAvailableUserSources: (_trigger: unknown, options: unknown[]) => options
}));

vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

import { normalizeChestPopup } from './WiredActionChestRewardBaseView';
import { WiredActionGiveCurrencyFromChestView } from './WiredActionGiveCurrencyFromChestView';
import { WiredActionGiveFurniFromChestView } from './WiredActionGiveFurniFromChestView';

describe('chest reward wired actions', () => {
    afterEach(cleanup);

    beforeEach(() => {
        [setIntParams, setStringParam, setSourceTypes, setVariableIds].forEach((mock) => mock.mockClear());
        baseProps = null;
    });

    it('currency: a fresh box gives one, in the games category, and saves the official layout', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredActionGiveCurrencyFromChestView />);

        fireEvent.change(screen.getByLabelText('reward popup'), { target: { value: 'Well done!' } });
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([0, 1, 0, -10, 0, 11]);
        expect(setStringParam).toHaveBeenCalledWith('Well done!');
        expect(setVariableIds).toHaveBeenCalledWith([]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [100], users: [0] });
    });

    it('currency: reads back a variable amount and keeps its variable id', () => {
        trigger = { stringData: 'hi', intData: [0, 5, 1, -20, 1, 13], userSourceTypes: [200], variableIds: ['44'] };
        render(<WiredActionGiveCurrencyFromChestView />);

        expect((screen.getByLabelText('chest extra') as HTMLSelectElement).value).toBe('13');
        expect(baseProps.validate()).toBe(true);
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([0, 5, 1, -20, 1, 13]);
        expect(setVariableIds).toHaveBeenCalledWith(['44']);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [100], users: [200] });
    });

    it('furni: the iteration order is the sixth int', () => {
        trigger = { stringData: '', intData: [1, 1, 0, -10, 0, 2] };
        render(<WiredActionGiveFurniFromChestView />);
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([1, 1, 0, -10, 0, 2]);
    });

    it('amount: one AIR value field with the room/context holder and the type selector in its popup', () => {
        trigger = { stringData: '', intData: [0, 3, 0, -10, 0, 11] };
        render(<WiredActionGiveCurrencyFromChestView />);

        const field = screen.getByRole('textbox', { name: 'Amount to give:' });

        expect(field).toHaveValue('3');
        expect(screen.queryByRole('radio', { name: /variables.reference_type/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));
        const popup = screen.getByRole('dialog');

        expect(within(popup).getByText('wiredfurni.params.sources.merged.title.variables')).toBeTruthy();
        expect(within(popup).getByText('wiredfurni.params.sources.global')).toBeTruthy();
        // Only the room and context holders the server reads, no same-holder option.
        expect(within(popup).getAllByRole('button', { name: /^(global|context|furni|user)$/ }).map((button) => button.textContent)).toHaveLength(2);
        expect(within(popup).queryByRole('checkbox')).toBeNull();
        fireEvent.click(within(popup).getByRole('button', { name: 'context' }));
        fireEvent.click(within(screen.getByRole('dialog')).getByText('combo'));
        expect(field).toHaveValue('combo');
        baseProps.save();

        expect(setIntParams).toHaveBeenLastCalledWith([0, 3, 1, -20, 0, 11]);
        expect(setVariableIds).toHaveBeenLastCalledWith(['10']);
    });

    it('amount: refuses 0 and a variable without a value; the field is disabled when the box gives everything', () => {
        trigger = { stringData: '', intData: [0, 3, 0, -10, 0, 11] };
        render(<WiredActionGiveCurrencyFromChestView />);

        const field = screen.getByRole('textbox', { name: 'Amount to give:' });

        fireEvent.change(field, { target: { value: '0' } });
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(baseProps.validate()).toBe(false);
        fireEvent.change(field, { target: { value: 'flag' } });
        expect(baseProps.validate()).toBe(false);
        fireEvent.change(field, { target: { value: 'ROUND' } });
        expect(baseProps.validate()).toBe(true);

        fireEvent.change(field, { target: { value: 'nope' } });
        fireEvent.click(screen.getAllByRole('radio')[1]);
        expect(field).toBeDisabled();
        expect(screen.queryByRole('alert')).toBeNull();
        expect(baseProps.validate()).toBe(true);
    });

    it('keeps the popup to three lines and 200 characters', () => {
        expect(normalizeChestPopup('a\nb\nc\nd')).toBe('a\nb\nc');
        expect(normalizeChestPopup('x'.repeat(250))).toHaveLength(200);
    });
});
