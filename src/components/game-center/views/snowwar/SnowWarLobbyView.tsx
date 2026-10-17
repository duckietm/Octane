import { GetRoomEngine, Vector3d } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { getLoopFrame, getOfficialTeamReference, GetSessionDataManager, LocalizeText } from '../../../../api';
import { SNOWWAR_AIR_ASSETS } from '../../../../assets/images/snowstorm/air';
import { LayoutAvatarImageView } from '../../../../common';
import { useSnowWar } from '../../../../hooks';
import { getSnowWarFigure } from './SnowWarAvatarView';
import { SnowWarSkillStars } from './SnowWarSkillStars';
import { SnowWarStrokeText } from './SnowWarStrokeText';
import { BaseButton } from '../../../../common/BaseButton';

const TEAM_COLORS = ['#e64545', '#4577e6', '#3fb550', '#e6c245'];

// AIR ships arena_N_preview bitmaps for the official arenas.
const OFFICIAL_PREVIEWS = new Set([ 8, 9, 10, 11, 12 ]);

const localizeWithFallback = (key: string, fallback: string) =>
{
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

/**
 * AIR GameLoadingViewController: the snowwar_ending window over the sky
 * backdrop with "Get ready!", the arena preview and name, both teams' rows
 * (team-shirted avatar, name, skill stars, a load_ spinner each; your own row
 * on green_square) and "Going to the arena..." with the main spinner, plus
 * the leave link. Custom arenas have no AIR preview, so they keep our mini
 * map of the floor and spawns. Shown while the arena loads (phase 'loading').
 */
export const SnowWarLobbyView: FC = () =>
{
    const { phase, levelData, lobbyTeams, simulation, exitGame } = useSnowWar();
    const previewRef = useRef<HTMLCanvasElement>(null);
    const [ now, setNow ] = useState(() => Date.now());

    // Spinner clock (AIR SnowWarAnimatedWindowElement, 100 ms per frame).
    useEffect(() =>
    {
        const interval = setInterval(() => setNow(Date.now()), 100);

        return () => clearInterval(interval);
    }, []);

    // The level data only arrives with the stage start; until then the lobby
    // line-up is the match roster (same players, same index % 2 team split).
    const players: { key: number; userId: number; teamId: number; name: string; figure: string; gender: string }[] = levelData?.players?.length
        ? levelData.players.map(player => ({ key: player.objectId, userId: player.userId, teamId: player.teamId, name: player.name, figure: player.figure, gender: player.gender }))
        : (lobbyTeams?.players ?? []).map(player => ({ key: player.userId, userId: player.userId, teamId: player.teamId, name: player.name, figure: player.figure, gender: player.gender }));
    const mapId = levelData?.mapId ?? lobbyTeams?.selectedArenaId ?? 0;
    const lobbyArena = lobbyTeams?.arenas?.find(arena => arena.id === mapId);
    const ownUserId = GetSessionDataManager()?.userId ?? 0;
    const skillLevels = new Map((lobbyTeams?.players ?? []).map(player => [ player.userId, player.skillLevel ]));
    const officialPreview = OFFICIAL_PREVIEWS.has(mapId) && (lobbyArena?.official ?? true) ? (SNOWWAR_AIR_ASSETS[`arena_${ mapId }_preview`] ?? null) : null;
    // AIR lays team 1 (blue) on the left and team 2 (red) on the right.
    const teamIds = [ ...new Set(players.map(player => player.teamId)) ].sort((a, b) => getOfficialTeamReference(a) - getOfficialTeamReference(b));

    // Mini top-down arena preview: draw the heightmap tiles, then a coloured dot
    // per avatar at its spawn tile so players see where they'll start.
    useEffect(() =>
    {
        const canvas = previewRef.current;
        if (!canvas || !levelData?.heightmapRows?.length) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const rows = levelData.heightmapRows;
        const height = rows.length;
        // Base iso projection (unit tile). We then auto-fit everything - all
        // tiles AND every spawn dot - into the canvas, so a spawn near the edge
        // (or on a tile we don't draw) can never fall outside the preview.
        const BW = 12;
        const BH = 6;
        const iso = (tx: number, ty: number) => ({ x: (tx - ty) * BW, y: (tx + ty) * BH });

        const spawns = [...simulation.avatars.values()];

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const bound = (px: number, py: number) =>
        {
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
        };
        for (let y = 0; y < height; y++)
        {
            for (let x = 0; x < rows[y].length; x++)
            {
                const cell = rows[y][x];
                if (cell === ' ' || cell === 'x' || cell === 'X') continue;
                const p = iso(x, y);
                bound(p.x - BW, p.y); bound(p.x + BW, p.y); bound(p.x, p.y - BH); bound(p.x, p.y + BH);
            }
        }
        for (const avatar of spawns)
        {
            const p = iso(avatar.tileX, avatar.tileY);
            bound(p.x - 4, p.y - 8); bound(p.x + 4, p.y + 2);
        }
        if (minX === Infinity) { minX = maxX = minY = maxY = 0; }

        const pad = 10;
        const contentW = Math.max(maxX - minX, 1);
        const contentH = Math.max(maxY - minY, 1);
        const scale = Math.min((canvas.width - pad * 2) / contentW, (canvas.height - pad * 2) / contentH, 1);
        const offX = (canvas.width - contentW * scale) / 2 - minX * scale;
        const offY = (canvas.height - contentH * scale) / 2 - minY * scale;
        const sx = (px: number) => offX + px * scale;
        const sy = (py: number) => offY + py * scale;

        for (let y = 0; y < height; y++)
        {
            for (let x = 0; x < rows[y].length; x++)
            {
                const cell = rows[y][x];
                if (cell === ' ' || cell === 'x' || cell === 'X') continue;
                const p = iso(x, y);
                ctx.beginPath();
                ctx.moveTo(sx(p.x), sy(p.y - BH));
                ctx.lineTo(sx(p.x + BW), sy(p.y));
                ctx.lineTo(sx(p.x), sy(p.y + BH));
                ctx.lineTo(sx(p.x - BW), sy(p.y));
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(150, 190, 220, 0.9)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        for (const avatar of spawns)
        {
            const p = iso(avatar.tileX, avatar.tileY);
            ctx.beginPath();
            ctx.arc(sx(p.x), sy(p.y) - 2, 4, 0, Math.PI * 2);
            ctx.fillStyle = TEAM_COLORS[avatar.teamId % TEAM_COLORS.length];
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }, [levelData, phase, simulation, officialPreview]);

    // Warm the renderer's furni cache during the splash: every hotel-furni type
    // in the arena is loaded now so it renders instantly the moment the arena
    // takes over, instead of popping in blank on the first game frame. Classic
    // props (canvas-drawn) and the ad backdrop have no furnidata, so they're
    // skipped naturally.
    useEffect(() =>
    {
        const items = levelData?.items;
        if (!items?.length) return;
        const engine = GetRoomEngine?.();
        const session = GetSessionDataManager?.();
        if (!engine || !session) return;

        const listener = { imageReady: () => {}, imageFailed: () => {} };
        const warmed = new Set<number>();
        for (const item of items)
        {
            const furniData = session.getFloorItemDataByName?.(item.name);
            if (!furniData || warmed.has(furniData.id)) continue;
            warmed.add(furniData.id);
            try
            {
                engine.getFurnitureFloorImage(furniData.id, new Vector3d(item.rotation ?? 2), 64, listener, 0, '', item.state ?? -1);
            }
            catch
            {
                // Renderer not ready for this type yet - the arena will load it.
            }
        }
    }, [levelData]);

    const arenaName = !mapId
        ? ''
        : (lobbyArena && !lobbyArena.official)
            ? lobbyArena.name
            : localizeWithFallback(`snowwar.field.name.${ mapId }`, localizeWithFallback(`gamecenter.snowwar.map.name.${ mapId }`, lobbyArena?.name ?? `Arena ${ mapId }`));
    const spinner = SNOWWAR_AIR_ASSETS[`load_${ getLoopFrame(now, 8) }`];

    const renderPlayer = (player: typeof players[number]) =>
    {
        const teamReference = getOfficialTeamReference(player.teamId);
        const own = (player.userId === ownUserId);
        const skillLevel = skillLevels.get(player.userId);

        return (
            <div key={ player.key } className={ `snowwar-results__player snowwar-results__player--team-${ teamReference }` }>
                <div className={ `snowwar-results__player-image snowwar-results__player-image--team-${ teamReference }${ own ? ' snowwar-results__player-image--own' : '' }` }>
                    <LayoutAvatarImageView direction={ (teamReference === 1) ? 2 : 4 } figure={ getSnowWarFigure(player.figure, player.teamId) } gender={ player.gender } scale={ 0.5 } />
                </div>
                <div className="snowwar-results__player-data">
                    <div className="snowwar-results__player-name">{ player.name }</div>
                    { (skillLevel !== undefined) && <SnowWarSkillStars skillLevel={ skillLevel } teamReference={ teamReference } /> }
                </div>
                <div className="snowwar-results__player-score">
                    { spinner && <img alt="" className="snowwar-loading__spinner" src={ spinner } /> }
                </div>
            </div>
        );
    };

    return (
        <div className="snowwar-lobby snowwar-air-backdrop">
            <div className="snowwar-results__card snowwar-loading">
                <div className="snowwar-results__title snowwar-loading__title"><SnowWarStrokeText text={ localizeWithFallback('snowwar.loading.title', 'Get ready!') } /></div>

                { !!mapId && (
                    <div className="snowwar-loading__arena">
                        { officialPreview && <img alt="" className="snowwar-loading__preview" src={ officialPreview } /> }
                        { !officialPreview && levelData && <canvas ref={ previewRef } className="snowwar-lobby__preview" height={ 120 } width={ 220 } /> }
                        <div className="snowwar-loading__arena-name">{ arenaName }</div>
                    </div>
                ) }

                <div className="snowwar-results__teams">
                    { teamIds.map(teamId => (
                        <div key={ teamId } className={ `snowwar-results__team snowwar-results__team--${ getOfficialTeamReference(teamId) }` }>
                            <div className="snowwar-results__team-list">
                                { players.filter(player => player.teamId === teamId).map(renderPlayer) }
                            </div>
                        </div>
                    )) }
                </div>

                <div className="snowwar-loading__status">
                    { spinner && <img alt="" src={ spinner } /> }
                    <SnowWarStrokeText text={ localizeWithFallback('snowwar.loading_arena', 'Going to the arena...') } />
                </div>

                <BaseButton className="snowwar-results__leave" type="button" onClick={ () => exitGame() }>
                    { localizeWithFallback('snowwar.leave_game', 'Leave game') }
                </BaseButton>
            </div>
        </div>
    );
};
