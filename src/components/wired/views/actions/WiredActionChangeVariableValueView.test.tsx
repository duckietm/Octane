import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../../../../test-utils/selectOption';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setFurniIds = vi.fn();
const setFurniIds2 = vi.fn();
const setVariableIds = vi.fn();
const setSourceTypes = vi.fn();
let trigger: {
    stringData: string;
    intData: number[];
    selectedItems?: number[];
    selectedItems2?: number[];
    variableIds?: string[];
    furniSourceTypes?: number[];
    userSourceTypes?: number[];
    maximumItemSelectionCount?: number;
} | null = null;
let baseProps: { save: () => void; validate?: () => boolean } | null = null;
const noFurni: number[] = [];
const setActionDelay = vi.fn();
const setAllowsFurni = vi.fn();
const tools = {
    userVariableDefinitions: [
        { itemId: 5, name: 'score', availability: 0, hasValue: true, isReadOnly: false, variableType: 0 },
        { itemId: 6, name: 'coins', availability: 0, hasValue: true, isReadOnly: false, variableType: 0 }
    ],
    furniVariableDefinitions: [{ itemId: 7, name: 'height', availability: 0, hasValue: true, isReadOnly: false, variableType: 0 }],
    roomVariableDefinitions: [{ itemId: 8, name: 'round', availability: 0, hasValue: true, isReadOnly: false, variableType: 0 }],
    contextVariableDefinitions: []
};

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    GetRoomSession: () => ({ roomId: 1 }),
    fromOfficialVariableTarget: (official: number) => (official === 0 ? 1 : official === -20 ? 2 : official === -10 ? 3 : 0),
    toOfficialVariableTarget: (ours: number) => (ours === 1 ? 0 : ours === 2 ? -20 : ours === 3 ? -10 : 1),
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 },
    WiredSelectionVisualizer: {
        applySelectionShaderToFurni: vi.fn(),
        applySecondarySelectionShaderToFurni: vi.fn(),
        clearSelectionShaderFromFurni: vi.fn(),
        clearSecondarySelectionShaderFromFurni: vi.fn(),
        setEditingPickList: vi.fn(),
        showPickLists: vi.fn(() => [])
    }
}));
vi.mock('../../../../common', () => ({
    Button: ({ children, disabled, onClick }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { classNames?: string[] }>) => (
        <button disabled={disabled} type="button" onClick={onClick}>
            {children}
        </button>
    ),
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, furniIds: noFurni, actionDelay: 0, setActionDelay, setAllowsFurni, setFurniIds, setFurniIds2, setIntParams, setSourceTypes, setStringParam, setVariableIds }),
    useWiredTools: () => tools
}));
vi.mock('../WiredSourcesSelector', () => ({
    CLICKED_USER_SOURCE: { value: 11, label: 'wiredfurni.params.sources.users.11' },
    FURNI_SOURCES: [
        { value: 100, label: 'wiredfurni.params.sources.furni.100' },
        { value: 0, label: 'wiredfurni.params.sources.furni.0' }
    ],
    USER_SOURCES: [
        { value: 0, label: 'wiredfurni.params.sources.users.0' },
        { value: 200, label: 'wiredfurni.params.sources.users.200' }
    ],
    sortWiredSourceOptions: (options: unknown[]) => options,
    useAvailableUserSources: (_trigger: unknown, options: unknown[]) => options
}));
vi.mock('./WiredActionDelaySection', () => ({ WiredActionDelaySection: () => null }));
vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

const { WiredActionChangeVariableValueView } = await import('./WiredActionChangeVariableValueView');

const field = () => screen.getByRole('textbox', { name: 'wiredfurni.params.variables.reference_value' });
const openPopup = () => fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));

describe('WiredActionChangeVariableValueView reference value (AIR ChangeVariable + ValueOrVariableSection)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setVariableIds.mockClear();
        setSourceTypes.mockClear();
        setFurniIds2.mockClear();
        baseProps = null;
    });

    it('keeps only the destination holder in the footer; the reference holder is in the popup', () => {
        // user destination "score" (5), operation 0, reference variable "coins" (6) on users, user sources 0 / 200.
        trigger = { stringData: 'custom:5\tcustom:6\t', intData: [0, 0, 1, 0, 0, 0, 0, 200, 0, 0] };
        render(<WiredActionChangeVariableValueView />);

        expect(field()).toHaveValue('coins');
        expect(screen.getByText('wiredfurni.params.sources.merged.title.variables_destination')).toBeTruthy();
        expect(screen.queryByText('wiredfurni.params.sources.merged.title.variables_reference')).toBeNull();

        openPopup();
        const popup = screen.getByRole('dialog');

        expect(within(popup).getByText('wiredfurni.params.sources.merged.title.variables')).toBeTruthy();
        expect(within(popup).getByText('wiredfurni.params.sources.users.200')).toBeTruthy();
        expect(within(popup).getByText('wiredfurni.params.variables.reference_value.same_holder')).toBeTruthy();
    });

    it("saves AIR's layout from a box stored in ours, with the same holder only on the destination type", () => {
        trigger = { stringData: 'custom:5\tcustom:6\t', intData: [0, 0, 1, 0, 0, 0, 0, 200, 0, 0] };
        render(<WiredActionChangeVariableValueView />);
        openPopup();
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox'));
        // The same holder locks the reference holder row and the type selector.
        expect(within(screen.getByRole('dialog')).getByRole('group')).toBeDisabled();
        baseProps.save();

        // AIR: [target, operation, operandIsVariable, high, low, referenceTarget, sameHolder] with official targets, the
        // variables as variable ids, the destination and reference holders in source slots 0 and 1, no string.
        expect(setStringParam).toHaveBeenLastCalledWith('');
        expect(setIntParams).toHaveBeenLastCalledWith([1, 0, 1, 0, 0, 1, 1]);
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5', 'user:6']);
        expect(setSourceTypes).toHaveBeenLastCalledWith({ furni: [0, 0], users: [0, 200] });
    });

    it("reads AIR's layout back, the reference picks as the second picks", () => {
        trigger = {
            stringData: '',
            intData: [0, 1, 1, 0, 0, 0, 0],
            variableIds: ['furni:7', 'furni:7'],
            furniSourceTypes: [100, 101],
            userSourceTypes: [0, 0],
            selectedItems: [11],
            selectedItems2: [12]
        };
        render(<WiredActionChangeVariableValueView />);

        expect(field()).toHaveValue('height');
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([0, 1, 1, 0, 0, 0, 0]);
        expect(setVariableIds).toHaveBeenLastCalledWith(['furni:7', 'furni:7']);
        expect(setSourceTypes).toHaveBeenLastCalledWith({ furni: [100, 101], users: [0, 0] });
        expect(setFurniIds2).toHaveBeenLastCalledWith([12]);
    });

    it('takes a typed number as the constant and refuses an invalid text', () => {
        trigger = { stringData: 'custom:5\t\t', intData: [0, 0, 0, 7, 0, 0, 0, 0, 0, 0] };
        render(<WiredActionChangeVariableValueView />);

        expect(field()).toHaveValue('7');
        fireEvent.change(field(), { target: { value: '-42' } });
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([1, 0, 0, -1, -42, 1, 0]);
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5']);

        fireEvent.change(field(), { target: { value: 'nope' } });
        expect(baseProps.validate()).toBe(false);
        fireEvent.change(field(), { target: { value: 'COINS' } });
        expect(baseProps.validate()).toBe(true);
        baseProps.save();
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5', 'user:6']);
    });

    it('disables the reference value for an operation without operand', () => {
        trigger = { stringData: 'custom:5\t\t', intData: [0, 0, 0, 7, 0, 0, 0, 0, 0, 0] };
        render(<WiredActionChangeVariableValueView />);

        fireEvent.change(field(), { target: { value: 'nope' } });
        selectOption(screen.getByRole('combobox'), 'wiredfurni.params.variables.operation.60');
        expect(field()).toBeDisabled();
        expect(screen.queryByRole('alert')).toBeNull();
        expect(baseProps.validate()).toBe(true);
        // ChangeVariable.readIntParamsFromForm: no operand saves the typed-number option.
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([1, 60, 0, 0, 7, 1, 0]);
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5']);
    });
});
