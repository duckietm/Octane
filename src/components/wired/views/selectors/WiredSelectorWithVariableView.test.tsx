import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
const setFurniIds = vi.fn();
const setSelectorOptions = vi.fn();
const noFurni: number[] = [];
let trigger: {
    stringData: string;
    intData: number[];
    selectedItems?: number[];
    userSourceTypes?: number[];
    furniSourceTypes?: number[];
    isFilter?: boolean;
    isInvert?: boolean;
} | null = null;
let baseProps: { save: () => void; validate?: () => boolean } | null = null;
const variable = (itemId: number, name: string, hasValue = true) => ({ itemId, name, availability: 0, hasValue, isReadOnly: false, variableType: 0 });
const tools = {
    userVariableDefinitions: [variable(5, 'score'), variable(6, 'coins'), variable(9, 'vip', false)],
    furniVariableDefinitions: [variable(7, 'height')],
    roomVariableDefinitions: [variable(8, 'round')],
    contextVariableDefinitions: []
};

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    GetRoomSession: () => ({ roomId: 1 }),
    fromOfficialVariableTarget: (value: number) => value,
    toOfficialVariableTarget: (value: number) => value,
    fromOfficialComparison: (value: number) => value,
    toOfficialComparison: (value: number) => value,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 }
}));
vi.mock('../../../../common', () => ({
    Button: ({ children, disabled, onClick }: PropsWithChildren<{ disabled?: boolean; onClick?: () => void }>) => (
        <button disabled={disabled} type="button" onClick={onClick}>
            {children}
        </button>
    ),
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, furniIds: noFurni, setFurniIds, setIntParams, setStringParam, setSourceTypes, setSelectorOptions }),
    useWiredTools: () => tools
}));
vi.mock('../WiredSourcesSelector', () => ({
    CLICKED_USER_SOURCE: { value: 11, label: 'wiredfurni.params.sources.users.11' },
    FURNI_SOURCES: [{ value: 0, label: 'wiredfurni.params.sources.furni.0' }],
    USER_SOURCES: [
        { value: 0, label: 'wiredfurni.params.sources.users.0' },
        { value: 200, label: 'wiredfurni.params.sources.users.200' }
    ],
    sortWiredSourceOptions: (options: unknown[]) => options,
    useAvailableUserSources: (_trigger: unknown, options: unknown[]) => options
}));
vi.mock('./WiredSelectorBaseView', () => ({
    WiredSelectorBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

const { WiredSelectorWithVariableView } = await import('./WiredSelectorWithVariableView');

const field = () => screen.getByRole('textbox', { name: 'wiredfurni.params.variables.reference_value' });
const openPopup = () => fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));
const selectByValue = () => screen.getByRole('checkbox', { name: 'wiredfurni.params.variables.value_settings.select_by_value' });

describe('WiredSelectorWithVariableView reference value (AIR WithVariable + ValueOrVariableSection)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setSourceTypes.mockClear();
        baseProps = null;
    });

    it('disables the reference value until a variable with a value is selected by value', () => {
        trigger = { stringData: 'custom:9\t', intData: [2, 0, 0, 0, 0, 0] };
        render(<WiredSelectorWithVariableView selectorTarget="user" />);

        expect(selectByValue()).toBeDisabled();
        expect(field()).toBeDisabled();
        expect(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' })).toBeDisabled();
        fireEvent.change(field(), { target: { value: 'nope' } });
        expect(screen.queryByRole('alert')).toBeNull();
        expect(baseProps.validate()).toBe(true);
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([2, 0, 0, 0, 0, 0]);
    });

    it('reads the reference holder in the popup and saves the unchanged layout', () => {
        // users with "score" (5) = variable "coins" (6) on users (target 0), reference user source 200, same holder stored.
        trigger = { stringData: 'custom:5\tcustom:6', intData: [2, 2, 0, 0, 0, 1], userSourceTypes: [200], furniSourceTypes: [0] };
        render(<WiredSelectorWithVariableView selectorTarget="user" />);

        expect(selectByValue()).toBeChecked();
        expect(field()).toHaveValue('coins');
        openPopup();
        const popup = screen.getByRole('dialog');

        expect(within(popup).getByText('wiredfurni.params.sources.merged.title.variables')).toBeTruthy();
        expect(within(popup).getByText('wiredfurni.params.sources.users.200')).toBeTruthy();
        // The same holder applies (users variable on a users selector): the holder row is locked.
        expect(within(popup).getByRole('checkbox')).toBeChecked();
        expect(within(popup).getByRole('group')).toBeDisabled();
        baseProps.save();

        expect(setStringParam).toHaveBeenLastCalledWith('custom:5\tcustom:6');
        expect(setIntParams).toHaveBeenLastCalledWith([2, 2, 0, 0, 0, 1]);
        expect(setSourceTypes).toHaveBeenLastCalledWith({ furni: [0], users: [200] });
    });

    it('does not save the same holder for a variable on another holder type', () => {
        // furni with "height" (7) = users variable "coins" (6): 0 is the users target here.
        trigger = { stringData: 'custom:7\tcustom:6', intData: [2, 2, 0, 0, 0, 1] };
        render(<WiredSelectorWithVariableView selectorTarget="furni" />);

        openPopup();
        expect(within(screen.getByRole('dialog')).getByRole('checkbox')).toBeDisabled();
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([2, 2, 0, 0, 0, 0]);
    });

    it('takes a typed constant and refuses an invalid text while selecting by value', () => {
        trigger = { stringData: 'custom:5\t', intData: [2, 1, 0, 3, 0, 0] };
        render(<WiredSelectorWithVariableView selectorTarget="user" />);

        expect(field()).toHaveValue('3');
        fireEvent.change(field(), { target: { value: '-5' } });
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([2, 1, -1, -5, 0, 0]);
        expect(setStringParam).toHaveBeenLastCalledWith('custom:5\t');

        fireEvent.change(field(), { target: { value: 'vip' } });
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(baseProps.validate()).toBe(false);
    });
});
