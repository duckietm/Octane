import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
let trigger: { stringData: string; intData: number[]; userSourceTypes?: number[]; furniSourceTypes?: number[] } | null = null;
let baseProps: { save: () => void; validate?: () => boolean } | null = null;
const variable = (itemId: number, name: string, hasValue = true) => ({ itemId, name, availability: 0, hasValue, isReadOnly: false, variableType: 0 });
const tools = {
    userVariableDefinitions: [variable(5, 'score')],
    furniVariableDefinitions: [variable(7, 'level'), variable(3, 'tagged', false)],
    roomVariableDefinitions: [variable(8, 'round')],
    contextVariableDefinitions: []
};

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    GetRoomSession: () => ({ roomId: 1 }),
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
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes }),
    useWiredTools: () => tools
}));
vi.mock('../WiredSourcesSelector', () => ({
    sortWiredSourceOptions: (options: unknown[]) => options,
    useAvailableUserSources: (_trigger: unknown, options: unknown[]) => options
}));
vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

const { WiredActionPlaceTemporaryFurniView } = await import('./WiredActionPlaceTemporaryFurniView');

const field = () => screen.getByRole('textbox', { name: 'wiredfurni.params.place_furni.spawn_with_value' });

describe('WiredActionPlaceTemporaryFurniView spawn value (AIR place furni + ValueOrVariableSection)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setSourceTypes.mockClear();
        baseProps = null;
    });

    it('saves the unchanged layout with a typed value', () => {
        trigger = { stringData: '7\t0', intData: [0, 0, 0, 0, 0, 0, 1, 0, 4, 0], furniSourceTypes: [110, 0, 0], userSourceTypes: [0, 0] };
        render(<WiredActionPlaceTemporaryFurniView />);

        expect(field()).toHaveValue('4');
        fireEvent.change(field(), { target: { value: '-12' } });
        baseProps.save();

        expect(setIntParams).toHaveBeenLastCalledWith([0, 0, 0, 0, 0, 0, 1, 0, -12, 0]);
        expect(setStringParam).toHaveBeenLastCalledWith('7\t0');
        expect(setSourceTypes).toHaveBeenLastCalledWith({ furni: [110, 0, 0], users: [0, 0] });
    });

    it('reads a value variable on the holder in the popup (merged slot 1) and saves its sources', () => {
        trigger = { stringData: '7\t5', intData: [0, 0, 0, 0, 0, 0, 1, 1, 0, 1], furniSourceTypes: [110, 0, 0], userSourceTypes: [0, 200] };
        render(<WiredActionPlaceTemporaryFurniView />);

        expect(field()).toHaveValue('score');
        fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));
        const popup = screen.getByRole('dialog');

        expect(within(popup).getByText('wiredfurni.params.sources.merged.title.variables')).toBeTruthy();
        expect(within(popup).getByText('wiredfurni.params.sources.users.200')).toBeTruthy();
        expect(within(popup).getAllByRole('button', { name: /^(global|context|furni|user)$/ })).toHaveLength(4);
        expect(within(popup).queryByRole('checkbox')).toBeNull();
        baseProps.save();

        expect(setIntParams).toHaveBeenLastCalledWith([0, 0, 0, 0, 0, 0, 1, 1, 0, 1]);
        expect(setStringParam).toHaveBeenLastCalledWith('7\t5');
        expect(setSourceTypes).toHaveBeenLastCalledWith({ furni: [110, 0, 0], users: [0, 200] });
    });

    it('disables the value for a spawn variable without a value and does not validate it', () => {
        trigger = { stringData: '3\t0', intData: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0] };
        render(<WiredActionPlaceTemporaryFurniView />);

        expect(field()).toBeDisabled();
        fireEvent.change(field(), { target: { value: 'nope' } });
        expect(screen.queryByRole('alert')).toBeNull();
        expect(baseProps.validate()).toBe(true);
    });

    it('refuses an invalid value while it applies', () => {
        trigger = { stringData: '7\t0', intData: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0] };
        render(<WiredActionPlaceTemporaryFurniView />);

        fireEvent.change(field(), { target: { value: 'nope' } });
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(baseProps.validate()).toBe(false);
        // The value target is furni (0): a furni variable with a value, matched in any case.
        fireEvent.change(field(), { target: { value: 'LEVEL' } });
        expect(baseProps.validate()).toBe(true);
    });
});
