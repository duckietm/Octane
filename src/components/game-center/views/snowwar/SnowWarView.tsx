import { FC, useEffect } from 'react';
import { useGameCenter, useSnowWar } from '../../../../hooks';
import { SnowWarArenaView } from './SnowWarArenaView';
import { localizeWithFallback, SNOWWAR_ERROR_IDLE_WARNING, snowWarErrorText } from './SnowWarErrorTexts';
import { SnowWarLeaderboardView } from './SnowWarLeaderboardView';
import { SnowWarLobbyView } from './SnowWarLobbyView';
import { SnowWarResultsView } from './SnowWarResultsView';
import { SnowWarTeamsView } from './SnowWarTeamsView';

/**
 * SnowWar top-level overlay. Mounted in MainView (independent of the game
 * center dialog) so a running match survives closing the game center.
 */
export const SnowWarView: FC = () =>
{
    const { phase, errorCode, queueExpired, leaderboard } = useSnowWar();
    const { isVisible: gameCenterVisible, setIsVisible: setGameCenterVisible } = useGameCenter();

    // Queue wait timed out: drop the player back onto the game center main
    // screen and show the "time has passed" popup (text is UITexts-driven).
    useEffect(() =>
    {
        if (queueExpired) setGameCenterVisible(true);
    }, [queueExpired, setGameCenterVisible]);

    // Never over a match: from loading on the arena owns the screen.
    if (leaderboard.isOpen && (phase === 'idle' || phase === 'queued' || phase === 'lobby')) return <SnowWarLeaderboardView />;

    if (queueExpired)
    {
        return (
            <div className="snowwar-toast snowwar-toast--error">
                {localizeWithFallback('snowwar.queue.timeout', 'Sorry, the waiting time has passed.')}
            </div>
        );
    }

    if (phase === 'idle')
    {
        // While the game center hub is open its SnowWar tile shows the error.
        if (!errorCode || gameCenterVisible) return null;
        return <div className="snowwar-toast snowwar-toast--error">{snowWarErrorText(errorCode)}</div>;
    }

    // From joining the queue through the lobby countdown: the pre-match
    // "getting ready" screen with the waiting players assembling into their
    // Red / Blue teams (and a live "waiting for players" / countdown status).
    if (phase === 'queued' || phase === 'lobby')
    {
        return (
            <div className="snowwar-overlay">
                <SnowWarTeamsView />
            </div>
        );
    }

    // Match found: the AIR loading window while the arena loads. From the
    // stage start (preparing) the arena itself shows, with the AIR counter,
    // as GameArenaView does.
    if (phase === 'loading')
    {
        return (
            <div className="snowwar-overlay">
                <SnowWarLobbyView />
            </div>
        );
    }

    return (
        <div className="snowwar-overlay">
            <SnowWarArenaView />
            {(phase === 'playing') && (errorCode === SNOWWAR_ERROR_IDLE_WARNING) &&
                <div className="snowwar-toast snowwar-toast--error" role="alert">{snowWarErrorText(errorCode)}</div>}
            {phase === 'results' && <SnowWarResultsView />}
        </div>
    );
};
