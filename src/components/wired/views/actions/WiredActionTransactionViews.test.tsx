import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
const setVariableIds = vi.fn();
const setFurniIds = vi.fn();
const setFurniIds2 = vi.fn();
const setAllowsFurni = vi.fn();
let trigger: Record<string, unknown> | null = null;
// The picks the editor holds; one stable list per test, as useWired's state is.
let picks: number[] = [];
let baseProps: { save: () => void; validate?: () => boolean } | null = null;
const variable = (itemId: number, name: string) => ({ itemId, name, availability: 0, hasValue: true, isReadOnly: false, variableType: 0 });
const tools = {
    userVariableDefinitions: [],
    furniVariableDefinitions: [],
    roomVariableDefinitions: [variable(8, 'round')],
    contextVariableDefinitions: [variable(10, 'combo')]
};

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback?: string) => fallback ?? key,
    GetRoomSession: () => ({ roomId: 1 }),
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 },
    WiredSelectionVisualizer: {
        applySelectionShaderToFurni: vi.fn(),
        applySecondarySelectionShaderToFurni: vi.fn(),
        clearSelectionShaderFromFurni: vi.fn(),
        clearSecondarySelectionShaderFromFurni: vi.fn()
    }
}));
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, furniIds: picks, setIntParams, setStringParam, setSourceTypes, setVariableIds, setFurniIds, setFurniIds2, setAllowsFurni }),
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
    FURNI_SOURCES: [{ value: 100, label: 'wiredfurni.params.sources.furni.100' }],
    WiredSourcesSelector: () => <div>sources</div>,
    sortWiredSourceOptions: (options: unknown[]) => options,
    useAvailableUserSources: (_trigger: unknown, options: unknown[]) => options
}));

vi.mock('../WiredFurniSelectionSourceRow', () => ({
    WiredFurniSelectionSourceRow: (props: { title: string; selectionCount: number; onSelectionActivate?: () => void; headerContent?: ReactNode }) => (
        <button type="button" onClick={() => props.onSelectionActivate?.()}>
            {props.title} [{props.selectionCount}]
        </button>
    )
}));

vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean; selectionPreview?: ReactNode }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return (
            <div>
                {props.children}
                {props.selectionPreview}
            </div>
        );
    }
}));

import { WiredActionCancelTransactionView } from './WiredActionCancelTransactionView';
import { WiredActionInitTransactionView } from './WiredActionInitTransactionView';

describe('transaction wired actions', () => {
    afterEach(cleanup);

    beforeEach(() => {
        [setIntParams, setStringParam, setSourceTypes, setVariableIds, setFurniIds, setFurniIds2, setAllowsFurni].forEach((mock) => mock.mockClear());
        baseProps = null;
        picks = [];
    });

    it('initiate: a fresh box is normal, multiplier 1, timeout off at 300 s', () => {
        trigger = { intData: [], stringData: '' };
        render(<WiredActionInitTransactionView />);

        expect(screen.getByRole('textbox', { name: 'Select multiplier:' })).toBeDisabled();
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([0, 1, 0, -10, 0, 300]);
        expect(setVariableIds).toHaveBeenCalledWith([]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [100, 101, 200], users: [0, 200] });
        expect(setFurniIds2).toHaveBeenCalledWith([]);
    });

    it('initiate: reads back the official ints and both pick lists', () => {
        trigger = { intData: [1, 7, 0, -20, 1, 600], stringData: '', selectedItems: [11, 12], selectedItems2: [21], furniSourceTypes: [100, 101, 200], userSourceTypes: [200, 200] };
        picks = [11, 12];
        render(<WiredActionInitTransactionView />);

        expect(screen.getByRole('textbox', { name: 'Select multiplier:' })).toHaveValue('7');
        expect(screen.getByText('wiredfurni.params.sources.furni.title.chests [2]')).toBeTruthy();
        expect(screen.getByText('wiredfurni.params.sources.furni.title.contracts [1]')).toBeTruthy();
        expect(baseProps.validate()).toBe(true);
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([1, 7, 0, -20, 1, 600]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [100, 101, 200], users: [200, 200] });
        expect(setFurniIds2).toHaveBeenCalledWith([21]);
    });

    it('initiate: the auto multiplier titles the field as its limit and a variable keeps its id', () => {
        trigger = { intData: [2, 1, 1, -20, 0, 300], stringData: '', variableIds: ['10'] };
        render(<WiredActionInitTransactionView />);

        const field = screen.getByRole('textbox', { name: 'Auto multiplier limit:' });

        expect(field).not.toBeDisabled();
        expect(field).toHaveValue('combo');
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([2, 1, 1, -20, 0, 300]);
        expect(setVariableIds).toHaveBeenCalledWith(['ctx:10']);

        fireEvent.click(screen.getByRole('radio', { name: 'Normal' }));
        expect(screen.getByRole('textbox', { name: 'Select multiplier:' })).toBeDisabled();
    });

    it('initiate: the multiplier stays within 1..500 and the timeout within 30..3600', () => {
        trigger = { intData: [1, 3, 0, -10, 0, 300], stringData: '' };
        render(<WiredActionInitTransactionView />);

        fireEvent.change(screen.getByRole('textbox', { name: 'Select multiplier:' }), { target: { value: '900' } });
        expect(baseProps.validate()).toBe(false);

        fireEvent.change(screen.getByRole('textbox', { name: 'Select multiplier:' }), { target: { value: '12' } });
        fireEvent.click(screen.getByRole('checkbox'));
        const timeout = screen.getByLabelText('timeout seconds');

        fireEvent.change(timeout, { target: { value: '5' } });
        fireEvent.blur(timeout);
        // The number field takes the value back into 30..3600 when it is left, so there is nothing invalid to validate.
        expect((timeout as HTMLInputElement).value).toBe('30');
        expect(baseProps.validate()).toBe(true);
        baseProps.save();

        expect(setIntParams).toHaveBeenLastCalledWith([1, 12, 0, -10, 1, 30]);
    });

    it('cancel: a fresh box cancels the picked contracts', () => {
        trigger = { intData: [], stringData: '' };
        render(<WiredActionCancelTransactionView />);

        expect(screen.getByRole('radio', { name: 'Specific contract' })).toBeChecked();
        expect(setAllowsFurni).toHaveBeenLastCalledWith(1);
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([0]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [100], users: [] });
    });

    it('cancel: any running transaction disables the contract picker', () => {
        trigger = { intData: [0], stringData: '' };
        render(<WiredActionCancelTransactionView />);

        fireEvent.click(screen.getByRole('radio', { name: 'Any running transaction' }));

        expect(setAllowsFurni).toHaveBeenLastCalledWith(0);
        expect(screen.getByRole('group')).toBeDisabled();
        baseProps.save();

        expect(setIntParams).toHaveBeenLastCalledWith([1]);
    });
});
