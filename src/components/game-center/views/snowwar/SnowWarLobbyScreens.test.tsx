import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SnowWarLobbyView } from './SnowWarLobbyView';
import { SnowWarTeamsView } from './SnowWarTeamsView';

const mocks = vi.hoisted(() => ({ snowWar: null as any }));

const TEXTS: Record<string, string> = {
    'snowwar.lobby_game_start_countdown': '%{seconds|0 seconden|1 seconde|%% seconden} voor de Storm!',
    'snowwar.lobby_arena_queue_position': 'Plaats in wachtrij: %position%',
    'snowwar.field.name.9': 'Drakenberg'
};

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    LocalizeText: (key: string) => TEXTS[key] ?? key,
    GetConfigurationValue: (_key: string, fallback: any) => fallback,
    GetSessionDataManager: () => ({ userId: 1 })
}));

vi.mock('../../../../common', () => ({ LayoutAvatarImageView: ({ figure }: { figure: string }) => <div data-testid="avatar">{ figure }</div> }));

vi.mock('../../../../hooks', () => ({ useSnowWar: () => mocks.snowWar }));

const lineUp = [ 1, 2, 3 ].map(userId => ({ userId, teamId: (userId - 1) % 2, name: `player${ userId }`, figure: 'hd-180-1', gender: 'M', skillLevel: 12 }));

describe('SnowWar lobby and loading screens (AIR)', () =>
{
    beforeEach(() =>
    {
        mocks.snowWar = {
            phase: 'lobby', lobbySeconds: 7, queuePosition: 1, queueSize: 3, queueInfo: { minPlayers: 2, canEdit: false },
            lobbyTeams: { teamCount: 2, leaderUserId: 1, selectedArenaId: 9, arenas: [ { id: 9, name: 'b', official: true } ], players: lineUp },
            levelData: null, simulation: { avatars: new Map() },
            leaveQueue: vi.fn(), selectArena: vi.fn(), startEditing: vi.fn(), exitGame: vi.fn()
        };
    });

    afterEach(() => cleanup());

    it('counts the lobby down with the AIR plural text', () =>
    {
        render(<SnowWarTeamsView />);

        expect(screen.getByText('7 seconden voor de Storm!')).toBeTruthy();
        expect(screen.getByText('Drakenberg')).toBeTruthy();
    });

    it('shows the queue position when this player is not in the forming match', () =>
    {
        mocks.snowWar.phase = 'queued';
        mocks.snowWar.queuePosition = 5;
        mocks.snowWar.lobbyTeams.players = lineUp.filter(player => player.userId !== 1);
        render(<SnowWarTeamsView />);

        expect(screen.getByText('Plaats in wachtrij: 5')).toBeTruthy();
        fireEvent.click(screen.getByText('Cancel'));
        expect(mocks.snowWar.leaveQueue).toHaveBeenCalled();
    });

    it('shows the arena queue place while every arena is busy (AIR Game2InArenaQueue)', () =>
    {
        mocks.snowWar.phase = 'queued';
        mocks.snowWar.arenaQueuePosition = 2;
        render(<SnowWarTeamsView />);

        expect(screen.getByText('Plaats in wachtrij: 2')).toBeTruthy();
    });

    it('shows the lobby line-up while the level data has not arrived yet', () =>
    {
        mocks.snowWar.phase = 'loading';
        render(<SnowWarLobbyView />);

        expect(screen.getByText('player1')).toBeTruthy();
        expect(screen.getByText('player3')).toBeTruthy();
        expect(screen.getByText('Drakenberg')).toBeTruthy();
        // Blue (team 1) wears the AIR blue shirt, red (team 0) the red one.
        const figures = screen.getAllByTestId('avatar').map(node => node.textContent);
        expect(figures.filter(figure => figure.includes('ch-20000-1'))).toHaveLength(1);
        expect(figures.filter(figure => figure.includes('ch-20001-1'))).toHaveLength(2);

        fireEvent.click(screen.getByText('Leave game'));
        expect(mocks.snowWar.exitGame).toHaveBeenCalled();
    });
});
