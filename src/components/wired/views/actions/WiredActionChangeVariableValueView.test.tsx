import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setFurniIds = vi.fn();
let trigger: { stringData: string; intData: number[]; selectedItems?: number[]; maximumItemSelectionCount?: number } | null = null;
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
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 },
    WiredSelectionVisualizer: {
        applySelectionShaderToFurni: vi.fn(),
        applySecondarySelectionShaderToFurni: vi.fn(),
        clearSelectionShaderFromFurni: vi.fn(),
        clearSecondarySelectionShaderFromFurni: vi.fn()
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
    useWired: () => ({ trigger, furniIds: noFurni, actionDelay: 0, setActionDelay, setAllowsFurni, setFurniIds, setIntParams, setStringParam }),
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

    it('saves the same wire layout, with the same holder only on the destination type', () => {
        trigger = { stringData: 'custom:5\tcustom:6\t', intData: [0, 0, 1, 0, 0, 0, 0, 200, 0, 0] };
        render(<WiredActionChangeVariableValueView />);
        openPopup();
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox'));
        // The same holder locks the reference holder row and the type selector.
        expect(within(screen.getByRole('dialog')).getByRole('group')).toBeDisabled();
        baseProps.save();

        expect(setStringParam).toHaveBeenLastCalledWith('custom:5\tcustom:6\t');
        expect(setIntParams).toHaveBeenLastCalledWith([0, 0, 1, 0, 0, 0, 0, 200, 0, 1]);
    });

    it('takes a typed number as the constant and refuses an invalid text', () => {
        trigger = { stringData: 'custom:5\t\t', intData: [0, 0, 0, 7, 0, 0, 0, 0, 0, 0] };
        render(<WiredActionChangeVariableValueView />);

        expect(field()).toHaveValue('7');
        fireEvent.change(field(), { target: { value: '-42' } });
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([0, 0, 0, -42, 0, 0, 0, 0, 0, 0]);
        expect(setStringParam).toHaveBeenLastCalledWith('custom:5\t\t');

        fireEvent.change(field(), { target: { value: 'nope' } });
        expect(baseProps.validate()).toBe(false);
        fireEvent.change(field(), { target: { value: 'COINS' } });
        expect(baseProps.validate()).toBe(true);
        baseProps.save();
        expect(setStringParam).toHaveBeenLastCalledWith('custom:5\tcustom:6\t');
    });

    it('disables the reference value for an operation without operand', () => {
        trigger = { stringData: 'custom:5\t\t', intData: [0, 0, 0, 7, 0, 0, 0, 0, 0, 0] };
        render(<WiredActionChangeVariableValueView />);

        fireEvent.change(field(), { target: { value: 'nope' } });
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '60' } });
        expect(field()).toBeDisabled();
        expect(screen.queryByRole('alert')).toBeNull();
        expect(baseProps.validate()).toBe(true);
        // ChangeVariable.readIntParamsFromForm: no operand saves the typed-number option.
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([0, 60, 0, 7, 0, 0, 0, 0, 0, 0]);
        expect(setStringParam).toHaveBeenLastCalledWith('custom:5\t\t');
    });
});
