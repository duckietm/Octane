import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SNOWWAR_OBJECT_AVATAR, SNOWWAR_STATE_NORMAL, SnowWarSimulation, tileToWorld } from '../../../../api/snowwar';
import { SnowWarArenaView } from './SnowWarArenaView';

const mocks = vi.hoisted(() => ({ snowWar: null as any }));

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    LocalizeText: (key: string) => key,
    GetConfigurationValue: (_key: string, fallback: any) => fallback,
    GetSessionDataManager: () => ({ userId: 100 })
}));

vi.mock('../../../../common', () => ({
    LayoutAvatarImageView: () => <div />,
    LayoutFurniImageView: () => <div />,
    PIXEL_ART_RENDERING: 'pixelated'
}));

vi.mock('../../../floorplan-editor/FloorplanEditorView', () => ({ FloorplanEditorView: () => null }));
vi.mock('./SnowWarAvatarView', () => ({ SnowWarAvatarView: () => <div /> }));

vi.mock('../../../../hooks', () => ({
    useSnowWar: () => mocks.snowWar,
    useNotification: () => ({ showConfirm: vi.fn() })
}));

const avatar = (overrides: Record<string, number> = {}) => ({
    objectType: SNOWWAR_OBJECT_AVATAR,
    objectId: 1,
    userId: 100,
    teamId: 1,
    name: 'me',
    figure: 'hd-180-1',
    gender: 'M',
    worldX: tileToWorld(2),
    worldY: tileToWorld(2),
    rotation: 0,
    health: 5,
    snowballCount: 5,
    activityTimer: 0,
    activityState: SNOWWAR_STATE_NORMAL,
    score: 0,
    ...overrides
});

const hudImages = (container: HTMLElement) =>
    [ ...container.querySelectorAll('.snowwar-official-hud img, .snowwar-countdown img') ].map(img => img.getAttribute('src') ?? '');

describe('SnowWarArenaView HUD animations (AIR SnowWarUI)', () =>
{
    let simulation: SnowWarSimulation;

    beforeEach(() =>
    {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
        // Deterministic clock: Date, timers and animation frames all advance by hand.
        vi.useFakeTimers({ toFake: [ 'Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance' ] });
        simulation = new SnowWarSimulation();
        simulation.setLevel([ 'xxxxx', 'x000x', 'x000x', 'x000x', 'xxxxx' ].map(row => row.replace(/x/g, 'x')), [], []);
        simulation.applyFullStatus([ avatar() ]);
        mocks.snowWar = {
            phase: 'playing',
            levelData: { gameLengthSeconds: 120, canEditRoom: false, arenaName: '', mapId: 1, teamCount: 2, heightmapRows: [ '00000', '00000', '00000', '00000', '00000' ], items: [], machines: [], players: [] },
            secondsLeft: 100,
            preparingSeconds: 0,
            preparingEndsAt: 0,
            chatMessages: [],
            simulation,
            editing: false,
            walkTo: vi.fn(), throwAtLocation: vi.fn(), throwAtPlayer: vi.fn(), createSnowball: vi.fn(), exitGame: vi.fn(),
            startEditing: vi.fn(), saveArena: vi.fn(), stopEditing: vi.fn(), sendChat: vi.fn(), requestFullStatus: vi.fn()
        };
    });

    afterEach(() =>
    {
        cleanup();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('uses the bundled HUD bitmaps', () =>
    {
        const { container } = render(<SnowWarArenaView />);

        const images = hudImages(container);
        expect(images.some(src => src.includes('ui_me_health_5'))).toBe(true);
        expect(images.every(src => !src.includes('snowstorm_client/official'))).toBe(true);
    });

    it('flashes the empty-ammo warning with no snowballs', () =>
    {
        simulation.avatars.get(1).snowballCount = 0;
        const { container } = render(<SnowWarArenaView />);

        expect(hudImages(container).some(src => src.includes('ui_no_balls_'))).toBe(true);
    });

    it('flashes minus when hit and plus when scoring', async () =>
    {
        const { container, rerender } = render(<SnowWarArenaView />);

        simulation.avatars.get(1).health = 4;
        await act(async () =>
        {
            rerender(<SnowWarArenaView />);
            vi.advanceTimersByTime(5);
        });
        // frameNow advances on animation frames; the flash frame shows within 200 ms of the hit.
        await act(async () => { vi.advanceTimersByTime(40); });
        expect(hudImages(container).some(src => src.includes('ui_me_minus_'))).toBe(true);

        // Let the minus flash run out (200 ms), then score.
        await act(async () => { vi.advanceTimersByTime(250); });
        simulation.avatars.get(1).score = 1;
        await act(async () => { rerender(<SnowWarArenaView />); });
        await act(async () => { vi.advanceTimersByTime(60); });
        expect(hudImages(container).some(src => src.includes('ui_me_plus_'))).toBe(true);
    });

    it('shows the AIR counter digits in the last preparing seconds', async () =>
    {
        mocks.snowWar.phase = 'preparing';
        mocks.snowWar.preparingEndsAt = Date.now() + 2_500;
        const { container } = render(<SnowWarArenaView />);
        await act(async () => { vi.advanceTimersByTime(40); });

        expect(hudImages(container).some(src => src.includes('explosion0003'))).toBe(true);
    });

    it('focuses the chat bar on Enter, leaves movement keys alone and sends on Enter', () =>
    {
        const { container } = render(<SnowWarArenaView />);
        const input = container.querySelector('.snowwar-chat-input input') as HTMLInputElement;

        fireEvent.keyDown(window, { key: 'q', code: 'KeyQ' });
        expect(document.activeElement).not.toBe(input);

        fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' });
        expect(document.activeElement).toBe(input);

        fireEvent.change(input, { target: { value: 'hoi' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
        expect(mocks.snowWar.sendChat).toHaveBeenCalledWith('hoi');

        fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
        expect(document.activeElement).not.toBe(input);
    });
});
