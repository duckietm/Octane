import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutBadgeImageView } from './LayoutBadgeImageView';

const rendererMocks = vi.hoisted(() => {
    class OctaneSprite {
        public constructor(public readonly texture: unknown) {}
    }

    return {
        OctaneSprite,
        generateImage: vi.fn()
    };
});

vi.mock('@octane/renderer', () => ({
    BadgeImageReadyEvent: class {
        public static IMAGE_READY = 'badge_image_ready';
    },
    GetEventDispatcher: () => ({ addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    GetSessionDataManager: () => ({
        getBadgeImage: () => null,
        getGroupBadgeImage: () => ({ id: 'group-texture' })
    }),
    OctaneSprite: rendererMocks.OctaneSprite,
    TextureUtils: { generateImage: rendererMocks.generateImage }
}));

vi.mock('../../api', () => ({
    ensureBadgeLeaderboardLoaded: vi.fn(() => Promise.resolve()),
    GetConfigurationValue: vi.fn((key: string) => (key === 'badge.asset.url' ? 'https://example.com/%badgename%.gif' : false)),
    getCachedBadgeRarityStat: vi.fn(() => null),
    LocalizeBadgeDescription: (code: string) => code,
    LocalizeBadgeName: (code: string) => code,
    LocalizeText: (key: string) => key
}));

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
});

describe('group badge image', () => {
    it('extracts the group badge at resolution 1 and sizes the element from the unscaled image', async () => {
        // The Pixi extractor defaults to the renderer's devicePixelRatio-based
        // resolution; without an explicit resolution the badge image doubles in
        // size on high-DPI screens and the element inherits the inflated width.
        rendererMocks.generateImage.mockResolvedValue({
            complete: true,
            height: 39,
            naturalWidth: 40,
            src: 'data:image/png;base64,badge',
            width: 40
        });

        const { container } = render(<LayoutBadgeImageView isGroup badgeCode="b0503Xs09114s05013s05015" />);

        await waitFor(() => expect(rendererMocks.generateImage).toHaveBeenCalled());

        const [options] = rendererMocks.generateImage.mock.calls[0];

        expect(options).toMatchObject({ resolution: 1 });
        expect(options.target).toBeInstanceOf(rendererMocks.OctaneSprite);
        expect((options.target as InstanceType<typeof rendererMocks.OctaneSprite>).texture).toEqual({ id: 'group-texture' });

        const badge = container.firstElementChild as HTMLElement;

        await waitFor(() => expect(badge.style.backgroundImage).toContain('data:image/png;base64,badge'));
        expect(badge.style.width).toBe('40px');
        expect(badge.style.height).toBe('39px');
        expect(badge.classList.contains('group-badge')).toBe(true);
    });
});
