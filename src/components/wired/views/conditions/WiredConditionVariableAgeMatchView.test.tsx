import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
const setFurniIds = vi.fn();
const setVariableIds = vi.fn();
const noFurni: number[] = [];
let trigger: { stringData: string; intData: number[]; variableIds?: string[]; selectedItems?: number[]; userSourceTypes?: number[]; furniSourceTypes?: number[] } | null = null;
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
    localizeWithFallback: (key: string) => key,
    GetRoomSession: () => ({ roomId: 1 }),
    fromOfficialVariableTarget: (value: number) => value,
    toOfficialVariableTarget: (value: number) => value,
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
    useWired: () => ({ trigger, furniIds: noFurni, setFurniIds, setIntParams, setStringParam, setSourceTypes, setVariableIds }),
    useWiredTools: () => tools
}));
vi.mock('../WiredSourcesSelector', () => ({
    FURNI_SOURCES: [{ value: 0, label: 'wiredfurni.params.sources.furni.0' }],
    USER_SOURCES: [{ value: 0, label: 'wiredfurni.params.sources.users.0' }],
    sortWiredSourceOptions: (options: unknown[]) => options,
    useAvailableUserSources: (_trigger: unknown, options: unknown[]) => options
}));
vi.mock('./WiredConditionBaseView', () => ({
    WiredConditionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

const { WiredConditionVariableAgeMatchView } = await import('./WiredConditionVariableAgeMatchView');

const field = () => screen.getByRole('textbox', { name: 'wiredfurni.params.variables.time_selection' });
const openPopup = () => fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));

describe('WiredConditionVariableAgeMatchView duration (AIR VariableAge + ValueOrVariableSection)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setVariableIds.mockClear();
        baseProps = null;
    });

    it('shows the duration field in one row with the unit and no radios', () => {
        trigger = { stringData: 'custom:5\t0', intData: [0, 0, 0, 0, 30, 2, 0, -10] };
        render(<WiredConditionVariableAgeMatchView />);

        expect(field()).toHaveValue('30');
        expect(screen.getByRole('combobox', { name: 'wiredfurni.params.variables.duration' })).toHaveTextContent('wiredfurni.params.variables.duration.2');
        expect(field().closest('.octane-wired__value-row')).toContainElement(screen.getByRole('combobox', { name: 'wiredfurni.params.variables.duration' }));
        expect(screen.queryByText('wiredfurni.params.variables.reference_type.constant')).toBeNull();
        baseProps.save();

        // AIR: no string, variable ids [variable] (no duration variable while the duration is a number).
        expect(setStringParam).toHaveBeenLastCalledWith('');
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5']);
        expect(setIntParams).toHaveBeenLastCalledWith([0, 0, 0, 0, 30, 2, 0, -10]);
    });

    it('reads a variable duration on its type: the popup has the type selector only, no holder and no same holder', () => {
        trigger = { stringData: 'custom:5\t10', intData: [0, 2, 1, 0, 0, 1, 1, -20] };
        render(<WiredConditionVariableAgeMatchView />);

        expect(field()).toHaveValue('combo');
        openPopup();
        const popup = screen.getByRole('dialog');

        expect(within(popup).getAllByRole('button', { name: /^wiredfurni\.params\.sourcetype\.(global|context|furni|users)$/ })).toHaveLength(4);
        expect(within(popup).queryByText('wiredfurni.params.sources.merged.title.variables')).toBeNull();
        expect(within(popup).queryByRole('checkbox')).toBeNull();
        fireEvent.click(within(popup).getByRole('button', { name: 'wiredfurni.params.sourcetype.global' }));
        fireEvent.click(within(screen.getByRole('dialog')).getByText('round'));
        baseProps.save();

        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5', 'room:8']);
        expect(setIntParams).toHaveBeenLastCalledWith([0, 2, 1, 0, 0, 1, 1, -10]);
    });

    it('reads the variable and the duration variable from the variable ids', () => {
        trigger = { stringData: '', intData: [0, 2, 1, 0, 0, 1, 1, -20], variableIds: ['user:5', 'ctx:10'] };
        render(<WiredConditionVariableAgeMatchView />);

        expect(field()).toHaveValue('combo');
        baseProps.save();
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5', 'ctx:10']);
    });

    it('refuses an unknown name or a variable without a value', () => {
        trigger = { stringData: 'custom:5\t0', intData: [0, 0, 0, 0, 30, 2, 0, -10] };
        render(<WiredConditionVariableAgeMatchView />);

        fireEvent.change(field(), { target: { value: 'flag' } });
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(baseProps.validate()).toBe(false);
        fireEvent.change(field(), { target: { value: '0b101' } });
        expect(baseProps.validate()).toBe(true);
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([0, 0, 0, 0, 5, 2, 0, -10]);
    });
});
