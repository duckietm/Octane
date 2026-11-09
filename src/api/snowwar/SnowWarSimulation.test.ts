import { beforeEach, describe, expect, it } from 'vitest';
import { SUBTURN_MS, SUBTURNS_PER_TICK, tileToWorld } from './SnowWarMath';
import {
    SNOWWAR_EVENT_CREATE_SNOWBALL,
    SNOWWAR_EVENT_DELETE_OBJECT,
    SNOWWAR_EVENT_HIT,
    SNOWWAR_EVENT_LAUNCH_SNOWBALL,
    SNOWWAR_EVENT_MACHINE_TRANSFER,
    SNOWWAR_EVENT_MOVE,
    SNOWWAR_EVENT_RAY_GUN_BURST,
    SNOWWAR_EVENT_STUN,
    SNOWWAR_EVENT_TREE_HIT,
    SNOWWAR_OBJECT_AVATAR,
    SNOWWAR_OBJECT_MACHINE,
    SNOWWAR_OBJECT_PILE,
    SNOWWAR_OBJECT_TREE,
    SNOWWAR_STATE_CREATING,
    SNOWWAR_STATE_INVINCIBLE,
    SNOWWAR_STATE_NORMAL,
    SNOWWAR_STATE_STUNNED,
    SnowWarSimEvent,
    SnowWarSimulation,
} from './SnowWarSimulation';

const avatarObject = (objectId: number, userId: number, tileX: number, tileY: number) => ({
    objectType: SNOWWAR_OBJECT_AVATAR,
    objectId,
    userId,
    teamId: objectId % 2,
    name: `user${userId}`,
    figure: 'hd-180-1',
    gender: 'M',
    worldX: tileToWorld(tileX),
    worldY: tileToWorld(tileY),
    rotation: 0,
    health: 5,
    snowballCount: 5,
    activityTimer: 0,
    activityState: SNOWWAR_STATE_NORMAL,
    score: 0,
});

const event = (type: number, p1 = 0, p2 = 0, p3 = 0, p4 = 0, p5 = 0): SnowWarSimEvent =>
    ({ type, p1, p2, p3, p4, p5 });

describe('SnowWarSimulation', () =>
{
    let sim: SnowWarSimulation;
    let clock: number;

    /** Queue one AIR server turn and pump real time until its three subturns have played. */
    const applyTick = (events: SnowWarSimEvent[] = []) =>
    {
        const lists = Array.from({ length: SUBTURNS_PER_TICK }, (_, index) => index === 0 ? events : []);
        sim.queueGameStatus(lists);
        const target = sim.subturnCount + SUBTURNS_PER_TICK;
        let guard = 0;
        while (sim.subturnCount < target && guard++ < 100)
        {
            clock += SUBTURN_MS;
            sim.update(clock);
        }
    };

    beforeEach(() =>
    {
        sim = new SnowWarSimulation();
        clock = 0;
        sim.applyFullStatus([
            avatarObject(1, 100, 5, 5),
            avatarObject(2, 200, 10, 5),
            {
                objectType: SNOWWAR_OBJECT_MACHINE,
                objectId: 50,
                worldX: tileToWorld(8),
                worldY: tileToWorld(2),
                snowballCount: 3,
            },
            {
                objectType: SNOWWAR_OBJECT_TREE,
                objectId: 60,
                worldX: tileToWorld(9),
                worldY: tileToWorld(9),
                maximumHits: 3,
                hits: 0,
            },
            {
                objectType: SNOWWAR_OBJECT_PILE,
                objectId: 61,
                worldX: tileToWorld(4),
                worldY: tileToWorld(6),
                maxSnowballs: 12,
                snowballCount: 12,
            },
        ]);
        sim.update(clock); // prime the clock
    });

    it('applies a full status snapshot', () =>
    {
        expect(sim.avatars.size).toBe(2);
        expect(sim.machines.get(50)?.tileX).toBe(8);
        expect(sim.getAvatarByUserId(200)?.objectId).toBe(2);
        expect(sim.trees.get('9,9')?.hits).toBe(0);
        expect(sim.piles.get('4,6')?.snowballCount).toBe(12);
    });

    it('moves an avatar toward its move target at the AIR 534 units per subturn', () =>
    {
        const startX = tileToWorld(5);
        applyTick([event(SNOWWAR_EVENT_MOVE, 1, tileToWorld(7), tileToWorld(5))]);

        const avatar = sim.avatars.get(1);
        // One AIR turn advances exactly three 534-unit subturns.
        expect(avatar.worldX).toBe(startX + SUBTURNS_PER_TICK * 534);
        expect(avatar.prevWorldX).toBe(startX + (SUBTURNS_PER_TICK - 1) * 534);
        expect(avatar.worldY).toBe(tileToWorld(5));

        // 2 tiles = 6400 units = 12 subturns; three more turns complete it.
        applyTick();
        applyTick();
        applyTick();
        expect(avatar.worldX).toBe(tileToWorld(7));
        expect(avatar.walkGoalX).toBeNull();
    });

    it('paths around blocked tiles instead of walking through them', () =>
    {
        // 11x11 open map with a single wall tile at (6,5), directly between
        // the avatar (5,5) and its goal (7,5).
        const rows: string[] = [];
        for (let y = 0; y < 11; y++)
        {
            rows.push(y === 5 ? '000000x0000' : '00000000000');
        }
        sim.setLevel(rows, [], []);

        applyTick([event(SNOWWAR_EVENT_MOVE, 1, tileToWorld(7), tileToWorld(5))]);

        const avatar = sim.avatars.get(1);
        let steppedOnWall = false;
        for (let i = 0; i < 10; i++)
        {
            applyTick();
            if (avatar.tileX === 6 && avatar.tileY === 5) steppedOnWall = true;
        }

        expect(steppedOnWall).toBe(false);
        expect(avatar.worldX).toBe(tileToWorld(7));
        expect(avatar.worldY).toBe(tileToWorld(5));
        expect(avatar.walkGoalX).toBeNull();
    });

    it('never cuts diagonally across void ice corners', () =>
    {
        sim.setLevel(['0x0', 'x00', '000'], [], []);
        const avatar = sim.avatars.get(1);
        avatar.worldX = tileToWorld(0);
        avatar.worldY = tileToWorld(0);
        avatar.tileX = 0;
        avatar.tileY = 0;

        applyTick([event(SNOWWAR_EVENT_MOVE, 1, tileToWorld(2), tileToWorld(2))]);

        expect(avatar.worldX).toBe(tileToWorld(0));
        expect(avatar.worldY).toBe(tileToWorld(0));
    });

    it('stops at the closest reachable tile instead of oscillating at an unreachable goal', () =>
    {
        // Goal tile (7,5) is fully walled in; the avatar at (5,5) cannot
        // get closer than its own tile and must stop instead of bouncing
        // between equally-distant neighbours.
        const rows: string[] = [];
        for (let y = 0; y < 11; y++)
        {
            if (y >= 4 && y <= 6) rows.push('000000xxx00');
            else rows.push('00000000000');
        }
        sim.setLevel(rows, [], []);

        applyTick([event(SNOWWAR_EVENT_MOVE, 1, tileToWorld(7), tileToWorld(5))]);

        const avatar = sim.avatars.get(1);
        for (let i = 0; i < 6; i++) applyTick();

        expect(avatar.worldX).toBe(tileToWorld(5));
        expect(avatar.worldY).toBe(tileToWorld(5));
        expect(avatar.walkGoalX).toBeNull();
    });

    it('handles the create-snowball state machine', () =>
    {
        const avatar = sim.avatars.get(1);
        avatar.snowballCount = 0;

        applyTick([event(SNOWWAR_EVENT_CREATE_SNOWBALL, 1)]);
        expect(avatar.activityState).toBe(SNOWWAR_STATE_CREATING);
        expect(avatar.activityTimer).toBe(17); // 20 frames minus 3 elapsed

        // 20-frame creation timer expires within 6 more turns.
        for (let i = 0; i < 6; i++) applyTick();
        expect(avatar.activityState).toBe(SNOWWAR_STATE_NORMAL);
        expect(avatar.snowballCount).toBe(1);
    });

    it('cancels snowball creation when a new AIR movement target arrives', () =>
    {
        const avatar = sim.avatars.get(1);
        avatar.snowballCount = 0;

        applyTick([event(SNOWWAR_EVENT_CREATE_SNOWBALL, 1)]);
        expect(avatar.activityState).toBe(SNOWWAR_STATE_CREATING);

        applyTick([event(SNOWWAR_EVENT_MOVE, 1, tileToWorld(7), tileToWorld(5))]);
        expect(avatar.activityState).toBe(SNOWWAR_STATE_NORMAL);
        expect(avatar.activityTimer).toBe(0);
        expect(avatar.snowballCount).toBe(0);
        expect(avatar.worldX).toBeGreaterThan(tileToWorld(5));
    });

    it('spawns, flies and deletes snowballs', () =>
    {
        applyTick([event(SNOWWAR_EVENT_LAUNCH_SNOWBALL, 99, 1, tileToWorld(10), tileToWorld(5), 2)]);

        const ball = sim.snowballs.get(99);
        expect(ball).toBeDefined();
        expect(sim.avatars.get(1).snowballCount).toBe(4);

        applyTick([event(SNOWWAR_EVENT_DELETE_OBJECT, 99, tileToWorld(8), tileToWorld(5), 2300, 1)]);
        expect(sim.snowballs.has(99)).toBe(false);
        expect(sim.drainImpacts()).toEqual([{
            id: 1,
            worldX: tileToWorld(8),
            worldY: tileToWorld(5),
            height: 2300,
            trajectory: 1,
        }]);
    });

    it('applies authoritative tree damage states', () =>
    {
        applyTick([event(SNOWWAR_EVENT_TREE_HIT, 9, 9, 1)]);
        expect(sim.trees.get('9,9')?.hits).toBe(1);

        applyTick([event(SNOWWAR_EVENT_TREE_HIT, 9, 9, 3)]);
        expect(sim.trees.get('9,9')?.hits).toBe(3);
    });

    it('replays the ray gun as a seven-ball burst without spending carried snowballs', () =>
    {
        applyTick([event(SNOWWAR_EVENT_RAY_GUN_BURST, 99, 1, tileToWorld(20), tileToWorld(5), 3)]);

        expect([...sim.snowballs.keys()]).toEqual([99, 100, 101, 102, 103, 104, 105]);
        // The server never charges ammo for gun bursts; the replica has to
        // agree or the HUD count drifts out of sync.
        expect(sim.avatars.get(1).snowballCount).toBe(5);
    });

    it('snowballs expire on their own when TTL runs out', () =>
    {
        // AIR derives a short-lob TTL from distance: 10 tiles resolves to 17
        // subturns. The arc keeps descending after zero and is removed only
        // once it passes below ground.
        applyTick([event(SNOWWAR_EVENT_LAUNCH_SNOWBALL, 99, 1, tileToWorld(15), tileToWorld(5), 1)]);
        expect(sim.snowballs.has(99)).toBe(true);

        applyTick();
        applyTick();
        expect(sim.snowballs.has(99)).toBe(true);

        applyTick();
        expect(sim.snowballs.has(99)).toBe(true);

        for (let i = 0; i < 4; i++) applyTick();
        expect(sim.snowballs.has(99)).toBe(false);
    });

    it('presents every projectile subturn instead of consuming a whole throw in one browser frame', () =>
    {
        const subturns = Array.from({ length: 24 }, () => [] as SnowWarSimEvent[]);
        subturns[0] = [event(SNOWWAR_EVENT_LAUNCH_SNOWBALL, 99, 1, tileToWorld(10), tileToWorld(5), 0)];
        subturns[10] = [event(SNOWWAR_EVENT_DELETE_OBJECT, 99, tileToWorld(10), tileToWorld(5), 0, 0)];

        sim.queueGameStatus(subturns);
        expect(sim.subturnCount).toBe(0);

        // Even a half-second event-loop stall may present only one projectile
        // subturn per update. The quick throw therefore survives each paint
        // instead of launching and deleting synchronously.
        clock += 500;
        sim.update(clock);
        expect(sim.subturnCount).toBe(1);
        expect(sim.snowballs.has(99)).toBe(true);
        const presentedPositions = [sim.snowballs.get(99)!.locH];

        sim.queueGameStatus(Array.from({ length: 30 }, () => []));
        expect(sim.subturnCount).toBe(1);
        expect(sim.snowballs.has(99)).toBe(true);

        clock += 500;
        sim.update(clock);
        expect(sim.subturnCount).toBe(2);
        expect(sim.snowballs.has(99)).toBe(true);
        presentedPositions.push(sim.snowballs.get(99)!.locH);

        // Subturns 0..9 each leave a projectile state for React to paint.
        // Subturn 10 is the authoritative impact/delete event.
        while (sim.subturnCount < 10)
        {
            clock += SUBTURN_MS;
            sim.update(clock);
            const current = sim.snowballs.get(99);
            expect(current).toBeDefined();
            presentedPositions.push(current.locH);
        }
        expect(presentedPositions).toHaveLength(10);
        expect(new Set(presentedPositions).size).toBe(presentedPositions.length);
        expect(sim.snowballs.has(99)).toBe(true);

        clock += SUBTURN_MS;
        sim.update(clock);
        expect(sim.subturnCount).toBe(11);
        expect(sim.snowballs.has(99)).toBe(false);
    });

    it('applies hits and stuns with scores', () =>
    {
        applyTick([event(SNOWWAR_EVENT_HIT, 1, 2, 90)]);
        expect(sim.avatars.get(2).health).toBe(4);
        expect(sim.avatars.get(1).score).toBe(1);

        applyTick([event(SNOWWAR_EVENT_STUN, 2, 1, 90)]);
        const stunned = sim.avatars.get(2);
        expect(stunned.activityState).toBe(SNOWWAR_STATE_STUNNED);
        expect(stunned.snowballCount).toBe(5);
        expect(stunned.rotation).toBe(6);
        expect(sim.avatars.get(1).score).toBe(6);

        // 100 AIR stun frames -> invincible with restored health.
        for (let i = 0; i < 34; i++) applyTick();
        expect(stunned.activityState).toBe(SNOWWAR_STATE_INVINCIBLE);
        expect(stunned.health).toBe(5);

        // 60 invincibility frames -> normal.
        for (let i = 0; i < 20; i++) applyTick();
        expect(stunned.activityState).toBe(SNOWWAR_STATE_NORMAL);
    });

    it('transfers snowballs from machines', () =>
    {
        const avatar = sim.avatars.get(1);
        avatar.snowballCount = 0;

        applyTick([event(SNOWWAR_EVENT_MACHINE_TRANSFER, 1, 50)]);
        expect(avatar.snowballCount).toBe(1);
        expect(sim.machines.get(50).snowballCount).toBe(2);
    });

    it('depletes finite snowball piles through the shared pickup event', () =>
    {
        const avatar = sim.avatars.get(1);
        avatar.snowballCount = 0;

        applyTick([event(SNOWWAR_EVENT_MACHINE_TRANSFER, 1, 61)]);
        expect(avatar.snowballCount).toBe(1);
        expect(sim.piles.get('4,6').snowballCount).toBe(11);
    });

    it('does not instantly fast-forward a normal jitter backlog (no teleport)', () =>
    {
        // Four AIR turns bunched together remain below the memory backstop and
        // drain smoothly instead of teleporting a walking avatar.
        for (let i = 0; i < 4; i++)
        {
            sim.queueGameStatus(Array.from({ length: SUBTURNS_PER_TICK }, () => []));
        }
        expect(sim.subturnCount).toBe(0);
    });

    it('hard fast-forwards a runaway backlog, bounding memory and standing delay', () =>
    {
        // 21 AIR turns = 63 subturns; the backstop caps the buffer at 18
        // (0.9s of standing delay), so the 45 oldest drain synchronously.
        for (let i = 0; i < 21; i++)
        {
            sim.queueGameStatus(Array.from({ length: SUBTURNS_PER_TICK }, () => []));
        }
        expect(sim.subturnCount).toBe(45);
    });

    const emptyTurn = () => Array.from({ length: SUBTURNS_PER_TICK }, (): SnowWarSimEvent[] => []);

    it('collapses the backlog in a hidden tab even with a snowball in flight', () =>
    {
        sim.isPageHidden = () => true;
        sim.queueGameStatus([[event(SNOWWAR_EVENT_LAUNCH_SNOWBALL, 99, 1, tileToWorld(10), tileToWorld(5), 2)], [], []]);
        for (let i = 0; i < 20; i++) sim.queueGameStatus(emptyTurn());

        // 63 subturns queued, the buffer is capped at 18.
        expect(sim.subturnCount).toBe(45);
    });

    it('keeps a projectile backlog while visible and skips it on catchUp', () =>
    {
        sim.isPageHidden = () => false;
        sim.queueGameStatus([[event(SNOWWAR_EVENT_LAUNCH_SNOWBALL, 99, 1, tileToWorld(10), tileToWorld(5), 2)], [], []]);
        for (let i = 0; i < 20; i++) sim.queueGameStatus(emptyTurn());
        const before = sim.subturnCount;
        expect(before).toBeLessThan(45);

        sim.catchUp();

        expect(sim.subturnCount).toBe(63 - 2);
        expect(sim.drainImpacts()).toEqual([]);
    });

    it('removes a leaver only after the subturns buffered before the exit', () =>
    {
        sim.queueGameStatus([[event(SNOWWAR_EVENT_MOVE, 1, tileToWorld(6), tileToWorld(5))], [], []]);
        sim.removeAvatarAfterBuffer(1);
        expect(sim.avatars.has(1)).toBe(true);

        sim.queueGameStatus(emptyTurn());
        let guard = 0;
        while (sim.subturnCount < SUBTURNS_PER_TICK - 1 && guard++ < 100)
        {
            clock += SUBTURN_MS;
            sim.update(clock);
        }
        expect(sim.avatars.has(1)).toBe(true);

        while (sim.subturnCount < SUBTURNS_PER_TICK && guard++ < 100)
        {
            clock += SUBTURN_MS;
            sim.update(clock);
        }
        expect(sim.avatars.has(1)).toBe(false);
        expect(sim.avatars.has(2)).toBe(true);
    });

    it('removes a leaver at once when nothing is buffered', () =>
    {
        sim.removeAvatarAfterBuffer(2);
        expect(sim.avatars.has(2)).toBe(false);
    });
});
