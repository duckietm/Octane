import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToolbarMeView } from './ToolbarMeView';

const mocks = vi.hoisted(() => ({
    config: new Map<string, unknown>(),
    createLinkEvent: vi.fn(),
    dailyTasks: { unseenCount: 0 },
    rewardTracks: { tracks: [] as { id: string; claimablePrizeCount: number }[] }
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.config.clear();
    mocks.rewardTracks.tracks = [];
});

vi.mock('@octane/renderer', () => ({
    CreateLinkEvent: mocks.createLinkEvent,
    GetRoomEngine: () => ({ selectRoomObject: vi.fn() }),
    GetSessionDataManager: () => ({ userId: 1 }),
    RoomObjectCategory: { UNIT: 100 }
}));

vi.mock('../../api', () => ({
    DispatchUiEvent: vi.fn(),
    GetConfigurationValue: (key: string, fallback: unknown) => (mocks.config.has(key) ? mocks.config.get(key) : fallback),
    GetRoomSession: () => null,
    GetUserProfile: vi.fn(),
    getRewardTrackMenuTarget: (tracks: { claimablePrizeCount: number }[]) => tracks.find((track) => track.claimablePrizeCount > 0) ?? tracks[0] ?? null,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../events', () => ({
    GuideToolEvent: class {
        static TOGGLE_GUIDE_TOOL = 'toggle';
    }
}));

vi.mock('../../hooks', () => ({
    useDailyTasks: () => mocks.dailyTasks,
    useRewardTracks: () => mocks.rewardTracks
}));

vi.mock('../../hooks/collectibles/useCollectibles', () => ({
    isCollectiblesEnabled: () => false
}));

vi.mock('../../state/groupForumUnreadStore', () => ({
    useGroupForumUnreadStore: (select: (state: { unreadForumsCount: number }) => number) => select({ unreadForumsCount: 2 })
}));

describe('ToolbarMeView (me_menu_new_view)', () => {
    it('shows a caption under every icon', () => {
        render(<ToolbarMeView setMeExpanded={vi.fn()} unseenAchievementCount={0} useGuideTool={false} />);

        const labels = Array.from(document.querySelectorAll('.octane-toolbar-me-label')).map((label) => label.textContent);

        expect(labels).toEqual(['Achievements', 'Quests', 'Daily rewards', 'Reward track', 'Talents', 'Profile', 'Rooms', 'Clothes', 'Badges', 'Settings', 'Forums']);
        for (const button of screen.getAllByRole('button')) {
            expect(button.querySelector('.octane-toolbar-me-icon')).not.toBeNull();
        }
    });

    it('keeps the unseen counters and the links', () => {
        render(<ToolbarMeView setMeExpanded={vi.fn()} unseenAchievementCount={4} useGuideTool={false} />);

        expect(screen.getByRole('button', { name: 'Achievements' })).toHaveTextContent('4');
        expect(screen.getByRole('button', { name: 'Forums' })).toHaveTextContent('2');

        fireEvent.click(screen.getByRole('button', { name: 'Clothes' }));
        expect(mocks.createLinkEvent).toHaveBeenCalledWith('avatar-editor/toggle');
    });

    it('badges the reward track entry with the claimable prizes of the track it opens, not of every track', () => {
        mocks.rewardTracks.tracks = [
            { id: 'introduction', claimablePrizeCount: 0 },
            { id: 'habboween2026', claimablePrizeCount: 3 }
        ];
        render(<ToolbarMeView setMeExpanded={vi.fn()} unseenAchievementCount={0} useGuideTool={false} />);

        expect(screen.getByRole('button', { name: 'Reward track' })).toHaveTextContent('3');
        fireEvent.click(screen.getByRole('button', { name: 'Reward track' }));
        expect(mocks.createLinkEvent).toHaveBeenCalledWith('reward_track/toggle/habboween2026');
    });

    it('shows no reward track badge once every prize is claimed', () => {
        mocks.rewardTracks.tracks = [
            { id: 'introduction', claimablePrizeCount: 0 },
            { id: 'habboween2026', claimablePrizeCount: 0 }
        ];
        render(<ToolbarMeView setMeExpanded={vi.fn()} unseenAchievementCount={0} useGuideTool={false} />);

        expect(screen.getByRole('button', { name: 'Reward track' }).querySelector('.octane-toolbar-count')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Reward track' }));
        expect(mocks.createLinkEvent).toHaveBeenCalledWith('reward_track/toggle/introduction');
    });

    it('sets the caption in 9 px white regular Ubuntu at y32, like field_text', () => {
        const css = readFileSync(resolve(process.cwd(), 'src/css/toolbar/ToolBar.css'), 'utf8');
        const label = css.slice(css.indexOf('.octane-toolbar-me-label {'));

        expect(label).toMatch(/top: 32px;[\s\S]*?font-family: HabboAirUbuntu, UbuntuRegular[\s\S]*?font-size: 9px;[\s\S]*?font-weight: 400/);
        expect(css).toMatch(/\.octane-toolbar-me \{[^}]*flex-wrap: wrap/);
    });
});
