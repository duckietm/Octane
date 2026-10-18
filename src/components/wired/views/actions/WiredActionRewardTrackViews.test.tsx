import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { stringData: string; intData: number[]; userSourceTypes?: number[] } | null = null;
const setSourceTypes = vi.fn();
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
    localizeWithFallback: (key: string, fallback?: string) => fallback ?? key,
    GetRoomSession: () => ({ roomId: 1 }),
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 }
}));
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes }),
    useWiredTools: () => tools,
    useAchievements: () => ({ enabledWiredAchievements: [] })
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
    WiredSourcesSelector: () => <div>sources</div>,
    sortWiredSourceOptions: (options: unknown[]) => options,
    useAvailableUserSources: (_trigger: unknown, options: unknown[]) => options
}));

vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

import { normalizeRewardTrackId, WiredActionProgressRewardTrackView } from './WiredActionProgressRewardTrackView';
import { WiredActionResetRewardTrackView } from './WiredActionResetRewardTrackView';

describe('reward track wired actions', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        baseProps = null;
    });

    it('progress: needs a track and a task, and saves the official [add, fromVar, amount, target] with the user slot', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredActionProgressRewardTrackView />);
        expect(baseProps.validate()).toBe(false);
        expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);

        fireEvent.change(screen.getByLabelText('track'), { target: { value: 'season 1:x' } });
        fireEvent.change(screen.getByLabelText('task'), { target: { value: 'games' } });
        fireEvent.click(screen.getByRole('checkbox'));
        expect(baseProps.validate()).toBe(true);
        baseProps.save();

        expect(setStringParam).toHaveBeenCalledWith('season1x\tgames');
        expect(setIntParams).toHaveBeenCalledWith([1, 0, 1, -10]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [], users: [0] });
    });

    it('progress: reads back what the box stored', () => {
        trigger = { stringData: 'season_1\tgames', intData: [0, 0, 25, -20], userSourceTypes: [201] };
        render(<WiredActionProgressRewardTrackView />);

        expect((screen.getByLabelText('track') as HTMLInputElement).value).toBe('season_1');
        expect((screen.getByLabelText('task') as HTMLInputElement).value).toBe('games');
        expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
        baseProps.save();
        expect(setIntParams).toHaveBeenCalledWith([0, 0, 25, -20]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [], users: [201] });
    });

    it('progress: the score is one AIR value field; a variable is saved after the ids with its target', () => {
        trigger = { stringData: 'season_1\tgames', intData: [0, 0, 25, -10] };
        render(<WiredActionProgressRewardTrackView />);

        const field = screen.getByRole('textbox', { name: 'Score' });

        expect(field).toHaveValue('25');
        fireEvent.change(field, { target: { value: '0' } });
        expect(baseProps.validate()).toBe(false);
        fireEvent.change(field, { target: { value: '0x10' } });
        expect(baseProps.validate()).toBe(true);
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([0, 0, 16, -10]);

        fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));
        const popup = screen.getByRole('dialog');

        expect(within(popup).getByText('wiredfurni.params.sources.merged.title.variables')).toBeTruthy();
        expect(within(popup).queryByRole('button', { name: 'user' })).toBeNull();
        fireEvent.click(within(popup).getByText('round'));
        expect(field).toHaveValue('round');
        baseProps.save();
        expect(setStringParam).toHaveBeenLastCalledWith('season_1\tgames\t8');
        expect(setIntParams).toHaveBeenLastCalledWith([0, 1, 16, -10]);
    });

    it('reset: saves the track and the user source', () => {
        trigger = { stringData: 'season_1', intData: [], userSourceTypes: [200] };
        render(<WiredActionResetRewardTrackView />);

        expect((screen.getByLabelText('track') as HTMLInputElement).value).toBe('season_1');
        baseProps.save();
        expect(setStringParam).toHaveBeenCalledWith('season_1');
        expect(setIntParams).toHaveBeenCalledWith([]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [], users: [200] });

        fireEvent.change(screen.getByLabelText('track'), { target: { value: '' } });
        expect(baseProps.validate()).toBe(false);
    });

    it('keeps ids to what the staff editor accepts', () => {
        expect(normalizeRewardTrackId('a.b-c_d')).toBe('a.b-c_d');
        expect(normalizeRewardTrackId('a\tb:c d')).toBe('abcd');
        expect(normalizeRewardTrackId('x'.repeat(80))).toHaveLength(64);
    });
});
