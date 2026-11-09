import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setVariableIds = vi.fn();
let trigger: { stringData: string; intData: number[]; variableIds?: string[]; userSourceTypes?: number[] } | null = null;
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
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes, setVariableIds }),
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

import { normalizeResetRewardTrackId, normalizeRewardTrackId, WiredActionProgressRewardTrackView } from './WiredActionProgressRewardTrackView';
import { WiredActionResetRewardTrackView } from './WiredActionResetRewardTrackView';

describe('reward track wired actions', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setVariableIds.mockClear();
        baseProps = null;
    });

    it('progress: needs a track and a task, and saves the official [add, fromVar, amount, target] with the user slot', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredActionProgressRewardTrackView />);
        expect(baseProps.validate()).toBe(false);
        expect(screen.getByRole('checkbox')).not.toBeChecked();

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
        expect(screen.getByRole('checkbox')).not.toBeChecked();
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
        // AIR: `track\ttask` as the string, the amount's variable as the variable id.
        expect(setStringParam).toHaveBeenLastCalledWith('season_1\tgames');
        expect(setVariableIds).toHaveBeenLastCalledWith(['room:8']);
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

        // AIR does not ask for a filled-in id, and the id is anything but a tab.
        fireEvent.change(screen.getByLabelText('track'), { target: { value: '' } });
        expect(baseProps.validate).toBeUndefined();
        fireEvent.change(screen.getByLabelText('track'), { target: { value: 'season 1.b' } });
        baseProps.save();
        expect(setStringParam).toHaveBeenLastCalledWith('season 1.b');
    });

    it('progress: a box saved under the older id rules shows its ids as stored', () => {
        trigger = { stringData: 'season.1\tgames-2', intData: [0, 0, 5, -10] };
        render(<WiredActionProgressRewardTrackView />);

        expect((screen.getByLabelText('track') as HTMLInputElement).value).toBe('season.1');
        expect((screen.getByLabelText('task') as HTMLInputElement).value).toBe('games-2');
    });

    it('keeps ids to what AIR\'s boxes accept', () => {
        expect(normalizeRewardTrackId('a.b-c_d')).toBe('abc_d');
        expect(normalizeRewardTrackId('a\tb:c d\u00e9')).toBe('abcd');
        expect(normalizeRewardTrackId('x'.repeat(120))).toHaveLength(100);
        expect(normalizeResetRewardTrackId('a.b c\td')).toBe('a.b cd');
        expect(normalizeResetRewardTrackId('x'.repeat(120))).toHaveLength(100);
    });
});
