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
let picks: number[] = [];
let baseProps: { save: () => void; validate?: () => boolean; footer?: ReactNode } | null = null;
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
    WiredFurniSelectionSourceRow: (props: { title: string; selectionCount: number; onSelectionActivate?: () => void }) => (
        <button type="button" onClick={() => props.onSelectionActivate?.()}>
            {props.title} [{props.selectionCount}]
        </button>
    )
}));

vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean; footer?: ReactNode }>) => {
        baseProps = { save: props.save, validate: props.validate, footer: props.footer };
        return (
            <div>
                {props.children}
                {props.footer}
            </div>
        );
    }
}));

vi.mock('./WiredCustomContractFreeFormView', () => ({
    WiredCustomContractFreeFormView: () => <div>free-form editor</div>
}));

import { WiredCustomContractView } from './WiredCustomContractView';

describe('custom contract (AIR addon 20)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        [setIntParams, setStringParam, setSourceTypes, setVariableIds, setFurniIds, setFurniIds2, setAllowsFurni].forEach((mock) => mock.mockClear());
        baseProps = null;
        picks = [];
    });

    it('a fresh box opens the official form with payment and reward off', () => {
        trigger = { intData: [0, 0, 0, 1, -10, 0, 0, 0, 1, -10], stringData: '' };
        render(<WiredCustomContractView />);

        expect(screen.getByText('wiredfurni.params.custom_contract.usage_warning')).toBeTruthy();
        expect(screen.getByRole('checkbox', { name: 'wiredfurni.params.custom_contract.enable_payment' })).not.toBeChecked();
        expect(setAllowsFurni).toHaveBeenLastCalledWith(0);
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([0, 0, 0, 1, -10, 0, 0, 0, 1, -10]);
        expect(setVariableIds).toHaveBeenCalledWith([]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [100, 101], users: [] });
        expect(setFurniIds2).toHaveBeenCalledWith([]);
    });

    it('reads back both elements and both pick lists, and saves them as they were', () => {
        trigger = {
            intData: [1, 1, 0, 3, -10, 1, 0, 1, 1, -20],
            stringData: '',
            variableIds: ['', '10'],
            selectedItems: [11],
            selectedItems2: [21, 22],
            furniSourceTypes: [100, 101]
        };
        picks = [11];
        render(<WiredCustomContractView />);

        expect(screen.getByRole('checkbox', { name: 'wiredfurni.params.custom_contract.enable_payment' })).toBeChecked();
        expect(screen.getByText('wiredfurni.params.sources.furni.title.payment [1]')).toBeTruthy();
        expect(screen.getByText('wiredfurni.params.sources.furni.title.reward [2]')).toBeTruthy();
        expect(setAllowsFurni).toHaveBeenLastCalledWith(1);
        expect(baseProps.validate()).toBe(true);
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([1, 1, 0, 3, -10, 1, 0, 1, 1, -20]);
        expect(setVariableIds).toHaveBeenCalledWith(['n', 'ctx:10']);
        expect(setFurniIds2).toHaveBeenCalledWith([21, 22]);
    });

    it('switching an element off greys its furni source and keeps it out of the save', () => {
        trigger = { intData: [1, 1, 0, 3, -10, 0, 0, 0, 1, -10], stringData: '', selectedItems: [11], furniSourceTypes: [100, 101] };
        picks = [11];
        render(<WiredCustomContractView />);

        fireEvent.click(screen.getByRole('checkbox', { name: 'wiredfurni.params.custom_contract.enable_payment' }));

        expect(setAllowsFurni).toHaveBeenLastCalledWith(0);
        expect(screen.getByText('wiredfurni.params.sources.furni.title.payment [1]').closest('fieldset')).toBeDisabled();
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([0, 1, 0, 3, -10, 0, 0, 0, 1, -10]);
    });

    it('a contract the free-form editor saved keeps that editor', () => {
        trigger = { intData: [-1, 2, 1, 0, -1, 0, 0, 5, 1, 0, 5, 0, 0, 9, 0], stringData: '' };
        render(<WiredCustomContractView />);

        expect(screen.getByText('free-form editor')).toBeTruthy();
        expect(screen.queryByText('wiredfurni.params.custom_contract.usage_warning')).toBeNull();
    });
});
