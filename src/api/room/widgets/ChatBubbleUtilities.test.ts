import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(), placeholder: false }));

vi.mock('@octane/renderer', () => ({
    AvatarFigurePartType: { CHEST: 'ch' },
    AvatarScaleType: { LARGE: 'h' },
    AvatarSetType: { HEAD: 'head' },
    GetAvatarRenderManager: () => ({ createAvatarImage: mocks.create }),
    GetRoomEngine: () => ({}),
    PetFigureData: class {},
    TextureUtils: {},
    Vector3d: class {}
}));

import { ChatBubbleUtilities } from './ChatBubbleUtilities';

const avatarImage = (figure: string) => ({
    isPlaceholder: () => mocks.placeholder,
    getFigure: () => ({ getFigureString: () => `normalized:${figure}` }),
    processAsImageUrl: () => `head:${figure}`,
    getPartColor: () => ({ rgb: 0x123456 }),
    dispose: vi.fn()
});

beforeEach(() => {
    ChatBubbleUtilities.AVATAR_IMAGE_CACHE.clear();
    ChatBubbleUtilities.AVATAR_COLOR_CACHE.clear();
    mocks.placeholder = false;
    mocks.create.mockReset().mockImplementation((figure: string) => avatarImage(figure));
});

describe('ChatBubbleUtilities head cache', () => {
    it('keys the head and colour by the requested figure', async () => {
        await expect(ChatBubbleUtilities.getUserImage('hd-1')).resolves.toBe('head:hd-1');

        expect(ChatBubbleUtilities.AVATAR_COLOR_CACHE.get('hd-1')).toBe(0x123456);

        await ChatBubbleUtilities.getUserImage('hd-1');
        expect(mocks.create).toHaveBeenCalledTimes(1);
    });

    it('shares one render between simultaneous requests for the same figure', async () => {
        const [first, second] = await Promise.all([ChatBubbleUtilities.getUserImage('hd-2'), ChatBubbleUtilities.getUserImage('hd-2')]);

        expect(first).toBe('head:hd-2');
        expect(second).toBe('head:hd-2');
        expect(mocks.create).toHaveBeenCalledTimes(1);
    });

    it('moves a cache hit to the young end', async () => {
        await ChatBubbleUtilities.getUserImage('a');
        await ChatBubbleUtilities.getUserImage('b');
        await ChatBubbleUtilities.getUserImage('a');

        expect([...ChatBubbleUtilities.AVATAR_IMAGE_CACHE.keys()]).toEqual(['b', 'a']);
        expect([...ChatBubbleUtilities.AVATAR_COLOR_CACHE.keys()]).toEqual(['b', 'a']);
    });

    it('does not cache a placeholder head for the figure', async () => {
        mocks.placeholder = true;
        await ChatBubbleUtilities.getUserImage('hd-3');

        expect(ChatBubbleUtilities.AVATAR_IMAGE_CACHE.has('hd-3')).toBe(false);
    });
});
