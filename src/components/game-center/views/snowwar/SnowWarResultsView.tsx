import { Game2GetAccountGameStatusMessageComposer } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import {
    CreateLinkEvent,
    GetConfigurationValue,
    getGamesLeftStatus,
    getOfficialTeamReference,
    getRematchButton,
    getResultHeadline,
    LocalizeText,
    SendMessageComposer,
    SNOWWAR_TEAM_COLORS,
    snowWarDeadlineFromSeconds,
    snowWarSecondsRemaining
} from '../../../../api';
import { LayoutAvatarImageView } from '../../../../common';
import { useGameCenter, useSnowWar } from '../../../../hooks';
import type { SnowWarResultPlayer } from '../../../../hooks/game-center/useSnowWar';
import { getSnowWarFigure } from './SnowWarAvatarView';
import { SnowWarSkillStars } from './SnowWarSkillStars';

const localizeWithFallback = (key: string, fallback: string) => {
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

/** AIR getTeamPlayerDirection: blue (reference 1) faces 2, red (reference 2) faces 4. */
const getTeamDirection = (teamReference: 1 | 2) => (teamReference === 1 ? 2 : 4);

/**
 * AIR snowwar_ending: the "<Team> wins!" / "Game Was A Tie!" banner in the
 * winner's colour, the two team columns (team score, one row per player with
 * the team-shirted avatar, name, HITS / K.O.'s and score, a glow once they
 * rematch), the "Most Hits" / "Most K.O.'s" spotlights, and the button bar:
 * "Rematch (n)" counting down (then "Please wait (n)"), or "Join HC!" with no
 * games left, plus the games-left status and the leave link.
 */
export const SnowWarResultsView: FC = () => {
    const { results, levelData, rematchedUserIds, playAgain, exitGame } = useSnowWar();
    const { accountStatus } = useGameCenter();
    const [rematchRequested, setRematchRequested] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const unlimited = accountStatus?.hasUnlimitedGames ?? true;

    // AIR GameEndingViewController: a limited account re-reads its free games
    // (Game2GetAccountGameStatus for game type 0) as soon as the results open.
    useEffect(() => {
        if (!results || unlimited) return;
        SendMessageComposer(new Game2GetAccountGameStatusMessageComposer(0));
    }, [results, unlimited]);

    // Rematch countdown: a wall-clock deadline from the packet's seconds, so
    // a throttled background tab still shows the right number.
    useEffect(() => {
        setRematchRequested(false);
        if (!results) return;
        const deadline = snowWarDeadlineFromSeconds(Date.now(), results.secondsToResults);
        const tick = () => setSecondsLeft(snowWarSecondsRemaining(deadline, Date.now()));
        tick();
        const interval = window.setInterval(tick, 1000);
        return () => window.clearInterval(interval);
    }, [results]);

    // The ending packet carries no figures; the arena's level data does.
    const figures = useMemo(() => {
        const map = new Map<number, { figure: string; gender: string }>();
        for (const player of levelData?.players ?? []) map.set(player.userId, { figure: player.figure, gender: player.gender });
        return map;
    }, [levelData]);

    if (!results) return null;

    const headline = getResultHeadline(results.teams);
    const freeGamesLeft = accountStatus?.freeGamesLeft ?? -1;
    const hasUnlimitedGames = accountStatus?.hasUnlimitedGames ?? true;
    const gamesLeft = getGamesLeftStatus(freeGamesLeft, hasUnlimitedGames);
    const rematch = getRematchButton(freeGamesLeft, hasUnlimitedGames, secondsLeft, rematchRequested);

    // AIR onGetMore (mode 1 = VIP): close the results, then open the club center.
    const openClubCenter = () => {
        const links = GetConfigurationValue<Record<string, string>>('catalog.links', {});
        exitGame();
        CreateLinkEvent(`catalog/open/${links?.['hc.buy_hc'] ?? 'habbo_club'}`);
    };

    const onRematch = () => {
        if (rematch.kind === 'join_hc') {
            openClubCenter();
            return;
        }
        if (rematchRequested) return;
        setRematchRequested(true);
        playAgain();
    };

    const allPlayers = results.teams.flatMap((team) => team.players);
    // AIR showMostHits / showMostKills hide the spotlight when the stat is 0.
    const findSpotlight = (userId: number | undefined, stat: 'snowballHits' | 'kills') => {
        if (userId === undefined) return null;
        const player = allPlayers.find((candidate) => candidate.userId === userId);
        return player && (player[stat] ?? 0) > 0 ? player : null;
    };
    const mostHits = findSpotlight(results.playerWithMostHits, 'snowballHits');
    const mostKills = findSpotlight(results.playerWithMostKills, 'kills');
    const teamOf = (player: SnowWarResultPlayer) => results.teams.find((team) => team.players.includes(player))?.teamId ?? 0;

    // AIR lays team 1 (blue) on the left and team 2 (red) on the right.
    const orderedTeams = [...results.teams].sort((a, b) => getOfficialTeamReference(a.teamId) - getOfficialTeamReference(b.teamId));

    const renderAvatar = (player: SnowWarResultPlayer, teamId: number) => {
        const figure = player.figure ?? figures.get(player.userId)?.figure ?? '';
        const gender = player.gender ?? figures.get(player.userId)?.gender ?? 'M';
        if (!figure) return null;
        return (
            <LayoutAvatarImageView
                figure={getSnowWarFigure(figure, teamId)}
                gender={gender}
                direction={getTeamDirection(getOfficialTeamReference(teamId))}
                scale={0.5}
            />
        );
    };

    const renderPlayer = (player: SnowWarResultPlayer, teamId: number) => {
        const teamReference = getOfficialTeamReference(teamId);
        const rematched = rematchedUserIds.includes(player.userId);

        return (
            <div key={player.userId} className={`snowwar-results__player snowwar-results__player--team-${teamReference}`}>
                <div className="snowwar-results__player-image">{renderAvatar(player, teamId)}</div>
                <div className="snowwar-results__player-data">
                    <div className="snowwar-results__player-name">{player.name}</div>
                    {player.skillLevel !== undefined && <SnowWarSkillStars skillLevel={player.skillLevel} teamReference={teamReference} />}
                    {player.snowballHits !== undefined && (
                        <div className="snowwar-results__stat">
                            <span>{localizeWithFallback('snowwar.results.hits', 'HITS:')}</span>
                            <span>{player.snowballHits}</span>
                        </div>
                    )}
                    {player.kills !== undefined && (
                        <div className="snowwar-results__stat">
                            <span>{localizeWithFallback('snowwar.results.kills', "K.O.'s:")}</span>
                            <span>{player.kills}</span>
                        </div>
                    )}
                </div>
                <div className={`snowwar-results__player-score${rematched ? ' snowwar-results__player-score--rematch' : ''}`}>{player.score}</div>
            </div>
        );
    };

    const renderSpotlight = (player: SnowWarResultPlayer, titleKey: string, titleFallback: string) => {
        const teamId = teamOf(player);
        const teamReference = getOfficialTeamReference(teamId);

        return (
            <div className="snowwar-results__spotlight" style={{ color: SNOWWAR_TEAM_COLORS[teamReference] }}>
                <div className="snowwar-results__spotlight-title">{localizeWithFallback(titleKey, titleFallback)}</div>
                <div className={`snowwar-results__player-image snowwar-results__player-image--team-${teamReference}`}>{renderAvatar(player, teamId)}</div>
                <div className="snowwar-results__spotlight-name">{player.name}</div>
            </div>
        );
    };

    return (
        <div className="snowwar-results">
            <div className="snowwar-results__card">
                <div className="snowwar-results__title" style={{ color: headline.color }}>
                    {headline.type === 'tie'
                        ? localizeWithFallback('snowwar.result.tie', 'Game Was A Tie!')
                        : localizeWithFallback(headline.textKey, headline.textKey === 'snowwar.team_1_wins' ? 'Blue Team wins!' : 'Red Team wins!')}
                </div>

                <div className="snowwar-results__teams">
                    {orderedTeams.map((team) => {
                        const teamReference = getOfficialTeamReference(team.teamId);
                        return (
                            <div key={team.teamId} className={`snowwar-results__team snowwar-results__team--${teamReference}`}>
                                <div className="snowwar-results__team-score" style={{ color: SNOWWAR_TEAM_COLORS[teamReference] }}>
                                    {team.score}
                                </div>
                                <div className="snowwar-results__team-list">
                                    {[...team.players].sort((a, b) => b.score - a.score).map((player) => renderPlayer(player, team.teamId))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {(mostHits || mostKills) && (
                    <div className="snowwar-results__spotlights">
                        {mostHits && renderSpotlight(mostHits, 'snowwar.most_hits', 'Most Hits')}
                        {mostKills && renderSpotlight(mostKills, 'snowwar.most_kills', "Most K.O.'s")}
                    </div>
                )}

                <div className="snowwar-results__buttons">
                    <button type="button" className="snowwar-button" disabled={rematch.kind === 'please_wait'} onClick={onRematch}>
                        {rematch.kind === 'join_hc'
                            ? localizeWithFallback('catalog.vip.buy.title', 'Join HC!')
                            : localizeWithFallback(rematch.textKey, rematch.kind === 'rematch' ? 'Rematch (%seconds%)' : 'Please wait (%seconds%)').replace(
                                  '%seconds%',
                                  rematch.seconds.toString()
                              )}
                    </button>
                    {gamesLeft.showCounter && (
                        <button type="button" className="snowwar-results__status" onClick={openClubCenter}>
                            <span>
                                {localizeWithFallback('snowwar.results.games_left', 'Total Games Left:')}{' '}
                                <span className={`snowwar-results__games-left snowwar-results__games-left--${gamesLeft.counterTone}`}>{freeGamesLeft}</span>
                            </span>
                            <span className="snowwar-results__status-vip">
                                {localizeWithFallback('snowwar.results.get_more_games', 'Become a HC member for additional free daily games')}
                            </span>
                        </button>
                    )}
                </div>

                <button type="button" className="snowwar-results__leave" onClick={() => exitGame()}>
                    {localizeWithFallback('snowwar.exit.yes', 'Leave game')}
                </button>
            </div>
        </div>
    );
};
