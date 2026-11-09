import { cleanup, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWiredLeaderboardStore } from '../../../../hooks/wired/wiredLeaderboardStore';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setVariableIds = vi.fn();
let trigger: Record<string, unknown> | null = null;
let baseProps: { save: () => void; validate: () => boolean } | null = null;
const variable = (itemId: number, name: string) => ({ itemId, name, availability: 0, hasValue: true, isReadOnly: false, variableType: 0 });
const tools = {
    userVariableDefinitions: [variable(77, 'team'), variable(900, 'coins')],
    roomVariableDefinitions: [variable(5, 'round')]
};

vi.mock('../../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../../../../common/Checkbox', () => ({
    Checkbox: (props: { checked?: boolean; 'data-testid'?: string }) => <input type="checkbox" readOnly checked={!!props.checked} data-testid={props['data-testid']} />
}));
vi.mock('../../../../common/Select', () => ({
    Select: (props: PropsWithChildren<{ value?: string | number; 'data-testid'?: string }>) => (
        <select value={props.value} onChange={() => undefined} data-testid={props['data-testid']}>
            {props.children}
        </select>
    )
}));
vi.mock('../../../../common/BaseButton', () => ({ BaseButton: (props: PropsWithChildren) => <button>{props.children}</button> }));
vi.mock('../../../../layout', () => ({ OctaneInput: () => <input /> }));
vi.mock('../../../../hooks', async () => {
    const store = await import('../../../../hooks/wired/wiredLeaderboardStore');

    return {
        useWired: () => ({ trigger, setIntParams, setStringParam, setVariableIds }),
        useWiredTools: () => tools,
        useWiredLeaderboardStore: store.useWiredLeaderboardStore
    };
});
vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: (props: PropsWithChildren<{ save: () => void; validate: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

const { WiredExtraVariableLeaderboardView } = await import('./WiredExtraVariableLeaderboardView');

/** Sort highest, a username column, the filter on without compare, two display names, at (1, 1). */
const INTS = [0, 1, 0, -1, -1, -1, 1, 0, 0, 2, 1, 1, 0, 0, 3, 0, 0, 0, 0];
const TEXT = ['Top', '', 'Player', '', '', '', '', 'Gold', 'Wins', '', '', '', '', '', '', '', ''];
const EMPTY = ['0', '0', '0', '0', '0', '0', '0', '0'];

const context = (variableId: string) => ({
    overlayInstanceId: 1,
    physicalTileX: 1,
    physicalTileY: 1,
    totalCandidateCount: 1,
    choices: [{ variableId, technicalName: 'coins', persistent: true, hasValue: true, applicableLevelUpCount: 0 }]
});

describe('leaderboard editor sends the variable list ids (AIR VariableLeaderboardConfigCodec)', () => {
    afterEach(() => {
        cleanup();
        useWiredLeaderboardStore.getState().endEdit();
    });

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setVariableIds.mockClear();
        baseProps = null;
    });

    it('a box an older server sent with bare ids after the text saves the list ids apart from the text', () => {
        trigger = { intData: INTS, stringData: [...TEXT, '77', '0', '1200', '900', ...EMPTY].join('\t'), variableIds: [], leaderboardContext: context('900') };
        render(<WiredExtraVariableLeaderboardView />);

        expect(screen.getByTestId('leaderboard-filter')).toBeChecked();
        expect(baseProps.validate()).toBe(true);
        baseProps.save();

        // Only the stacked variable keeps its name (900 = "Wins"); the filter is the team variable.
        expect(setStringParam).toHaveBeenLastCalledWith(['Top', '', 'Player', '', '', '', '', 'Wins', '', '', '', '', '', '', '', '', ''].join('\t'));
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:77', '0', 'user:900', '0', ...EMPTY]);
        expect(useWiredLeaderboardStore.getState().editDraft.filterVariableId).toBe('user:77');
    });

    it('a box with the list ids as its variable ids saves them back unchanged', () => {
        trigger = {
            intData: INTS,
            stringData: TEXT.join('\t'),
            variableIds: ['user:77', 'n', 'user:1200', 'user:900'],
            leaderboardContext: context('user:900')
        };
        render(<WiredExtraVariableLeaderboardView />);
        baseProps.save();

        expect(setVariableIds).toHaveBeenLastCalledWith(['user:77', '0', 'user:900', '0', ...EMPTY]);
        // The filter picker selects the variable by its list id.
        const picker = screen.getAllByRole('combobox').find((select) => (select as HTMLSelectElement).value === 'user:77');
        expect(picker).toBeTruthy();
        expect(Array.from((picker as HTMLSelectElement).options).map((option) => option.value)).toEqual(['0', 'user:77', 'user:900']);
    });

    it('a pasted copy reads back as the same box', () => {
        trigger = { intData: INTS, stringData: TEXT.join('\t'), variableIds: ['user:77', 'n', 'user:1200', 'user:900'], leaderboardContext: context('user:900') };
        render(<WiredExtraVariableLeaderboardView />);
        baseProps.save();
        const copied = { intData: setIntParams.mock.lastCall[0], stringData: setStringParam.mock.lastCall[0], variableIds: setVariableIds.mock.lastCall[0] };
        cleanup();

        trigger = { ...copied, leaderboardContext: context('user:900') };
        render(<WiredExtraVariableLeaderboardView />);
        baseProps.save();

        expect(setStringParam).toHaveBeenLastCalledWith(copied.stringData);
        expect(setVariableIds).toHaveBeenLastCalledWith(copied.variableIds);
    });
});
