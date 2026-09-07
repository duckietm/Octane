import { GetRoomEngine, Vector3d } from '@octane/renderer';
import { FC, useEffect, useRef } from 'react';
import { GetSessionDataManager, LocalizeText } from '../../../../api';
import snowStormLogo from '../../../../assets/images/snowstorm/original/snowstorm_logo.png';
import { LayoutAvatarImageView } from '../../../../common';
import { useSnowWar } from '../../../../hooks';

const TEAM_COLORS = ['#e64545', '#4577e6', '#3fb550', '#e6c245'];

const localizeWithFallback = (key: string, fallback: string) =>
{
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

/**
 * "Get ready!" pre-match splash: the SnowStorm logo, both teams' players, a
 * mini arena preview showing where everyone spawns, and a spinner. Shown from
 * the lobby countdown until the arena takes over (phase 'playing').
 */
export const SnowWarLobbyView: FC = () =>
{
    const { phase, levelData, lobbySeconds, simulation } = useSnowWar();
    const previewRef = useRef<HTMLCanvasElement>(null);

    const players = levelData?.players ?? [];
    const teamCount = Math.max(levelData?.teamCount ?? 2, 2);
    // Players grouped by team; team 0 sits on the left column, 1 on the right,
    // extra teams alternate sides.
    const teams: { players: typeof players; side: 'left' | 'right' }[] = [];
    for (let t = 0; t < teamCount; t++)
    {
        teams.push({ players: players.filter(player => player.teamId === t), side: t % 2 === 0 ? 'left' : 'right' });
    }
    const leftTeams = teams.filter(team => team.side === 'left');
    const rightTeams = teams.filter(team => team.side === 'right');

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
    }, [levelData, phase, simulation]);

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

    const arenaName = levelData
        ? localizeWithFallback(`gamecenter.snowwar.map.name.${levelData.mapId}`, `Arena ${levelData.mapId}`)
        : '';

    const renderPlayer = (player: typeof players[number], side: 'left' | 'right') => (
        <div key={player.objectId} className="snowwar-lobby__player" style={{ borderColor: TEAM_COLORS[player.teamId % TEAM_COLORS.length] }}>
            <div className="snowwar-lobby__avatar">
                <LayoutAvatarImageView figure={player.figure} gender={player.gender} direction={side === 'left' ? 4 : 2} scale={0.5} />
            </div>
            <div className="snowwar-lobby__name" style={{ color: TEAM_COLORS[player.teamId % TEAM_COLORS.length] }}>{player.name}</div>
        </div>
    );

    return (
        <div className="snowwar-lobby">
            <img className="snowwar-lobby__logo" src={snowStormLogo} alt="SnowStorm" />
            <div className="snowwar-lobby__ready">{localizeWithFallback('snowwar.lobby.ready', 'Get ready!')}</div>

            <div className="snowwar-lobby__stage">
                <div className="snowwar-lobby__column snowwar-lobby__column--left">
                    {leftTeams.flatMap(team => team.players).map(player => renderPlayer(player, 'left'))}
                </div>

                <div className="snowwar-lobby__center">
                    <div className="snowwar-lobby__status">
                        {phase === 'lobby' && lobbySeconds > 0
                            ? localizeWithFallback('snowwar.lobby.starting', 'Game starts in %seconds%s...').replace('%seconds%', lobbySeconds.toString())
                            : localizeWithFallback('snowwar.lobby.going', 'Going to the arena...')}
                    </div>
                    {levelData && (
                        <>
                            <canvas ref={previewRef} className="snowwar-lobby__preview" width={340} height={200} />
                            <div className="snowwar-lobby__arena-name">{arenaName}</div>
                        </>
                    )}
                    <div className="snowwar-lobby__spinner" />
                </div>

                <div className="snowwar-lobby__column snowwar-lobby__column--right">
                    {rightTeams.flatMap(team => team.players).map(player => renderPlayer(player, 'right'))}
                </div>
            </div>
        </div>
    );
};
