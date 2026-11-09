import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameTileView } from './GameTileView';

const mocks = vi.hoisted(() => ({
    gameCenter: null as any,
    snowWar: null as any,
    send: vi.fn(),
    link: vi.fn(),
    showConfirm: vi.fn()
}));

vi.mock('../../../api', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    ColorUtils: { uintHexColor: () => '#000' },
    LocalizeText: (key: string, parameters: string[] = null, replacements: string[] = null) =>
        (parameters ? `${ key }:${ replacements.join(',') }` : key),
    GetConfigurationValue: (_key: string, fallback: any) => fallback,
    SendMessageComposer: mocks.send,
    CreateLinkEvent: mocks.link
}));

vi.mock('../../../hooks', () => ({
    useGameCenter: () => mocks.gameCenter,
    useSnowWar: () => mocks.snowWar,
    useNotification: () => ({ showConfirm: mocks.showConfirm })
}));

const game = { gameId: 0, gameNameId: 'snowwar', bgColor: 0, assetUrl: '' } as any;

const offer = (offerId: number, localizationId: string) =>
    ({ offerId, localizationId, priceInCredits: 10, priceInActivityPoints: 0, activityPointType: 0 });

describe('GameTileView (SnowWar hub tile)', () =>
{
    beforeEach(() =>
    {
        mocks.send.mockReset();
        mocks.showConfirm.mockReset();
        mocks.gameCenter = {
            accountStatus: { freeGamesLeft: 3, hasUnlimitedGames: false },
            setSelectedGame: vi.fn(),
            blockedUntil: 0,
            setInstructionsOpen: vi.fn(),
            tokenOffers: [ offer(1, 'GET_SNOWWAR_TOKENS'), offer(2, 'GET_SNOWWAR_TOKENS2'), offer(3, 'GET_SNOWWAR_TOKENS3') ]
        };
        mocks.snowWar = {
            phase: 'idle', queuePosition: 0, queueSize: 0, lobbySeconds: 0, queueInfo: null, errorCode: 0,
            leaveQueue: vi.fn(), requestLeaderboard: vi.fn(), startEditing: vi.fn()
        };
    });

    afterEach(() => cleanup());

    it('shows the games left, the three token buttons and the play button', () =>
    {
        render(<GameTileView game={ game } />);

        expect(screen.getByText('3')).toBeTruthy();
        expect(screen.getByLabelText('10')).toBeTruthy();
        expect(screen.getByLabelText('100')).toBeTruthy();
        expect(screen.getByLabelText('300')).toBeTruthy();

        fireEvent.click(screen.getByText('Play now!'));
        expect(mocks.send).toHaveBeenCalledTimes(1);
    });

    it('confirms a token purchase with the price before buying', () =>
    {
        render(<GameTileView game={ game } />);

        fireEvent.click(screen.getByLabelText('100'));
        expect(mocks.showConfirm).toHaveBeenCalledTimes(1);
        expect(mocks.showConfirm.mock.calls[0][0]).toContain('100x SnowStorm');
        expect(mocks.send).not.toHaveBeenCalled();

        mocks.showConfirm.mock.calls[0][1]();
        expect(mocks.send).toHaveBeenCalledTimes(1);
    });

    it('hides the play button with no games left, as AIR', () =>
    {
        mocks.gameCenter.accountStatus = { freeGamesLeft: 0, hasUnlimitedGames: false };
        render(<GameTileView game={ game } />);

        expect(screen.queryByText('Play now!')).toBeNull();
        expect(screen.getByLabelText('10')).toBeTruthy();
    });

    it('hides the counter and the token buttons for unlimited games', () =>
    {
        mocks.gameCenter.accountStatus = { freeGamesLeft: -1, hasUnlimitedGames: true };
        render(<GameTileView game={ game } />);

        expect(screen.queryByLabelText('10')).toBeNull();
        expect(screen.getByText('Play now!')).toBeTruthy();
    });

    it('counts the leave block down on a disabled play button', () =>
    {
        mocks.gameCenter.blockedUntil = Date.now() + 65_000;
        render(<GameTileView game={ game } />);

        const button = screen.getByText(/^1:0[45]$/) as HTMLButtonElement;
        expect(button.disabled).toBe(true);
    });

    it('opens the how-to-play pages', () =>
    {
        render(<GameTileView game={ game } />);

        fireEvent.click(screen.getByText('How To Play'));
        expect(mocks.gameCenter.setInstructionsOpen).toHaveBeenCalledWith(true);
    });
});
