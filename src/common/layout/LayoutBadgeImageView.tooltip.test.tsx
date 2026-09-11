import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutBadgeImageView } from './LayoutBadgeImageView';

vi.mock('@octane/renderer', () => ({
    BadgeImageReadyEvent: class {
        public static IMAGE_READY = 'badge_image_ready';
    },
    GetEventDispatcher: () => ({ addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    GetSessionDataManager: () => ({
        getBadgeImage: () => null,
        getGroupBadgeImage: () => null
    }),
    OctaneSprite: class {},
    TextureUtils: { generateImage: vi.fn() }
}));

vi.mock('../../api', () => ({
    ensureBadgeLeaderboardLoaded: vi.fn(() => Promise.resolve()),
    GetConfigurationValue: vi.fn((key: string) => (key === 'badge.asset.url' ? 'https://example.com/%badgename%.gif' : true)),
    getCachedBadgeRarityStat: vi.fn(() => null),
    LocalizeBadgeDescription: (code: string) => `Description of ${code}`,
    LocalizeBadgeName: (code: string) => `Name of ${code}`,
    LocalizeText: (key: string) => key
}));

describe('badge tooltip', () => {
    beforeEach(() => vi.useFakeTimers());

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('shows the badge name and description in the skinned bubble on hover', () => {
        const { container } = render(<LayoutBadgeImageView badgeCode="ACH_BasicClub1" showInfo />);

        fireEvent.mouseEnter(container.firstElementChild as HTMLElement);

        act(() => {
            vi.advanceTimersByTime(250);
        });

        const bubble = screen.getByRole('tooltip');
        expect(bubble.classList.contains('octane-tooltip')).toBe(true);
        expect(bubble).toHaveTextContent('Name of ACH_BasicClub1');
        expect(bubble).toHaveTextContent('Description of ACH_BasicClub1');

        fireEvent.mouseLeave(container.firstElementChild as HTMLElement);
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('stays silent without showInfo', () => {
        const { container } = render(<LayoutBadgeImageView badgeCode="ACH_BasicClub1" />);

        fireEvent.mouseEnter(container.firstElementChild as HTMLElement);

        act(() => {
            vi.advanceTimersByTime(250);
        });

        expect(screen.queryByRole('tooltip')).toBeNull();
    });
});
