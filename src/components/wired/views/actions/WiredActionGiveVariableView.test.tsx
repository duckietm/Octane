import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setVariableIds = vi.fn();
const setSourceTypes = vi.fn();
const setFurniIds = vi.fn();
const setActionDelay = vi.fn();
const noFurni: number[] = [];
let trigger: { stringData: string; intData: number[]; variableIds?: string[]; selectedItems?: number[]; userSourceTypes?: number[]; furniSourceTypes?: number[] } | null = null;
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
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT: 3 }
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
    useWired: () => ({ trigger, furniIds: noFurni, actionDelay: 0, setActionDelay, setFurniIds, setIntParams, setStringParam, setSourceTypes, setVariableIds }),
    useWiredTools: () => tools
}));
vi.mock('../WiredSourcesSelector', () => ({
    CLICKED_USER_SOURCE: { value: 11, label: 'wiredfurni.params.sources.users.11' },
    FURNI_SOURCES: [{ value: 0, label: 'wiredfurni.params.sources.furni.0' }],
    USER_SOURCES: [{ value: 0, label: 'wiredfurni.params.sources.users.0' }],
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

const { WiredActionGiveVariableView } = await import('./WiredActionGiveVariableView');

const field = () => screen.getByRole('textbox', { name: 'wiredfurni.params.variables.value_settings.initial_value' });
const openPopup = () => fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));

describe('WiredActionGiveVariableView initial value (AIR GiveVariable + ValueOrVariableSection)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setVariableIds.mockClear();
    });

    it('reads the initial value from the field and keeps the wire layout', () => {
        // [target user, high, low, override, fromVariable, referenceTarget, sameHolder]
        trigger = { stringData: '5\t0', intData: [1, 0, 12, 1, 0, -10, 0] };
        render(<WiredActionGiveVariableView />);

        expect(screen.getByText('wiredfurni.params.variables.value_settings.initial_value')).toBeTruthy();
        expect(field()).toHaveValue('12');
        fireEvent.change(field(), { target: { value: '-3' } });
        baseProps.save();
        // AIR: no string, variable ids [variable] (no reference while the value is a number).
        expect(setStringParam).toHaveBeenLastCalledWith('');
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5']);
        expect(setIntParams).toHaveBeenLastCalledWith([1, -1, -3, 1, 0, -10, 0]);
    });

    it('saves the same holder only for a variable on the destination type', () => {
        trigger = { stringData: '5\t8', intData: [1, 0, 0, 0, 1, -10, 1] };
        render(<WiredActionGiveVariableView />);

        expect(field()).toHaveValue('round');
        openPopup();
        const popup = screen.getByRole('dialog');

        // No claimed holder here: the type selector has a section of its own.
        expect(within(popup).getByText('wiredfurni.params.variables.reference_value.target')).toBeTruthy();
        expect(within(popup).getByRole('checkbox')).toHaveAttribute('aria-disabled', 'true');
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([1, 0, 0, 0, 1, -10, 0]);

        fireEvent.click(within(popup).getByRole('button', { name: 'wiredfurni.params.sourcetype.users' }));
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'wiredfurni.variable_picker.tab.all' }));
        fireEvent.click(screen.getAllByRole('option').find((option) => option.textContent === 'coins'));
        baseProps.save();
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5', 'user:6']);
        expect(setIntParams).toHaveBeenLastCalledWith([1, 0, 0, 0, 1, 1, 1]);
    });

    it('reads the variable and the reference from the variable ids', () => {
        trigger = { stringData: '', intData: [1, 0, 0, 0, 1, -10, 0], variableIds: ['user:5', 'room:8'] };
        render(<WiredActionGiveVariableView />);

        expect(field()).toHaveValue('round');
        baseProps.save();
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5', 'room:8']);
    });

    it('disables the initial value for a variable without a value', () => {
        trigger = { stringData: '9\t0', intData: [1, 0, 0, 0, 0, -10, 0] };
        render(<WiredActionGiveVariableView />);

        expect(field()).toBeDisabled();
        expect(baseProps.validate()).toBe(true);
    });
});
