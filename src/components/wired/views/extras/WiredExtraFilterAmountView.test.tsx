import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setVariableIds = vi.fn();
let trigger: { stringData: string; intData: number[]; variableIds?: string[] } | null = null;
let baseProps: { save: () => void; validate?: () => boolean } | null = null;
const variable = (itemId: number, name: string, hasValue = true) => ({ itemId, name, availability: 0, hasValue, isReadOnly: false, variableType: 0 });
const tools = {
    userVariableDefinitions: [variable(5, 'score')],
    furniVariableDefinitions: [variable(7, 'level')],
    roomVariableDefinitions: [variable(8, 'round')],
    contextVariableDefinitions: []
};

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    GetRoomSession: () => ({ roomId: 1 }),
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));
vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setVariableIds }),
    useWiredTools: () => tools
}));
vi.mock('../WiredSourcesSelector', () => ({
    sortWiredSourceOptions: (options: unknown[]) => options,
    useAvailableUserSources: (_trigger: unknown, options: unknown[]) => options
}));
vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

const { WiredExtraFilterAmountView } = await import('./WiredExtraFilterAmountView');

const field = () => screen.getByRole('textbox', { name: 'wiredfurni.params.setfilter' });

describe('WiredExtraFilterAmountView (AIR SelectorFilter + ValueOrVariableSection)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setVariableIds.mockClear();
        baseProps = null;
    });

    it('saves the unchanged layout for a typed amount, in AIR range 1..1000', () => {
        trigger = { stringData: '', intData: [3, 0, 1, 0] };
        render(<WiredExtraFilterAmountView />);

        expect(field()).toHaveValue('3');
        fireEvent.change(field(), { target: { value: '1001' } });
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(baseProps.validate()).toBe(false);
        fireEvent.change(field(), { target: { value: '0' } });
        expect(baseProps.validate()).toBe(false);
        fireEvent.change(field(), { target: { value: '1000' } });
        expect(baseProps.validate()).toBe(true);
        baseProps.save();

        expect(setIntParams).toHaveBeenLastCalledWith([1000, 0, 1, 0]);
        expect(setStringParam).toHaveBeenLastCalledWith('');
        expect(setVariableIds).toHaveBeenLastCalledWith([]);
    });

    it('reads the variable on the triggering holder: type selector only in the popup', () => {
        trigger = { stringData: '5', intData: [1, 1, 1, 1] };
        render(<WiredExtraFilterAmountView />);

        expect(field()).toHaveValue('score');
        fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));
        const popup = screen.getByRole('dialog');

        expect(within(popup).queryByText('wiredfurni.params.sources.merged.title.variables')).toBeNull();
        fireEvent.click(within(popup).getByRole('button', { name: 'wiredfurni.params.sourcetype.global' }));
        fireEvent.click(within(screen.getByRole('dialog')).getByText('round'));
        baseProps.save();

        expect(setIntParams).toHaveBeenLastCalledWith([1, 1, -10, 1]);
        // AIR: the variable as the first variable id, no string.
        expect(setStringParam).toHaveBeenLastCalledWith('');
        expect(setVariableIds).toHaveBeenLastCalledWith(['room:8']);
    });

    it('reads the variable from the variable ids', () => {
        trigger = { stringData: '', intData: [1, 1, 0, 1], variableIds: ['furni:7'] };
        render(<WiredExtraFilterAmountView />);

        expect(field()).toHaveValue('level');
        baseProps.save();
        expect(setVariableIds).toHaveBeenLastCalledWith(['furni:7']);
    });
});
