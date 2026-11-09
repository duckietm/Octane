import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutBadgeImageView } from './LayoutBadgeImageView';

const rendererMocks = vi.hoisted(() => {
    class OctaneSprite {
        public destroyed = false;

        public constructor(public readonly texture: unknown) {}

        public destroy(): void {
            this.destroyed = true;
        }
    }

    return {
        OctaneSprite,
        generateImage: vi.fn(),
        groupBadgeUrl: null as string | null,
        listeners: [] as ((event: unknown) => void)[],
        urlCalls: [] as unknown[][]
    };
});

vi.mock('@octane/renderer', () => ({
    BadgeImageReadyEvent: class {
        public static IMAGE_READY = 'badge_image_ready';
    },
    GetEventDispatcher: () => ({
        addEventListener: (_type: string, listener: (event: unknown) => void) => rendererMocks.listeners.push(listener),
        removeEventListener: (_type: string, listener: (event: unknown) => void) => {
            rendererMocks.listeners = rendererMocks.listeners.filter((entry) => entry !== listener);
        }
    }),
    GetSessionDataManager: () => ({
        getBadgeImage: () => null,
        getGroupBadgeImage: () => ({ id: 'group-texture' }),
        getGroupBadgeImageUrl: (...args: unknown[]) => {
            rendererMocks.urlCalls.push(args);

            return rendererMocks.groupBadgeUrl;
        }
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
    rendererMocks.groupBadgeUrl = null;
    rendererMocks.listeners = [];
    rendererMocks.urlCalls = [];
});

const stubImage = () =>
    vi.stubGlobal(
        'Image',
        class {
            public complete = true;
            public naturalWidth = 39;
            public width = 39;
            public height = 39;
            public src = '';
        }
    );

describe('group badge image', () => {
    it('keeps the real badge when the loading icon read back finishes after it', async () => {
        let finishPlaceholder: (image: unknown) => void = () => undefined;

        rendererMocks.generateImage.mockReturnValue(new Promise((resolve) => (finishPlaceholder = resolve)));
        stubImage();

        try {
            const { container } = render(<LayoutBadgeImageView isGroup badgeCode="b0503Xs09114s05013s05015" />);
            const badge = container.firstElementChild as HTMLElement;

            // The badge is drawn: the renderer has its URL and says so.
            rendererMocks.groupBadgeUrl = 'data:image/png;base64,real';
            await act(async () => {
                for (const listener of rendererMocks.listeners) await listener({ badgeId: 'b0503Xs09114s05013s05015', image: {} });
            });
            await waitFor(() => expect(badge.style.backgroundImage).toContain('base64,real'));

            // Then the loading icon read back of the first render finishes.
            await act(async () => {
                finishPlaceholder({ complete: true, height: 20, naturalWidth: 20, src: 'data:image/png;base64,loading', width: 20 });
            });

            expect(badge.style.backgroundImage).toContain('base64,real');
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('never asks the badge imager for a preview of the badge editor', () => {
        rendererMocks.generateImage.mockReturnValue(new Promise(() => undefined));

        render(<LayoutBadgeImageView isGroup isPreview badgeCode="b0503X" />);

        expect(rendererMocks.urlCalls.at(-1)).toEqual(['b0503X', false]);
    });

    it('shows the shared image URL of the renderer without reading the texture back from the GPU', async () => {
        rendererMocks.groupBadgeUrl = 'data:image/png;base64,shared';
        vi.stubGlobal(
            'Image',
            class {
                public complete = true;
                public naturalWidth = 39;
                public width = 39;
                public height = 39;
                public src = '';
            }
        );

        try {
            const { container } = render(<LayoutBadgeImageView isGroup badgeCode="b0503Xs09114s05013s05015" />);
            const badge = container.firstElementChild as HTMLElement;

            await waitFor(() => expect(badge.style.backgroundImage).toContain('data:image/png;base64,shared'));
            expect(badge.style.width).toBe('39px');
            expect(rendererMocks.generateImage).not.toHaveBeenCalled();
        } finally {
            vi.unstubAllGlobals();
        }
    });

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
        const target = options.target as InstanceType<typeof rendererMocks.OctaneSprite>;

        expect(target.texture).toEqual({ id: 'group-texture' });

        const badge = container.firstElementChild as HTMLElement;

        await waitFor(() => expect(badge.style.backgroundImage).toContain('data:image/png;base64,badge'));
        expect(badge.style.width).toBe('40px');
        expect(badge.style.height).toBe('39px');
        expect(badge.classList.contains('group-badge')).toBe(true);
        expect(target.destroyed).toBe(true);
    });
});
