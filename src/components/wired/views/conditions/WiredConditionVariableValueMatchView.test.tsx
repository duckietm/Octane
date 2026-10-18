import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
const setFurniIds = vi.fn();
const setAllowsFurni = vi.fn();
const noFurni: number[] = [];
let trigger: { stringData: string; intData: number[]; selectedItems?: number[]; userSourceTypes?: number[]; furniSourceTypes?: number[] } | null = null;
let baseProps: { save: () => void; validate?: () => boolean } | null = null;
const variable = (itemId: number, name: string, hasValue = true) => ({ itemId, name, availability: 0, hasValue, isReadOnly: false, variableType: 0 });
const tools = {
    userVariableDefinitions: [variable(5, 'score'), variable(6, 'coins')],
    furniVariableDefinitions: [variable(7, 'height')],
    roomVariableDefinitions: [variable(8, 'round')],
    contextVariableDefinitions: []
};

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    GetRoomSession: () => ({ roomId: 1 }),
    // The official target ids are the identity here: 0 user, 1 furni, 2 context, 3 global.
    fromOfficialVariableTarget: (value: number) => value,
    toOfficialVariableTarget: (value: number) => value,
    fromOfficialComparison: (value: number) => value,
    toOfficialComparison: (value: number) => value,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 },
    WiredSelectionVisualizer: {
        applySelectionShaderToFurni: vi.fn(),
        applySecondarySelectionShaderToFurni: vi.fn(),
        clearSelectionShaderFromFurni: vi.fn(),
        clearSecondarySelectionShaderFromFurni: vi.fn()
    }
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
    useWired: () => ({ trigger, furniIds: noFurni, setAllowsFurni, setFurniIds, setIntParams, setStringParam, setSourceTypes }),
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
vi.mock('./WiredConditionBaseView', () => ({
    WiredConditionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean; footer?: ReactNode }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return (
            <div>
                {props.children}
                <footer>{props.footer}</footer>
            </div>
        );
    }
}));

const { WiredConditionVariableValueMatchView } = await import('./WiredConditionVariableValueMatchView');

const field = () => screen.getByRole('textbox', { name: 'wiredfurni.params.variables.reference_value' });
const openPopup = () => fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));

describe('WiredConditionVariableValueMatchView reference value (AIR VariableValue + ValueOrVariableSection)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        baseProps = null;
    });

    it('keeps only the destination holder in the footer; the reference holder is the popup source', () => {
        // user "score" (5) = variable "coins" (6) on users, reference user source 200.
        trigger = { stringData: 'custom:5\tcustom:6\t', intData: [0, 2, 1, 0, 0, 0, 0, 200, 0, 0] };
        render(<WiredConditionVariableValueMatchView />);

        expect(field()).toHaveValue('coins');
        expect(screen.getByText('wiredfurni.params.sources.merged.title.variables_destination')).toBeTruthy();
        expect(screen.queryByText('wiredfurni.params.sources.merged.title.variables_reference')).toBeNull();
        expect(screen.queryByRole('radio', { name: /from_variable/ })).toBeNull();

        openPopup();
        const popup = screen.getByRole('dialog');

        expect(within(popup).getByText('wiredfurni.params.sources.merged.title.variables')).toBeTruthy();
        expect(within(popup).getByText('wiredfurni.params.sources.users.200')).toBeTruthy();
        expect(within(popup).getAllByRole('button', { name: /^(global|context|furni|user)$/ })).toHaveLength(4);
        expect(within(popup).getByText('wiredfurni.params.variables.reference_value.same_holder')).toBeTruthy();
    });

    it('saves the unchanged layout; the same holder only counts on the destination type and locks the source', () => {
        trigger = { stringData: 'custom:5\tcustom:6\t', intData: [0, 2, 1, 0, 0, 0, 0, 200, 0, 1] };
        render(<WiredConditionVariableValueMatchView />);
        openPopup();
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox'));
        expect(within(screen.getByRole('dialog')).getByRole('group')).toBeDisabled();
        baseProps.save();

        expect(setStringParam).toHaveBeenLastCalledWith('custom:5\tcustom:6\t');
        expect(setIntParams).toHaveBeenLastCalledWith([0, 2, 1, 0, 0, 0, 1, 200, 0, 1]);

        // A room variable reference cannot be read on the same holder: the stored flag is not saved.
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox'));
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'global' }));
        fireEvent.change(field(), { target: { value: 'round' } });
        expect(screen.queryByRole('dialog')).toBeTruthy();
        expect(within(screen.getByRole('dialog')).getByRole('checkbox')).toBeDisabled();
        baseProps.save();
        expect(setStringParam).toHaveBeenLastCalledWith('custom:5\tcustom:8\t');
        expect(setIntParams).toHaveBeenLastCalledWith([0, 2, 1, 0, 0, 3, 0, 200, 0, 1]);
    });

    it('takes a typed number as the constant (high and low int) and refuses an invalid text', () => {
        trigger = { stringData: 'custom:5\t\t', intData: [0, 2, 0, 0, 7, 0, 0, 0, 0, 0] };
        render(<WiredConditionVariableValueMatchView />);

        expect(field()).toHaveValue('7');
        fireEvent.change(field(), { target: { value: '-0x10' } });
        expect(baseProps.validate()).toBe(false);
        fireEvent.change(field(), { target: { value: '-42' } });
        expect(baseProps.validate()).toBe(true);
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([0, 2, 0, -1, -42, 0, 0, 0, 0, 0]);
        expect(setStringParam).toHaveBeenLastCalledWith('custom:5\t\t');

        fireEvent.change(field(), { target: { value: 'nope' } });
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(baseProps.validate()).toBe(false);
    });
});
