/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';

vi.mock('../../api', async () => {
    const actual = await vi.importActual<typeof import('../../api')>('../../api');

    return {
        ...actual,
        GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
        LocalizeBadgeDescription: () => 'Rate %limit% Helpers.',
        LocalizeBadgeName: (badgeCode: string) => badgeCode,
        LocalizeText: (key: string) => key,
        localizeWithFallback: (key: string, fallback: string, params: string[] = [], values: string[] = []) => {
            if (/^talent\.track\.helper\.level\.\d+\.title$/.test(key)) return `Level ${key.split('.')[4]}`;
            if (key === 'talent.track.helper.guide.begin.description') return 'Help others.<br>You are on your way.';

            return (params ?? []).reduce((text, param, index) => text.replace(`%${param}%`, values[index]), fallback);
        }
    };
});
vi.mock('../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

vi.mock('../../common', () => ({
    AirModalDialog: ({ children, className }: { children: React.ReactNode; className: string }) => (
        <div className={className} data-testid="desktop-dialog">
            {children}
        </div>
    ),
    LayoutAvatarImageView: () => <div />,
    LayoutBadgeImageView: ({ badgeCode }: { badgeCode: string }) => <div data-testid={`badge-${badgeCode}`} />
}));

// The window itself is DraggableWindow's business (and tested there); here it is a plain box that shows what it was given.
vi.mock('../../common/draggable-window', () => ({
    DraggableWindow: ({ children, handheldSheet }: { children: React.ReactNode; handheldSheet?: boolean }) => (
        <div data-sheet={String(!!handheldSheet)} data-testid="window">
            {children}
        </div>
    )
}));

import { TALENT_STATE_ACHIEVED, TALENT_STATE_IN_PROGRESS, TALENT_STATE_LOCKED } from '../../api';
import { TalentTrackView } from './TalentTrackView';

const task = (id: number, badgeCode: string, state: number, currentScore = 0, totalScore = 0) => ({
    id,
    requiredLevel: 0,
    badgeCode,
    state,
    currentScore,
    totalScore
});

const track = {
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
            tasks: [
                task(2, 'ACH_GuideOnDutyPresence1', TALENT_STATE_IN_PROGRESS, 3, 10),
                task(3, 'ACH_GuideChatReviewer1', TALENT_STATE_ACHIEVED, 1, 1),
                task(4, '', TALENT_STATE_LOCKED)
            ],
            perks: [],
            products: [{ productCode: 'duck', vipDays: 0 }]
        },
        {
            level: 3,
            state: TALENT_STATE_LOCKED,
            tasks: [task(5, 'ACH_GuideTourGiver1', TALENT_STATE_LOCKED, 0, 3)],
            perks: [],
            products: [{ productCode: '', vipDays: 31 }]
        }
    ]
};

const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));
const renderTrack = (onSelectTask = vi.fn(), onOpenTrack = vi.fn(), onClose = vi.fn()) =>
    render(<TalentTrackView track={track as any} onClose={onClose} onOpenTrack={onOpenTrack} onSelectTask={onSelectTask} />);

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('the talent track on a phone', () => {
    it('is a full-screen sheet that starts on the levels, with where the player stands', () => {
        phone();
        renderTrack();

        expect(screen.getByTestId('window').dataset.sheet).toBe('true');
        expect(screen.queryByTestId('desktop-dialog')).toBeNull();
        expect(document.querySelector('.octane-handheld-sheet.octane-handheld-talent')).toBeTruthy();

        const levels = screen.getByTestId('talent-levels');

        expect(levels.querySelector('.octane-handheld-talent__position')?.textContent).toBe('You are here: Level 2');
        expect(levels.querySelector('.octane-handheld-talent__collected')?.textContent).toBe('1 / 3 levels completed');
        // The begin row and one row per level; the level in progress is marked.
        expect(levels.querySelectorAll('.octane-handheld-talent__level')).toHaveLength(4);
        expect(screen.getByTestId('talent-level-1').dataset.state).toBe('achieved');
        expect(screen.getByTestId('talent-level-2').dataset.state).toBe('current');
        expect(screen.getByTestId('talent-level-3').dataset.state).toBe('locked');
        expect(within(screen.getByTestId('talent-level-2')).getByText('1 / 2')).toBeTruthy();
        expect(screen.queryByTestId('talent-detail')).toBeNull();
    });

    it('opens a level as a page with its rewards and tasks, and goes back to the levels', () => {
        phone();
        renderTrack();

        fireEvent.click(screen.getByTestId('talent-level-2'));

        const detail = screen.getByTestId('talent-detail');

        expect(screen.queryByTestId('talent-levels')).toBeNull();
        expect(detail.dataset.level).toBe('2');
        expect(detail.querySelector('.octane-handheld-talent__title')?.textContent).toBe('Level 2');
        expect(detail.querySelectorAll('.octane-handheld-talent__reward.is-product')).toHaveLength(1);
        // A task without a badge is not drawn; the goal fills the %limit% of the task's text.
        expect(detail.querySelectorAll('.octane-handheld-talent__task')).toHaveLength(2);
        expect(within(screen.getByTestId('talent-task-2')).getByText('Rate 10 Helpers.')).toBeTruthy();
        expect(within(screen.getByTestId('talent-task-2')).getByText('3 / 10')).toBeTruthy();

        fireEvent.click(detail.querySelector('.octane-handheld-talent__back'));

        expect(screen.getByTestId('talent-levels')).toBeTruthy();
        expect(screen.queryByTestId('talent-detail')).toBeNull();
    });

    it('opens the help of a task in progress only', () => {
        const onSelectTask = vi.fn();

        phone();
        renderTrack(onSelectTask);
        fireEvent.click(screen.getByTestId('talent-level-2'));

        expect(screen.getByTestId('talent-task-3').tagName).toBe('DIV');

        fireEvent.click(screen.getByTestId('talent-task-2'));

        expect(onSelectTask).toHaveBeenCalledTimes(1);
        expect(onSelectTask.mock.calls[0][0].id).toBe(2);
    });

    it('shows the start of the track with the way to the citizenship track', () => {
        const onOpenTrack = vi.fn();

        phone();
        renderTrack(vi.fn(), onOpenTrack);
        fireEvent.click(screen.getByTestId('talent-level-begin'));

        const detail = screen.getByTestId('talent-detail');

        expect(detail.dataset.level).toBe('begin');
        expect(detail.querySelector('.octane-handheld-talent__description')?.querySelectorAll('br')).toHaveLength(1);

        fireEvent.click(detail.querySelector('.octane-handheld-talent__button'));

        expect(onOpenTrack).toHaveBeenCalledWith('citizenship');
    });

    it('shows the levels and the level in progress side by side on its side, without a way back', () => {
        phone('landscape');
        renderTrack();

        expect(screen.getByTestId('talent-levels')).toBeTruthy();
        expect(screen.getByTestId('talent-detail').dataset.level).toBe('2');
        expect(screen.getByTestId('talent-level-2').dataset.active).toBe('true');
        expect(document.querySelector('.octane-handheld-talent__back')).toBeNull();

        fireEvent.click(screen.getByTestId('talent-level-3'));

        expect(screen.getByTestId('talent-detail').dataset.level).toBe('3');
        expect(screen.getByTestId('talent-level-3').dataset.active).toBe('true');
        expect(within(screen.getByTestId('talent-detail')).getByText('31 days')).toBeTruthy();
    });

    it('closes from the header', () => {
        const onClose = vi.fn();

        phone();
        renderTrack(vi.fn(), vi.fn(), onClose);
        fireEvent.click(document.querySelector('.octane-handheld-sheet__caption-button.is-close'));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

describe('the talent track on the desktop', () => {
    it('keeps the AIR dialog', () => {
        renderTrack();

        expect(screen.getByTestId('desktop-dialog')).toBeTruthy();
        expect(document.querySelector('.octane-handheld-sheet')).toBeNull();
    });
});
