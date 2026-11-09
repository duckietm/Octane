import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToolbarProgressionView } from './ToolbarProgressionView';

const mocks = vi.hoisted(() => ({
    config: new Map<string, unknown>(),
    createLinkEvent: vi.fn()
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.config.clear();
});

vi.mock('@octane/renderer', () => ({
    CreateLinkEvent: mocks.createLinkEvent
}));

vi.mock('../../api', () => ({
    GetConfigurationValue: (key: string, fallback: unknown) => (mocks.config.has(key) ? mocks.config.get(key) : fallback),
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

const renderMenu = (counts: { achievements?: number; dailyTasks?: number; rewardTrack?: number } = {}) => {
    const setExpanded = vi.fn();

    render(
        <ToolbarProgressionView
            setExpanded={setExpanded}
            unseenAchievementCount={counts.achievements ?? 0}
            unseenDailyTaskCount={counts.dailyTasks ?? 0}
            unseenRewardTrackCount={counts.rewardTrack ?? 0}
        />
    );

    return setExpanded;
};

describe('ToolbarProgressionView (prog_menu_view)', () => {
    it('lists the official entries in the official order', () => {
        renderMenu();

        expect(screen.getAllByRole('button').map((button) => button.getAttribute('data-name'))).toEqual([
            'dailytasks',
            'quests',
            'achievements',
            'leaderboards',
            'introduction'
        ]);
    });

    it('opens the Introduction reward track and closes the menu', () => {
        const setExpanded = renderMenu();

        fireEvent.click(screen.getByRole('button', { name: 'Introduction' }));

        expect(mocks.createLinkEvent).toHaveBeenCalledWith('reward_track/open/introduction');
        expect(setExpanded).toHaveBeenCalledWith(false);
    });

    it('badges the Introduction entry with the claimable rewards', () => {
        renderMenu({ rewardTrack: 3 });

        expect(screen.getByRole('button', { name: 'Introduction' })).toHaveTextContent('3');
    });

    it('follows toolbar.hide.quests and dailytasks.enabled like the official menu', () => {
        mocks.config.set('toolbar.hide.quests', true);
        mocks.config.set('dailytasks.enabled', false);
        renderMenu();

        expect(screen.queryByRole('button', { name: 'Quests' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Daily tasks' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Introduction' })).toBeInTheDocument();
    });

    it('is what the toolbar progression icon opens, with the progression badge', () => {
        const source = readFileSync(resolve(process.cwd(), 'src/components/toolbar/ToolbarView.tsx'), 'utf8');

        expect(source).toContain('<ToolbarProgressionView');
        expect(source).toContain('setProgressionExpanded(value => !value)');
        expect(source).toContain('<LayoutItemCountView count={ unseenProgMenuCount }');
        expect(source).not.toContain('icon="progression" onClick={ () => CreateLinkEvent(\'achievements/toggle\') }');
    });
});
