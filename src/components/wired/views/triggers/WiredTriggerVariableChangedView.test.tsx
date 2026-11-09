import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setVariableIds = vi.fn();
let trigger: { intData: number[]; stringData: string; variableIds?: string[] } | null = null;
let userVariableDefinitions: Array<{ itemId: number; name: string; hasValue: boolean; availability: number }> = [];

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 },
    fromOfficialVariableTarget: (official: number) => (official === 0 ? 1 : official === -20 ? 2 : official === -10 ? 3 : 0),
    toOfficialVariableTarget: (ours: number) => (ours === 1 ? 0 : ours === 2 ? -20 : ours === 3 ? -10 : 1)
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setVariableIds }),
    useWiredTools: () => ({
        userVariableDefinitions,
        furniVariableDefinitions: [],
        roomVariableDefinitions: [],
        contextVariableDefinitions: []
    })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredVariablePicker', () => ({
    WiredVariablePicker: () => <div data-testid="variable-picker" />
}));

vi.mock('../WiredVariablePickerData', () => ({
    buildWiredVariablePickerEntries: () => [],
    createFallbackVariableEntry: () => null,
    flattenWiredVariablePickerEntries: () => [],
    getCustomVariableItemId: (token: string) => (token.startsWith('custom:') ? parseInt(token.slice(7), 10) || 0 : 0),
    normalizeVariableTokenFromWire: (token: string) => token,
    withoutExecutionContextVariables: <T,>(definitions: T[]) => definitions
}));

vi.mock('./WiredTriggerBaseView', () => ({
    WiredTriggerBaseView: ({ children, save, requiresFurni }: PropsWithChildren<{ save: () => void; requiresFurni: number }>) => (
        <div data-requires-furni={requiresFurni}>
            {children}
            <button type="button" onClick={save}>
                Save
            </button>
        </div>
    )
}));

import { WiredTriggerVariableChangedView } from './WiredTriggerVariableChangedView';

const openSections = () => {
    fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.trigger_options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Allow the trigger from:' }));
};

const originBoxes = () => [
    screen.getByRole('checkbox', { name: 'This room' }),
    screen.getByRole('checkbox', { name: 'Another room' }),
    screen.getByRole('checkbox', { name: 'Inspection' }),
    screen.getByRole('checkbox', { name: 'External' })
];

describe('WiredTriggerVariableChangedView origin filter', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        userVariableDefinitions = [];
    });

    it('listens to every origin for a box saved before the filter existed', () => {
        trigger = { intData: [1, 1, 1, 7], stringData: 'custom:5' };

        render(<WiredTriggerVariableChangedView />);
        openSections();

        for (const box of originBoxes()) expect(box).toHaveAttribute('aria-checked', 'true');
    });

    it('reads the saved mask back into the four official boxes', () => {
        // Official bits: 0 this room, 1 another room, 2 inspection, 3 external.
        trigger = { intData: [1, 1, 1, 7, 0b0101, 0, 1], stringData: 'custom:5' };

        render(<WiredTriggerVariableChangedView />);
        openSections();

        const [thisRoom, otherRoom, inspection, external] = originBoxes();
        expect(thisRoom).toHaveAttribute('aria-checked', 'true');
        expect(otherRoom).toHaveAttribute('aria-checked', 'false');
        expect(inspection).toHaveAttribute('aria-checked', 'true');
        expect(external).toHaveAttribute('aria-checked', 'false');
        expect(screen.getByText('The inspection tool (:inspect)')).toBeInTheDocument();
        expect(screen.getByText('Variable management or the variable web API')).toBeInTheDocument();
    });

    it('saves -1 while every origin is ticked and the mask once one is not', () => {
        userVariableDefinitions = [{ itemId: 5, name: 'score', hasValue: true, availability: 11 }];
        trigger = { intData: [1, 1, 1, 7], stringData: 'custom:5' };

        render(<WiredTriggerVariableChangedView />);
        openSections();

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        // AIR's six ints: the target is the variable id's.
        expect(setIntParams.mock.calls[0][0]).toHaveLength(6);
        expect(setIntParams.mock.calls[0][0][4]).toBe(-1);

        fireEvent.click(screen.getByRole('checkbox', { name: 'External' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(setIntParams.mock.calls[1][0][4]).toBe(0b0111);
    });

    it('offers another room only for a shared user variable and external only for a saved one', () => {
        userVariableDefinitions = [
            { itemId: 5, name: 'shared', hasValue: true, availability: 11 },
            { itemId: 6, name: 'room only', hasValue: true, availability: 0 }
        ];
        trigger = { intData: [1, 1, 1, 7, -1, 0, 1], stringData: 'custom:5' };

        const { unmount } = render(<WiredTriggerVariableChangedView />);
        openSections();
        expect(screen.getByRole('checkbox', { name: 'Another room' })).not.toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('checkbox', { name: 'External' })).not.toHaveAttribute('aria-disabled', 'true');
        unmount();

        trigger = { intData: [1, 1, 1, 7, -1, 0, 1], stringData: 'custom:6' };
        render(<WiredTriggerVariableChangedView />);
        openSections();
        expect(screen.getByRole('checkbox', { name: 'Another room' })).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('checkbox', { name: 'External' })).toHaveAttribute('aria-disabled', 'true');
    });
});

describe('WiredTriggerVariableChangedView trigger mode', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setVariableIds.mockClear();
        userVariableDefinitions = [];
    });

    it('keeps the furni picks open and starts a box saved before the modes on one variable', () => {
        trigger = { intData: [1, 1, 1, 7, -1], stringData: 'custom:5' };

        const { container } = render(<WiredTriggerVariableChangedView />);

        expect(container.querySelector('[data-requires-furni]')).toHaveAttribute('data-requires-furni', '1');
        expect(screen.getByRole('radio', { name: 'One selected variable' })).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(setIntParams.mock.calls[0][0][5]).toBe(0);
        // AIR: no string, the variable as the first variable id (the variable list's id).
        expect(setStringParam).toHaveBeenLastCalledWith('');
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5']);
    });

    it('reads the variable from the variable ids, its target from the id', () => {
        trigger = { intData: [1, 1, 1, 7, -1, 0], stringData: '', variableIds: ['furni:9'] };

        render(<WiredTriggerVariableChangedView />);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(setIntParams.mock.calls[0][0]).toHaveLength(6);
        expect(setVariableIds).toHaveBeenLastCalledWith(['furni:9']);
    });

    it('sends a watched built-in under its Habbo id', () => {
        trigger = { intData: [1, 1, 1, 7, -1, 0, 0], stringData: '', variableIds: ['-2100'] };

        render(<WiredTriggerVariableChangedView />);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(setVariableIds).toHaveBeenLastCalledWith(['-2100']);
    });

    it('saves mode 1 at int 5 and turns the variable section off', () => {
        trigger = { intData: [1, 1, 1, 7, -1, 1, 1], stringData: '' };

        render(<WiredTriggerVariableChangedView />);

        expect(screen.getByRole('radio', { name: 'Picked variable boxes' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByTestId('variable-selection')).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(setIntParams.mock.calls[0][0][5]).toBe(1);
        expect(setStringParam).toHaveBeenLastCalledWith('');
        expect(setVariableIds).toHaveBeenLastCalledWith([]);
    });
});
