import { FC, useEffect, useState } from 'react';
import { applySnowWarPlural, GetConfigurationValue, getLoopFrame, getOfficialTeamReference, GetSessionDataManager, LocalizeText } from '../../../../api';
import { SNOWWAR_AIR_ASSETS } from '../../../../assets/images/snowstorm/air';
import snowStormLogo from '../../../../assets/images/snowstorm/original/snowstorm_logo.png';
import { LayoutAvatarImageView } from '../../../../common';
import { useSnowWar } from '../../../../hooks';
import { SnowWarSkillStars } from './SnowWarSkillStars';
import { SnowWarStrokeText } from './SnowWarStrokeText';

// Red = team 0, Blue = team 1 (matches the arena's TEAM_COLORS ordering).
const TEAMS = [
    { id: 0, color: '#e64545', glow: 'rgba(230, 69, 69, 0.45)', nameKey: 'snowwar.team.red', nameFallback: 'Red Team', dir: 2 },
    { id: 1, color: '#4577e6', glow: 'rgba(69, 119, 230, 0.45)', nameKey: 'snowwar.team.blue', nameFallback: 'Blue Team', dir: 4 },
];

const localizeWithFallback = (key: string, fallback: string) =>
{
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

// AIR status texts with their plural / position parameters.
const localizeSnowWarCount = (key: string, parameter: string, value: number, fallback: string) =>
    applySnowWarPlural(localizeWithFallback(key, fallback), parameter, value);

// Official arenas use the bundled AIR arena_N_preview; the rest the image library.
const getArenaPreviewUrl = (arenaId: number, official: boolean) =>
{
    const bundled = official ? SNOWWAR_AIR_ASSETS[`arena_${arenaId}_preview`] : null;
    if (bundled) return bundled;

    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const baseUrl = imageLibraryUrl && !imageLibraryUrl.endsWith('/') ? `${imageLibraryUrl}/` : imageLibraryUrl;
    return `${baseUrl}snowstorm_client/arena_${official ? arenaId : 1}_preview.png`;
};

/**
 * Pre-match "getting ready" screen shown during the lobby countdown: the
 * waiting players already split into their Red / Blue teams, so everyone can
 * see the line-up forming before the arena splash takes over. Fed by the
 * server's provisional lobby-teams broadcast (re-sent each countdown second).
 */
export const SnowWarTeamsView: FC = () =>
{
    const { phase, lobbyTeams, lobbySeconds, queuePosition, queueSize, queueInfo, arenaQueuePosition, leaveQueue, selectArena, startEditing } = useSnowWar();
    const [now, setNow] = useState(() => Date.now());

    // AIR load_ spinner clock (100 ms per frame).
    useEffect(() =>
    {
        const interval = setInterval(() => setNow(Date.now()), 100);

        return () => clearInterval(interval);
    }, []);

    const spinner = SNOWWAR_AIR_ASSETS[`load_${getLoopFrame(now, 8)}`];

    const players = lobbyTeams?.players ?? [];
    const minPlayers = queueInfo?.minPlayers ?? 0;
    const ownUserId = GetSessionDataManager()?.userId ?? 0;
    const isLeader = lobbyTeams?.leaderUserId === ownUserId;

    const inLineUp = players.some(player => player.userId === ownUserId);

    // AIR GameLobbyWindowCtrl.updateDialog: the lobby countdown, else the
    // queue position when this player is not in the forming match, else
    // "waiting for more players" (with our X/min count below the minimum).
    const status = (phase === 'lobby')
        ? (lobbySeconds > 0
            ? localizeSnowWarCount('snowwar.lobby_game_start_countdown', 'seconds', lobbySeconds, '%seconds% seconds until the Storm!')
            : localizeWithFallback('snowwar.loading_arena', 'Going to the arena...'))
        : (arenaQueuePosition > 0)
            // Every arena is busy (AIR Game2InArenaQueue): full matches ahead.
            ? localizeSnowWarCount('snowwar.lobby_arena_queue_position', 'position', arenaQueuePosition, 'Position in queue: %position%')
        : (!inLineUp && (queuePosition > 0) && players.length)
            ? localizeSnowWarCount('snowwar.lobby_arena_queue_position', 'position', queuePosition, 'Position in queue: %position%')
            : (minPlayers > 1 && queueSize < minPlayers)
                ? `${localizeWithFallback('snowwar.lobby_waiting_for_more_players', 'Waiting for more players...')} (${queueSize}/${minPlayers})`
                : localizeWithFallback('snowwar.lobby_waiting_for_more_players', 'Waiting for more players...');

    return (
        <div className="snowwar-teams snowwar-air-backdrop">
            {queueInfo?.canEdit && (
                <div className="snowwar-teams__topbar">
                    <button type="button" className="snowwar-button snowwar-button--edit" onClick={() => startEditing()}>
                        {localizeWithFallback('snowwar.editor.build_custom', 'Build Custom Arena')}
                    </button>
                </div>
            )}
            <img className="snowwar-lobby__logo" src={snowStormLogo} alt="SnowStorm" />
            <div className="snowwar-teams__title">
                {localizeWithFallback('snowwar.teams.assembling', 'Assembling teams...')}
            </div>
            {/* AIR wait_text over wait_text_stroke (UbuntuThick, 0x1077ac). */}
            <div className="snowwar-teams__countdown"><SnowWarStrokeText text={status} /></div>

            {!!lobbyTeams?.arenas.length && (
                <div className="snowwar-teams__arenas">
                    <div className="snowwar-teams__arena-heading">
                        {isLeader
                            ? localizeWithFallback('snowwar.arena.choose', 'Choose the arena')
                            : localizeWithFallback('snowwar.arena.leader', 'The lobby leader chooses the arena')}
                    </div>
                    <div className="snowwar-teams__arena-list">
                        {lobbyTeams.arenas.map(arena =>
                        {
                            const selected = lobbyTeams.selectedArenaId === arena.id;
                            const name = arena.official
                                ? localizeWithFallback(`snowwar.field.name.${arena.id}`, localizeWithFallback(`gamecenter.snowwar.map.name.${arena.id}`, arena.name))
                                : arena.name;
                            return (
                                <button
                                    key={arena.id}
                                    type="button"
                                    className={`snowwar-teams__arena${selected ? ' snowwar-teams__arena--selected' : ''}`}
                                    disabled={!isLeader}
                                    aria-pressed={selected}
                                    onClick={() => selectArena(arena.id)}>
                                    <img src={getArenaPreviewUrl(arena.id, arena.official)} alt="" />
                                    {!arena.official && <small>{localizeWithFallback('snowwar.arena.custom', 'Custom')}</small>}
                                    <span>{name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="snowwar-teams__board">
                {TEAMS.map(team =>
                {
                    const roster = players.filter(player => (player.teamId % TEAMS.length) === team.id);
                    return (
                        <div key={team.id} className="snowwar-teams__panel" style={{ borderColor: team.color, boxShadow: `0 4px 18px ${team.glow}` }}>
                            <div className="snowwar-teams__panel-header" style={{ background: team.color }}>
                                <span>{localizeWithFallback(team.nameKey, team.nameFallback)}</span>
                                <span className="snowwar-teams__count">{roster.length}</span>
                            </div>
                            <div className="snowwar-teams__roster">
                                {roster.length === 0 && (
                                    <div className="snowwar-teams__empty">
                                        {spinner && <img alt="" src={spinner} />}
                                        <span>{localizeWithFallback('snowwar.waiting_players', 'Waiting for players')}</span>
                                    </div>
                                )}
                                {roster.map(player => (
                                    <div key={player.userId} className={`snowwar-teams__player${(player.userId === ownUserId) ? ' snowwar-teams__player--own' : ''}`}>
                                        <div className="snowwar-teams__avatar">
                                            <LayoutAvatarImageView figure={player.figure} gender={player.gender} direction={team.dir} scale={0.5} />
                                        </div>
                                        <div className="snowwar-teams__player-data">
                                            <div className="snowwar-teams__name">{player.name}</div>
                                            {(player.skillLevel !== undefined) && <SnowWarSkillStars skillLevel={player.skillLevel} teamReference={getOfficialTeamReference(team.id)} />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {spinner && <img alt="" className="snowwar-teams__spinner" src={spinner} />}

            {((phase === 'queued') || (phase === 'lobby')) && (
                <button type="button" className="snowwar-teams__cancel" onClick={() => leaveQueue()}>
                    {localizeWithFallback('generic.cancel', 'Cancel')}
                </button>
            )}
        </div>
    );
};
