import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SnowWarResultsView } from './SnowWarResultsView';

const mocks = vi.hoisted(() => ({
    snowWar: null as any,
    gameCenter: null as any,
    send: vi.fn(),
    link: vi.fn()
}));

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    LocalizeText: (key: string) => key,
    SendMessageComposer: mocks.send,
    CreateLinkEvent: mocks.link,
    GetConfigurationValue: () => ({})
}));

vi.mock('../../../../common', () => ({
    LayoutAvatarImageView: ({ figure }: { figure: string }) => <div data-testid="avatar">{figure}</div>
}));

vi.mock('../../../../hooks', () => ({
    useSnowWar: () => mocks.snowWar,
    useGameCenter: () => mocks.gameCenter
}));

const player = (userId: number, name: string, score: number, snowballHits: number, kills: number) =>
    ({ userId, name, score, figure: 'hd-180-1.ch-210-66', gender: 'M', snowballHits, kills, skillLevel: 12 });

describe('SnowWarResultsView', () =>
{
    beforeEach(() =>
    {
        mocks.send.mockReset();
        mocks.snowWar = {
            results: {
                secondsToResults: 20,
                teams: [
                    { teamId: 0, score: 10, players: [ player(1, 'red-player', 10, 2, 0) ] },
                    { teamId: 1, score: 30, players: [ player(2, 'blue-player', 30, 6, 3) ] }
                ],
                playerWithMostHits: 2,
                playerWithMostKills: 2
            },
            levelData: null,
            rematchedUserIds: [],
            playAgain: vi.fn(),
            exitGame: vi.fn()
        };
        mocks.gameCenter = { accountStatus: { freeGamesLeft: 4, hasUnlimitedGames: false } };
    });

    afterEach(() => cleanup());

    it('names the winner, lists both teams with stats and the spotlights', () =>
    {
        render(<SnowWarResultsView />);

        expect(screen.getByText('Blue Team wins!')).toBeTruthy();
        expect(screen.getByText('red-player')).toBeTruthy();
        expect(screen.getAllByText('blue-player').length).toBe(3); // row + two spotlights
        expect(screen.getByText('Most Hits')).toBeTruthy();
        // Blue (team 1) wears the AIR blue shirt.
        expect(screen.getAllByTestId('avatar').some(node => node.textContent.includes('ch-20000-1'))).toBe(true);
    });

    it('counts the rematch down and switches to please wait once pressed', () =>
    {
        render(<SnowWarResultsView />);

        const button = screen.getByText('Rematch (20)');
        fireEvent.click(button);

        expect(mocks.snowWar.playAgain).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Please wait (20)')).toBeTruthy();
    });

    it('offers HC instead of a rematch with no games left', () =>
    {
        mocks.gameCenter = { accountStatus: { freeGamesLeft: 0, hasUnlimitedGames: false } };
        render(<SnowWarResultsView />);

        fireEvent.click(screen.getByText('Join HC!'));

        expect(mocks.snowWar.playAgain).not.toHaveBeenCalled();
        expect(mocks.snowWar.exitGame).toHaveBeenCalled();
        expect(mocks.link).toHaveBeenCalled();
    });
});
