import { cleanup, fireEvent, render } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api', async () => {
    const actual = await vi.importActual<typeof import('../../api')>('../../api');

    return {
        ...actual,
        GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
        LocalizeBadgeDescription: () => 'Rate %limit% Helpers.',
        LocalizeBadgeName: (badgeCode: string) => badgeCode,
        localizeWithFallback: (key: string, fallback: string, params: string[] = [], values: string[] = []) => {
            if (key === 'talent.track.helper.guide.begin.description') return 'Help others.<br><br>You are on your way.';

            if (/^talent\.track\.helper\.level\.\d+\.title$/.test(key)) return `Level ${key.split('.')[4]}`;

            return params.reduce((text, param, index) => text.replace(`%${param}%`, values[index]), fallback);
        }
    };
});

vi.mock('../../common', () => ({
    AirModalDialog: ({ children, caption, className, frameStyle }: PropsWithChildren<{ caption: string; className: string; frameStyle?: number }>) => (
        <div className={className} data-caption={caption} data-frame={frameStyle}>
            {children}
        </div>
    ),
    LayoutAvatarImageView: () => <div />,
    LayoutBadgeImageView: ({ badgeCode }: { badgeCode: string }) => <div data-testid={`badge-${badgeCode}`} />
}));

import { TALENT_STATE_ACHIEVED, TALENT_STATE_IN_PROGRESS, TALENT_STATE_LOCKED } from '../../api';
import { getTalentTaskInstruction, getTalentTaskRatio, TalentTrackView } from './TalentTrackView';

afterEach(cleanup);

const task = (id: number, badgeCode: string, state: number, currentScore = 0, totalScore = 0) => ({ id, requiredLevel: 0, badgeCode, state, currentScore, totalScore });

const helperTrack = {
    name: 'helper',
    levels: [
        {
            level: 1,
            state: TALENT_STATE_ACHIEVED,
            tasks: [task(1, 'ACH_GuideFeedbackGiver1', TALENT_STATE_ACHIEVED, 5, 5)],
            perks: ['USE_GUIDE_TOOL'],
            products: []
        },
        {
            level: 2,
            state: TALENT_STATE_IN_PROGRESS,
            tasks: [task(2, 'ACH_GuideOnDutyPresence1', TALENT_STATE_IN_PROGRESS, 3, 10), task(3, 'ACH_GuideChatReviewer1', TALENT_STATE_ACHIEVED, 1, 1), task(4, '', TALENT_STATE_LOCKED)],
            perks: [],
            products: [{ productCode: 'duck', vipDays: 0 }]
        },
        { level: 3, state: TALENT_STATE_LOCKED, tasks: [task(5, 'ACH_GuideTourGiver1', TALENT_STATE_LOCKED, 0, 3)], perks: [], products: [{ productCode: '', vipDays: 31 }] }
    ]
};

const renderTrack = (track = helperTrack, onSelectTask = vi.fn(), onOpenTrack = vi.fn()) =>
    render(<TalentTrackView track={track as any} onClose={vi.fn()} onOpenTrack={onOpenTrack} onSelectTask={onSelectTask} />);

describe('TalentTrackView', () => {
    it('draws the begin text as AIR formatted text, so <br> breaks the line', () => {
        const { container } = renderTrack({ name: 'helper', levels: [] } as any);
        const text = container.querySelector('.octane-talent-begin__text');

        expect(text?.querySelectorAll('br')).toHaveLength(2);
        expect(text?.textContent).toBe('Help others.You are on your way.');
    });

    it('opens in the reward track frame on the level in progress, the begin pane first in the level list', () => {
        const { container } = renderTrack();
        const rows = [...container.querySelectorAll('.octane-talent-level-list .octane-talent-level')];

        expect(container.querySelector('.octane-talent-track')).toHaveAttribute('data-frame', '3');
        expect(container.querySelector('.octane-talent-track')).toHaveAttribute('data-caption', 'MY TALENT TRACK');
        expect(rows.map((row) => row.querySelector('.octane-talent-level__name')?.textContent)).toEqual(['Your journey', 'Level 1', 'Level 2', 'Level 3']);
        expect(rows.map((row) => row.getAttribute('data-state'))).toEqual(['achieved', 'achieved', 'current', 'locked']);
        expect(rows[2]).toHaveAttribute('data-active', 'true');
        expect(container.querySelector('.octane-talent-detail')).toHaveAttribute('data-level', '2');
        expect(container.querySelector('.octane-talent-level-list > .octane-reward-track-scroll-viewport > .octane-talent-level-list__content')).toBeTruthy();
    });

    it('counts the achieved tasks of each level and the completed levels in the profile', () => {
        const { container } = renderTrack();
        const counts = [...container.querySelectorAll('.octane-talent-level__count')].map((count) => count.textContent);

        expect(counts).toEqual(['1 / 1', '1 / 2', '0 / 1']);
        expect(container.querySelector('.octane-talent-progress__collected')?.textContent).toBe('1 / 3 levels completed');
        expect(container.querySelectorAll('.octane-talent-progress__divider')).toHaveLength(2);
    });

    it('lists the level tasks as reward track task rows; only an ongoing task opens its dialog', () => {
        const onSelectTask = vi.fn();
        const { container } = renderTrack(helperTrack, onSelectTask);
        const rows = [...container.querySelectorAll('.octane-talent-task-list .octane-talent-task')];

        expect(rows.map((row) => row.getAttribute('data-state'))).toEqual(['ongoing', 'achieved']);
        expect(rows[0].tagName).toBe('BUTTON');
        expect(rows[1].tagName).toBe('DIV');
        expect(rows[0].querySelector('.octane-talent-task__count')?.textContent).toBe('3 / 10');
        expect(rows[0].querySelector('.octane-reward-track-mini-bar')).toBeTruthy();

        fireEvent.click(rows[0]);

        expect(onSelectTask).toHaveBeenCalledWith(helperTrack.levels[1].tasks[0]);
    });

    it('shows a picked level with its rewards, and the begin pane with the citizenship button', () => {
        const onOpenTrack = vi.fn();
        const { container } = renderTrack(helperTrack, vi.fn(), onOpenTrack);
        const rows = () => [...container.querySelectorAll('.octane-talent-level-list .octane-talent-level')];

        fireEvent.click(rows()[3]);

        expect(container.querySelector('.octane-talent-detail')).toHaveAttribute('data-level', '3');
        expect(container.querySelector('.octane-talent-reward')).toHaveClass('is-locked');
        expect(container.querySelector('.octane-talent-reward__item.is-vip')?.textContent).toBe('31');

        fireEvent.click(rows()[1]);

        expect(container.querySelector('.octane-talent-reward')).toHaveClass('is-achieved');
        expect(container.querySelector('.octane-talent-reward__unlocked')?.textContent).toBe('UNLOCKED');

        fireEvent.click(rows()[0]);
        fireEvent.click(container.querySelector('.octane-talent-begin__button'));

        expect(onOpenTrack).toHaveBeenCalledWith('citizenship');
    });

    it('fills a task bar by its state and score', () => {
        expect(getTalentTaskRatio(task(1, 'A', TALENT_STATE_ACHIEVED, 0, 5))).toBe(1);
        expect(getTalentTaskRatio(task(1, 'A', TALENT_STATE_IN_PROGRESS, 2, 8))).toBe(0.25);
        expect(getTalentTaskRatio(task(1, 'A', TALENT_STATE_IN_PROGRESS, 9, 8))).toBe(1);
        expect(getTalentTaskRatio(task(1, 'A', TALENT_STATE_LOCKED, 2, 8))).toBe(0);
    });

    it('fills the %limit% the badge texts leave open with the task goal', () => {
        expect(getTalentTaskInstruction('ACH_GuideFeedbackGiver1', 5)).toBe('Rate 5 Helpers.');
        expect(getTalentTaskInstruction('ACH_GuideFeedbackGiver1')).toBe('Rate %limit% Helpers.');
    });
});
