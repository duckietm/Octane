import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { handlers, on, sent } = vi.hoisted(() => {
    const handlers = new Map<unknown, (event: any) => void>();
    const on = (type: unknown, handler: (event: any) => void) => {
        for (const key of Array.isArray(type) ? type : [type]) handlers.set(key, handler);
    };
    return { handlers, on, sent: [] as unknown[] };
});

vi.mock('@octane/renderer', async (importOriginal) => {
    const real = await importOriginal<Record<string, unknown>>();
    const stubs = new Map<string, unknown>();
    // Classes the shared mock leaves out: a composer keeps its arguments, an event class is only a key.
    const stub = (name: string) => {
        if (!stubs.has(name)) stubs.set(name, class { args: unknown[]; constructor(...args: unknown[]) { this.args = args; } static readonly stubName = name; });
        return stubs.get(name);
    };
    return new Proxy(real, { get: (target, prop: string) => (prop in target || prop === 'then' ? target[prop] : stub(prop)), has: (target, prop) => prop !== 'then' });
});
vi.mock('../../hooks', () => ({
    useFurnitureYoutubeWidget: () => ({ objectId: -1, videoId: null, currentVideoState: 0, hasControl: false }),
    useHasPermission: () => false,
    useMessageEvent: on,
    useOctaneEvent: on
}));
vi.mock('../../api', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    GetRoomSession: () => null,
    getYoutubeRoomEnabled: () => true,
    SendMessageComposer: (composer: unknown) => sent.push(composer)
}));
vi.mock('../../common', async (importOriginal) => ({ ...(await importOriginal<any>()), LayoutAvatarImageView: () => null }));

import { RoomSessionEvent, YouTubeRoomBroadcastEvent, YouTubeRoomWatchingComposer } from '@octane/renderer';
import { YouTubePlayerView } from './YouTubePlayerView';

const watching = () => sent.filter((composer) => composer instanceof (YouTubeRoomWatchingComposer as any)).map((composer: any) => composer.args[0]);

afterEach(() => {
    cleanup();
    sent.length = 0;
});

describe('YouTubePlayerView room change', () => {
    it('closes the broadcast and stops watching when the room session ends', () => {
        render(<YouTubePlayerView />);

        act(() => handlers.get(YouTubeRoomBroadcastEvent)({ getParser: () => ({ videoId: 'dQw4w9WgXcQ', senderName: 'owner', playlist: [] }) }));
        expect(watching()).toEqual([true]);

        // Going straight to another room used to keep this room's video playing.
        act(() => handlers.get(RoomSessionEvent.ENDED)({}));

        expect(watching()).toEqual([true, false]);
    });

    it('stops watching when it unmounts', () => {
        const view = render(<YouTubePlayerView />);

        act(() => handlers.get(YouTubeRoomBroadcastEvent)({ getParser: () => ({ videoId: 'dQw4w9WgXcQ', senderName: 'owner', playlist: [] }) }));
        view.unmount();

        expect(watching()).toEqual([true, false]);
    });
});
