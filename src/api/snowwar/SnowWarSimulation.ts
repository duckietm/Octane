import {
    calculateFlightPathWorld,
    direction360To8,
    getAngleFromComponents,
    getBaseVelX,
    getBaseVelY,
    INITIAL_HIT_POINTS,
    INVINCIBLE_AFTER_STUN_TIME,
    moveTowards,
    SNOWBALL_CREATE_TIME,
    STUN_TIME,
    SUBTURN_MOVEMENT,
    SUBTURN_MS,
    SUBTURNS_PER_TICK,
    TILE_SIZE_WORLD,
    tileToWorld,
    worldToTile,
} from './SnowWarMath';

/**
 * Client-side SnowWar world state.
 *
 * The server is authoritative: it streams one GameStatus packet per 150ms
 * turn containing 3 subturns of events, plus FullGameStatus snapshots on
 * demand. This class replays those events at the same 50ms/subturn cadence
 * using the same integer math as the server, and keeps the previous subturn
 * position of every mobile object so the view can interpolate between
 * subturns for smooth animation.
 */

export const SNOWWAR_OBJECT_AVATAR = 1;
export const SNOWWAR_OBJECT_SNOWBALL = 2;
export const SNOWWAR_OBJECT_MACHINE = 3;
export const SNOWWAR_OBJECT_TREE = 4;
export const SNOWWAR_OBJECT_PILE = 5;

export const SNOWWAR_EVENT_MOVE = 2;
export const SNOWWAR_EVENT_CREATE_SNOWBALL = 3;
export const SNOWWAR_EVENT_LAUNCH_SNOWBALL = 4;
export const SNOWWAR_EVENT_HIT = 5;
export const SNOWWAR_EVENT_MACHINE_ADD = 11;
export const SNOWWAR_EVENT_MACHINE_TRANSFER = 12;
export const SNOWWAR_EVENT_DELETE_OBJECT = 8;
export const SNOWWAR_EVENT_STUN = 9;
export const SNOWWAR_EVENT_RAY_GUN_BURST = 10;
export const SNOWWAR_EVENT_TREE_HIT = 13;

export const SNOWWAR_STATE_NORMAL = 0;
export const SNOWWAR_STATE_CREATING = 1;
export const SNOWWAR_STATE_STUNNED = 2;
export const SNOWWAR_STATE_INVINCIBLE = 3;

export interface SnowWarSimEvent {
    type: number;
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    p5: number;
}

export interface SnowWarAvatarState {
    objectId: number;
    userId: number;
    teamId: number;
    name: string;
    figure: string;
    gender: string;
    worldX: number;
    worldY: number;
    prevWorldX: number;
    prevWorldY: number;
    rotation: number;
    health: number;
    snowballCount: number;
    activityState: number;
    activityTimer: number;
    score: number;
    tileX: number;
    tileY: number;
    walkGoalX: number | null;
    walkGoalY: number | null;
    nextGoalX: number | null;
    nextGoalY: number | null;
    pathfindIterations: number;
}

export interface SnowWarSnowballState {
    objectId: number;
    throwerObjectId: number;
    locH: number;
    locV: number;
    prevLocH: number;
    prevLocV: number;
    height: number;
    prevHeight: number;
    direction: number;
    trajectory: number;
    timeToLive: number;
    parabolaOffset: number;
    planarVelocity: number;
}

export interface SnowWarMachineState {
    objectId: number;
    tileX: number;
    tileY: number;
    snowballCount: number;
}

export interface SnowWarTreeState {
    objectId: number;
    tileX: number;
    tileY: number;
    maximumHits: number;
    hits: number;
}

export interface SnowWarPileState {
    objectId: number;
    tileX: number;
    tileY: number;
    maxSnowballs: number;
    snowballCount: number;
}

export interface SnowWarImpactState {
    id: number;
    worldX: number;
    worldY: number;
    height: number;
    trajectory: number;
}

interface FullStatusObject {
    objectType: number;
    objectId: number;
    // avatar
    worldX?: number;
    worldY?: number;
    rotation?: number;
    health?: number;
    snowballCount?: number;
    activityTimer?: number;
    activityState?: number;
    score?: number;
    userId?: number;
    teamId?: number;
    name?: string;
    figure?: string;
    gender?: string;
    // snowball
    locH?: number;
    locV?: number;
    height?: number;
    direction?: number;
    trajectory?: number;
    timeToLive?: number;
    throwerObjectId?: number;
    parabolaOffset?: number;
    maximumHits?: number;
    hits?: number;
    maxSnowballs?: number;
}

const MAX_PATHFIND_ITERATIONS = 50;

// The custom Polaris full-status shape predates AIR's planar-velocity field.
// Live launch events carry enough data for the exact value; a mid-flight
// snapshot uses AIR's nominal coefficient until the next authoritative update.
const nominalPlanarVelocity = (trajectory: number): number =>
{
    if (trajectory === 0) return 2000;
    if (trajectory === 1) return 1788;
    return 1414;
};

// Same order as the server's SnowWarPathfinder.DIAGONAL_MOVE_POINTS - the
// greedy step tie-breaks by this order via stable sort on both sides.
const DIAGONAL_MOVE_POINTS: [number, number][] = [
    [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1],
];

const RAY_GUN_SPREAD: [number, number][] = [
    [0, 0], [0, 1], [1, 0], [-1, 1], [-1, -1], [1, -1], [1, 1],
];

export class SnowWarSimulation
{
    public readonly avatars: Map<number, SnowWarAvatarState> = new Map();
    public readonly snowballs: Map<number, SnowWarSnowballState> = new Map();
    public readonly machines: Map<number, SnowWarMachineState> = new Map();
    public readonly trees: Map<string, SnowWarTreeState> = new Map();
    public readonly piles: Map<string, SnowWarPileState> = new Map();

    private _impacts: SnowWarImpactState[] = [];
    private _impactId = 0;

    private _blockedTiles: boolean[][] = [];
    private _mapWidth = 0;
    private _mapHeight = 0;

    private _pendingSubturns: SnowWarSimEvent[][] = [];
    // Leavers removed once the subturns buffered before their exit have played
    // (atSubturn = subturnCount at which the removal is due).
    private _pendingRemovals: { objectId: number; atSubturn: number }[] = [];
    private _subturnClock = 0; // ms accumulated toward the next subturn
    private _subturnCount = 0; // total subturns processed (monotonic)
    private _lastAdvanceAt: number | null = null;

    private static readonly MAX_EXTRAPOLATION_ALPHA = 2;

    private static readonly TARGET_BUFFER_SUBTURNS = 2;

    private static readonly CATCHUP_BUFFER_SUBTURNS = 12;
    // Must outpace the server's 20 subturns/s even on a low-FPS tab, or the
    // buffer pins at the cap and the whole replica runs behind real time
    // (live symptom: throw sound now, ball/splash seconds later).
    private static readonly CATCHUP_RATE = 3;
    // Hard bound on both memory and standing delay: 18 subturns = 0.9s. AIR
    // keeps its replica pinned to the newest server turn; anything past this
    // is drained synchronously rather than replayed late.
    private static readonly MAX_BUFFERED_SUBTURNS = 18;

    public get subturnCount(): number
    {
        return this._subturnCount;
    }

    /**
     * Progress between the last processed subturn and the next. 0..1 during
     * normal playback; allowed up to MAX_EXTRAPOLATION_ALPHA while starved so
     * brief jitter reads as continued motion instead of a freeze.
     */
    public get interpolationAlpha(): number
    {
        return Math.min(SnowWarSimulation.MAX_EXTRAPOLATION_ALPHA, this._subturnClock / SUBTURN_MS);
    }

    public reset(): void
    {
        this.avatars.clear();
        this.snowballs.clear();
        this.machines.clear();
        this.trees.clear();
        this.piles.clear();
        this._impacts = [];
        this._pendingSubturns = [];
        this._pendingRemovals = [];
        this._subturnClock = 0;
        this._subturnCount = 0;
        this._lastAdvanceAt = null;
        this._blockedTiles = [];
        this._mapWidth = 0;
        this._mapHeight = 0;
    }

    /**
     * Build the walkability grid from LevelData - the mirror of the server's
     * SnowWarMap tile construction: heightmap x/X tiles are blocked, a tile is
     * blocked only when it carries a solid item (walkableHeight > 0) so walkable
     * props (rugs/tiles) stay walkable, and each machine occupies (x,y)..(x+2,y).
     */
    public setLevel(
        heightmapRows: string[],
        items: { x: number; y: number; rotation?: number; walkableHeight?: number; width?: number; length?: number }[],
        machines: { x: number; y: number }[]): void
    {
        this._mapHeight = heightmapRows.length;
        this._mapWidth = this._mapHeight > 0 ? heightmapRows[0].length : 0;
        this._blockedTiles = heightmapRows.map(row =>
        {
            const cells: boolean[] = [];
            for (let x = 0; x < this._mapWidth; x++)
            {
                const tile = x < row.length ? row.charAt(x) : 'x';
                cells.push(tile === 'x' || tile === 'X');
            }
            return cells;
        });

        const block = (x: number, y: number) =>
        {
            if (x >= 0 && y >= 0 && x < this._mapWidth && y < this._mapHeight) this._blockedTiles[y][x] = true;
        };

        for (const item of items)
        {
            if ((item.walkableHeight ?? 3) <= 0) continue;
            const swap = item.rotation === 2 || item.rotation === 6;
            const effW = Math.max(1, (swap ? item.length : item.width) ?? 1);
            const effL = Math.max(1, (swap ? item.width : item.length) ?? 1);
            for (let dx = 0; dx < effW; dx++)
                for (let dy = 0; dy < effL; dy++)
                    block(item.x + dx, item.y + dy);
        }
        for (const machine of machines)
        {
            block(machine.x, machine.y);
            block(machine.x + 1, machine.y);
            block(machine.x + 2, machine.y);
        }
    }

    /** Rebuild the whole world from a FullGameStatus snapshot. */
    public applyFullStatus(objects: FullStatusObject[]): void
    {
        this.avatars.clear();
        this.snowballs.clear();
        this.machines.clear();
        this.trees.clear();
        this.piles.clear();
        this._impacts = [];
        this._pendingSubturns = [];
        this._pendingRemovals = [];

        for (const object of objects)
        {
            switch (object.objectType)
            {
                case SNOWWAR_OBJECT_AVATAR:
                    this.avatars.set(object.objectId, {
                        objectId: object.objectId,
                        userId: object.userId ?? 0,
                        teamId: object.teamId ?? 0,
                        name: object.name ?? '',
                        figure: object.figure ?? '',
                        gender: object.gender ?? 'M',
                        worldX: object.worldX ?? 0,
                        worldY: object.worldY ?? 0,
                        prevWorldX: object.worldX ?? 0,
                        prevWorldY: object.worldY ?? 0,
                        rotation: object.rotation ?? 0,
                        health: object.health ?? INITIAL_HIT_POINTS,
                        snowballCount: object.snowballCount ?? 0,
                        activityState: object.activityState ?? SNOWWAR_STATE_NORMAL,
                        activityTimer: object.activityTimer ?? 0,
                        score: object.score ?? 0,
                        tileX: worldToTile(object.worldX ?? 0),
                        tileY: worldToTile(object.worldY ?? 0),
                        walkGoalX: null,
                        walkGoalY: null,
                        nextGoalX: null,
                        nextGoalY: null,
                        pathfindIterations: 0,
                    });
                    break;
                case SNOWWAR_OBJECT_SNOWBALL:
                    this.snowballs.set(object.objectId, {
                        objectId: object.objectId,
                        throwerObjectId: object.throwerObjectId ?? 0,
                        locH: object.locH ?? 0,
                        locV: object.locV ?? 0,
                        prevLocH: object.locH ?? 0,
                        prevLocV: object.locV ?? 0,
                        height: object.height ?? 0,
                        prevHeight: object.height ?? 0,
                        direction: object.direction ?? 0,
                        trajectory: object.trajectory ?? 1,
                        timeToLive: object.timeToLive ?? 0,
                        parabolaOffset: object.parabolaOffset ?? 0,
                        planarVelocity: nominalPlanarVelocity(object.trajectory ?? 1),
                    });
                    break;
                case SNOWWAR_OBJECT_MACHINE:
                    this.machines.set(object.objectId, {
                        objectId: object.objectId,
                        tileX: worldToTile(object.worldX ?? 0),
                        tileY: worldToTile(object.worldY ?? 0),
                        snowballCount: object.snowballCount ?? 0,
                    });
                    break;
                case SNOWWAR_OBJECT_TREE: {
                    const tileX = worldToTile(object.worldX ?? 0);
                    const tileY = worldToTile(object.worldY ?? 0);
                    this.trees.set(`${tileX},${tileY}`, {
                        objectId: object.objectId,
                        tileX,
                        tileY,
                        maximumHits: object.maximumHits ?? 3,
                        hits: object.hits ?? 0,
                    });
                    break;
                }
                case SNOWWAR_OBJECT_PILE: {
                    const tileX = worldToTile(object.worldX ?? 0);
                    const tileY = worldToTile(object.worldY ?? 0);
                    this.piles.set(`${tileX},${tileY}`, {
                        objectId: object.objectId,
                        tileX,
                        tileY,
                        maxSnowballs: object.maxSnowballs ?? 12,
                        snowballCount: object.snowballCount ?? 0,
                    });
                    break;
                }
            }
        }
    }

    /** Queue one server tick worth of subturn event lists. */
    public queueGameStatus(subturns: SnowWarSimEvent[][]): void
    {
        for (const subturn of subturns) this._pendingSubturns.push(subturn);

        // Empty/movement-only backlog can be collapsed safely, but never
        // consume projectile subturns here: queueGameStatus runs between
        // paints, so a short throw could otherwise be launched, flown and
        // deleted without ever reaching the DOM.
        // A hidden tab paints nothing (requestAnimationFrame stops), so there
        // the backlog is collapsed even with projectiles in flight; otherwise
        // it would grow for as long as the tab stays hidden and replay slowly
        // once it is shown again.
        const hidden = this.isPageHidden();

        while (this._pendingSubturns.length > SnowWarSimulation.MAX_BUFFERED_SUBTURNS)
        {
            if (!hidden && (this.snowballs.size > 0 || this.nextSubturnTouchesProjectile())) break;
            this.advanceSubturn();
        }
    }

    /** Overridable for tests. */
    public isPageHidden: () => boolean = () => (typeof document !== 'undefined') && !!document.hidden;

    /**
     * Back from a hidden tab: drop the buffered backlog down to the normal
     * target at once, and the splashes queued while nothing was painted.
     */
    public catchUp(): void
    {
        while (this._pendingSubturns.length > SnowWarSimulation.TARGET_BUFFER_SUBTURNS) this.advanceSubturn();

        this._impacts = [];
        this._lastAdvanceAt = null;
    }

    /**
     * A player left the arena: remove their avatar after the subturns already
     * buffered (which still carry their last moves, throws and hits) have
     * played, instead of at once.
     */
    public removeAvatarAfterBuffer(objectId: number): void
    {
        if (this._pendingSubturns.length === 0)
        {
            this.avatars.delete(objectId);
            return;
        }

        this._pendingRemovals.push({ objectId, atSubturn: this._subturnCount + this._pendingSubturns.length });
    }

    /** Advance real time; processes queued subturns at the AIR 50ms cadence. */
    public update(nowMs: number): void
    {
        if (this._lastAdvanceAt === null)
        {
            this._lastAdvanceAt = nowMs;
            return;
        }

        const delta = Math.min(500, Math.max(0, nowMs - this._lastAdvanceAt));
        this._lastAdvanceAt = nowMs;

        const buffered = this._pendingSubturns.length;
        const presentingProjectile = this.snowballs.size > 0 || this.nextSubturnTouchesProjectile();
        let rate = 1;
        if (!presentingProjectile)
        {
            if (buffered < SnowWarSimulation.TARGET_BUFFER_SUBTURNS) rate = 0.92;
            else if (buffered > SnowWarSimulation.CATCHUP_BUFFER_SUBTURNS) rate = SnowWarSimulation.CATCHUP_RATE;
            else if (buffered > SnowWarSimulation.TARGET_BUFFER_SUBTURNS + 3) rate = 1.08;
        }
        this._subturnClock += delta * rate;

        while (this._subturnClock >= SUBTURN_MS && this._pendingSubturns.length > 0)
        {
            this._subturnClock -= SUBTURN_MS;
            const projectileSubturn = this.snowballs.size > 0 || this.nextSubturnTouchesProjectile();
            this.advanceSubturn();

            if (projectileSubturn || this.snowballs.size > 0)
            {
                // A browser frame must be allowed to paint each projectile
                // step. Discard catch-up credit for this frame so the next
                // AIR subturn is presented after another real 50 ms instead
                // of being consumed by this same update() call.
                this._subturnClock = 0;
                break;
            }
        }

        const maxClock = SUBTURN_MS * SnowWarSimulation.MAX_EXTRAPOLATION_ALPHA;
        if (this._pendingSubturns.length === 0 && this._subturnClock > maxClock)
        {
            this._subturnClock = maxClock;
        }
    }

    /**
     * Fired when a server event is applied during replay. Sounds hang off this
     * (AIR plays them from the engine replay too) so audio stays in sync with
     * the rendered state instead of the packet arrival time.
     */
    public onEventApplied: ((event: SnowWarSimEvent) => void) | null = null;

    private nextSubturnTouchesProjectile(): boolean
    {
        const next = this._pendingSubturns[0];
        if (!next) return false;

        return next.some(event =>
            event.type === SNOWWAR_EVENT_LAUNCH_SNOWBALL
            || event.type === SNOWWAR_EVENT_RAY_GUN_BURST
            || event.type === SNOWWAR_EVENT_DELETE_OBJECT);
    }

    private advanceSubturn(): void
    {
        const events = this._pendingSubturns.shift() ?? [];
        this._subturnCount++;

        for (const event of events)
        {
            this.applyEvent(event);
            this.onEventApplied?.(event);
        }

        for (const avatar of this.avatars.values()) this.stepAvatar(avatar);
        for (const ball of [...this.snowballs.values()]) this.stepSnowball(ball);

        if (this._pendingRemovals.length)
        {
            this._pendingRemovals = this._pendingRemovals.filter(removal =>
            {
                if (removal.atSubturn > this._subturnCount) return true;
                this.avatars.delete(removal.objectId);
                return false;
            });
        }
    }

    private applyEvent(event: SnowWarSimEvent): void
    {
        switch (event.type)
        {
            case SNOWWAR_EVENT_MOVE: {
                const avatar = this.avatars.get(event.p1);
                if (!avatar) return;
                if (avatar.activityState === SNOWWAR_STATE_CREATING)
                {
                    avatar.activityState = SNOWWAR_STATE_NORMAL;
                    avatar.activityTimer = 0;
                }
                const goalTileX = worldToTile(event.p2);
                const goalTileY = worldToTile(event.p3);
                if (avatar.walkGoalX !== goalTileX || avatar.walkGoalY !== goalTileY)
                {
                    avatar.walkGoalX = goalTileX;
                    avatar.walkGoalY = goalTileY;
                    avatar.pathfindIterations = 0;
                }
                return;
            }
            case SNOWWAR_EVENT_CREATE_SNOWBALL: {
                const avatar = this.avatars.get(event.p1);
                if (!avatar) return;
                avatar.activityState = SNOWWAR_STATE_CREATING;
                avatar.activityTimer = SNOWBALL_CREATE_TIME;
                this.stopAvatarWalk(avatar);
                return;
            }
            case SNOWWAR_EVENT_LAUNCH_SNOWBALL: {
                this.launchSnowball(event.p1, event.p2, event.p3, event.p4, event.p5, true, true);
                return;
            }
            case SNOWWAR_EVENT_RAY_GUN_BURST: {
                RAY_GUN_SPREAD.forEach(([dx, dy], index) => this.launchSnowball(
                    event.p1 + index,
                    event.p2,
                    event.p3 + (dx * TILE_SIZE_WORLD),
                    event.p4 + (dy * TILE_SIZE_WORLD),
                    event.p5,
                    index === 0,
                    false));
                return;
            }
            case SNOWWAR_EVENT_HIT: {
                const target = this.avatars.get(event.p2);
                const thrower = this.avatars.get(event.p1);
                if (target)
                {
                    target.health = Math.max(0, target.health - 1);
                }
                if (thrower) thrower.score += 1;
                return;
            }
            case SNOWWAR_EVENT_MACHINE_ADD: {
                const machine = this.machines.get(event.p1);
                if (machine) machine.snowballCount = Math.min(5, machine.snowballCount + 1);
                return;
            }
            case SNOWWAR_EVENT_MACHINE_TRANSFER: {
                const avatar = this.avatars.get(event.p1);
                const machine = this.machines.get(event.p2);
                const pile = [...this.piles.values()].find(candidate => candidate.objectId === event.p2);
                if (machine) machine.snowballCount = Math.max(0, machine.snowballCount - 1);
                if (pile) pile.snowballCount = Math.max(0, pile.snowballCount - 1);
                if (avatar) avatar.snowballCount = Math.min(5, avatar.snowballCount + 1);
                return;
            }
            case SNOWWAR_EVENT_DELETE_OBJECT: {
                this.snowballs.delete(event.p1);
                this._impacts.push({
                    id: ++this._impactId,
                    worldX: event.p2,
                    worldY: event.p3,
                    height: event.p4,
                    trajectory: event.p5,
                });
                return;
            }
            case SNOWWAR_EVENT_STUN: {
                const target = this.avatars.get(event.p1);
                const thrower = this.avatars.get(event.p2);
                if (target)
                {
                    target.activityState = SNOWWAR_STATE_STUNNED;
                    target.activityTimer = STUN_TIME;
                    target.health = 0;
                    target.rotation = (direction360To8(event.p3) + 4) % 8;
                    this.stopAvatarWalk(target);
                }
                if (thrower) thrower.score += 5;
                return;
            }
            case SNOWWAR_EVENT_TREE_HIT: {
                const key = `${event.p1},${event.p2}`;
                const tree = this.trees.get(key);
                if (tree) tree.hits = event.p3;
                return;
            }
        }
    }

    public drainImpacts(): SnowWarImpactState[]
    {
        return this._impacts.splice(0);
    }

    private launchSnowball(
        objectId: number,
        throwerObjectId: number,
        targetX: number,
        targetY: number,
        trajectory: number,
        turnsThrower: boolean,
        consumeAmmo: boolean): void
    {
        const thrower = this.avatars.get(throwerObjectId);
        const startX = thrower ? thrower.worldX : targetX;
        const startY = thrower ? thrower.worldY : targetY;
        const flight = calculateFlightPathWorld(startX, startY, targetX, targetY, trajectory);

        if (thrower && turnsThrower)
        {
            thrower.rotation = direction360To8(getAngleFromComponents(targetX - thrower.worldX, targetY - thrower.worldY));
            this.stopAvatarWalk(thrower);
        }

        // Only hand throws spend carried snowballs; the server never charges
        // ammo for ray gun bursts, so the replica must not either.
        if (thrower && consumeAmmo)
        {
            thrower.snowballCount = Math.max(0, thrower.snowballCount - 1);
        }

        this.snowballs.set(objectId, {
            objectId,
            throwerObjectId,
            locH: startX,
            locV: startY,
            prevLocH: startX,
            prevLocV: startY,
            height: 3000,
            prevHeight: 3000,
            direction: flight.direction,
            trajectory: flight.trajectory,
            timeToLive: flight.timeToLive,
            parabolaOffset: flight.parabolaOffset,
            planarVelocity: flight.planarVelocity,
        });
    }

    private stepAvatar(avatar: SnowWarAvatarState): void
    {
        avatar.prevWorldX = avatar.worldX;
        avatar.prevWorldY = avatar.worldY;

        if (avatar.activityTimer > 0)
        {
            avatar.activityTimer--;

            if (avatar.activityTimer === 0)
            {
                switch (avatar.activityState)
                {
                    case SNOWWAR_STATE_CREATING:
                        avatar.activityState = SNOWWAR_STATE_NORMAL;
                        avatar.snowballCount = Math.min(5, avatar.snowballCount + 1);
                        break;
                    case SNOWWAR_STATE_STUNNED:
                        avatar.activityState = SNOWWAR_STATE_INVINCIBLE;
                        avatar.activityTimer = INVINCIBLE_AFTER_STUN_TIME;
                        avatar.health = INITIAL_HIT_POINTS;
                        break;
                    case SNOWWAR_STATE_INVINCIBLE:
                        avatar.activityState = SNOWWAR_STATE_NORMAL;
                        break;
                }
            }
        }

        if (avatar.walkGoalX === null || avatar.walkGoalY === null) return;
        if (avatar.activityState !== SNOWWAR_STATE_NORMAL && avatar.activityState !== SNOWWAR_STATE_INVINCIBLE) return;

        const targetWorldX = tileToWorld(avatar.walkGoalX);
        const targetWorldY = tileToWorld(avatar.walkGoalY);

        if (avatar.worldX === targetWorldX && avatar.worldY === targetWorldY)
        {
            this.stopAvatarWalk(avatar);
            return;
        }

        if (avatar.nextGoalX === null || avatar.nextGoalY === null)
        {
            avatar.pathfindIterations++;
            if (avatar.pathfindIterations > MAX_PATHFIND_ITERATIONS)
            {
                this.stopAvatarWalk(avatar);
                return;
            }

            const next = this.getNextDirection(avatar);
            if (!next)
            {
                this.stopAvatarWalk(avatar);
                return;
            }

            avatar.nextGoalX = next.x;
            avatar.nextGoalY = next.y;
            avatar.rotation = direction360To8(getAngleFromComponents(
                tileToWorld(next.x) - avatar.worldX, tileToWorld(next.y) - avatar.worldY));
        }

        const nextWorldX = tileToWorld(avatar.nextGoalX);
        const nextWorldY = tileToWorld(avatar.nextGoalY);

        avatar.worldX = moveTowards(avatar.worldX, nextWorldX, SUBTURN_MOVEMENT);
        avatar.worldY = moveTowards(avatar.worldY, nextWorldY, SUBTURN_MOVEMENT);

        avatar.tileX = worldToTile(avatar.worldX);
        avatar.tileY = worldToTile(avatar.worldY);

        if (avatar.worldX === nextWorldX && avatar.worldY === nextWorldY)
        {
            avatar.nextGoalX = null;
            avatar.nextGoalY = null;
        }

        if (avatar.worldX === targetWorldX && avatar.worldY === targetWorldY)
        {
            this.stopAvatarWalk(avatar);
        }
    }

    private stopAvatarWalk(avatar: SnowWarAvatarState): void
    {
        avatar.walkGoalX = null;
        avatar.walkGoalY = null;
        avatar.nextGoalX = null;
        avatar.nextGoalY = null;
    }

    /** Mirror of the server's SnowWarPathfinder.getNextDirection. */
    private getNextDirection(avatar: SnowWarAvatarState): { x: number; y: number } | null
    {
        if (avatar.walkGoalX === null || avatar.walkGoalY === null) return null;

        const positions: { x: number; y: number }[] = [];

        for (const [dx, dy] of DIAGONAL_MOVE_POINTS)
        {
            const x = avatar.tileX + dx;
            const y = avatar.tileY + dy;
            if (dx !== 0 && dy !== 0
                && !this.isValidStep(avatar, avatar.tileX + dx, avatar.tileY)
                && !this.isValidStep(avatar, avatar.tileX, avatar.tileY + dy)) continue;
            if (this.isValidStep(avatar, x, y)) positions.push({ x, y });
        }

        if (!positions.length) return null;

        const goalX = avatar.walkGoalX;
        const goalY = avatar.walkGoalY;
        const distanceSquared = (p: { x: number; y: number }) =>
            ((p.x - goalX) * (p.x - goalX)) + ((p.y - goalY) * (p.y - goalY));

        positions.sort((a, b) => distanceSquared(a) - distanceSquared(b));

        if (distanceSquared(positions[0]) >= distanceSquared({ x: avatar.tileX, y: avatar.tileY })) return null;

        return positions[0];
    }

    /** Mirror of the server's SnowWarPathfinder.isValidTile. */
    private isValidStep(avatar: SnowWarAvatarState, x: number, y: number): boolean
    {
        if (!this.isTileWalkable(x, y)) return false;

        for (const other of this.avatars.values())
        {
            if (other.objectId === avatar.objectId) continue;

            if (other.nextGoalX !== null && other.nextGoalY !== null)
            {
                if (other.nextGoalX === x && other.nextGoalY === y) return false;
            }
            else if (other.tileX === x && other.tileY === y)
            {
                return false;
            }
        }

        return true;
    }

    private isTileWalkable(x: number, y: number): boolean
    {
        if (!this._mapHeight) return true;
        if (x < 0 || y < 0 || x >= this._mapWidth || y >= this._mapHeight) return false;
        return !this._blockedTiles[y][x];
    }

    private stepSnowball(ball: SnowWarSnowballState): void
    {
        ball.prevLocH = ball.locH;
        ball.prevLocV = ball.locV;
        ball.prevHeight = ball.height;

        ball.timeToLive--;

        ball.locH = (ball.locH + (((getBaseVelX(ball.direction) * ball.planarVelocity) / 255) | 0)) | 0;
        ball.locV = (ball.locV + (((getBaseVelY(ball.direction) * ball.planarVelocity) / 255) | 0)) | 0;

        let distanceFromPeak = ball.timeToLive - ball.parabolaOffset;
        let heightMultiplier: number;
        switch (ball.trajectory)
        {
            case 0:
                if (ball.timeToLive > 3) distanceFromPeak = 3 - ball.parabolaOffset;
                heightMultiplier = 10;
                break;
            case 1:
                heightMultiplier = 25;
                break;
            default:
                heightMultiplier = 50;
                break;
        }

        ball.height = (3000 + heightMultiplier
            * ((ball.parabolaOffset * ball.parabolaOffset) - (distanceFromPeak * distanceFromPeak))) | 0;
        if (ball.trajectory === 0) ball.height = Math.min(ball.height, 3000);

        if (ball.height < 0) this.snowballs.delete(ball.objectId);
    }

    public getAvatarByUserId(userId: number): SnowWarAvatarState | null
    {
        for (const avatar of this.avatars.values())
        {
            if (avatar.userId === userId) return avatar;
        }
        return null;
    }
}
