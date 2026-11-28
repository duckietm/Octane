/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';

vi.mock('../../api', async () => {
    const actual = await vi.importActual<typeof import('../../api')>('../../api');

    class TestAchievementUtilities extends actual.AchievementUtilities {
        public static getAchievementBadgeCode(achievement: { badgeId: string }): string {
            return achievement?.badgeId ?? null;
        }

        public static getAchievementImageUrl(name: string): string {
            return `/img/${name}.png`;
        }
    }

    const fill = (text: string, params: string[] = [], values: string[] = []) =>
        (params ?? []).reduce((result, param, index) => result.replace(`%${param}%`, values[index]), text);

    return {
        ...actual,
        AchievementUtilities: TestAchievementUtilities,
        GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
        LocalizeBadgeName: (badgeCode: string) => `name:${badgeCode}`,
        LocalizeBadgeDescription: (badgeCode: string) => `description:${badgeCode}`,
        LocalizeText: (key: string, params: string[] = [], values: string[] = []) =>
            fill(`${key}|${(params ?? []).map((p) => `%${p}%`).join(',')}`, params, values),
        localizeWithFallback: (_key: string, fallback: string, params: string[] = [], values: string[] = []) => fill(fallback, params, values)
    };
});
vi.mock('../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

vi.mock('../../common', () => ({
    DraggableWindowPosition: { TOP_CENTER: 'top-center' },
    LayoutBadgeImageView: ({ badgeCode, isGrayscale }: { badgeCode: string; isGrayscale?: boolean }) => (
        <div data-grey={String(!!isGrayscale)} data-testid={`badge-${badgeCode}`} />
    ),
    LayoutCurrencyIcon: ({ type }: { type: number }) => <i data-testid={`currency-${type}`} />
}));

vi.mock('../../common/draggable-window', () => ({
    DraggableWindow: ({ children, handheldSheet }: { children: ReactNode; handheldSheet?: boolean }) => (
        <div data-sheet={String(!!handheldSheet)} data-testid="window">
            {children}
        </div>
    )
}));

// The desktop card is plain markup here, so the desktop branch can be told apart.
vi.mock('../../layout', () => {
    const OctaneCard = ({ children, className }: { children: ReactNode; className: string }) => (
        <div className={className} data-testid="desktop-card">
            {children}
        </div>
    );
    OctaneCard.Header = ({ headerText }: { headerText: string }) => <h1>{headerText}</h1>;
    OctaneCard.Content = ({ children }: { children: ReactNode }) => <div>{children}</div>;

    return { OctaneCard };
});

const state: Record<string, unknown> = {};

vi.mock('../../hooks', () => ({ useAchievements: () => state }));

const { AchievementCategory } = await import('../../api');
const { AchievementsView } = await import('./AchievementsView');

const achievement = (id: number, over: Record<string, unknown> = {}) => ({
    achievementId: id,
    badgeId: `ACH_Test${id}`,
    code: `Test${id}`,
    level: 2,
    levelCount: 5,
    finalLevel: false,
    currentPoints: 3,
    scoreLimit: 10,
    scoreAtStartOfLevel: 5,
    levelRewardPoints: 10,
    levelRewardPointType: 0,
    displayMethod: 0,
    category: 'social',
    state: 1,
    unseen: 0,
    ...over
});

const category = (code: string, achievements: ReturnType<typeof achievement>[]) => {
    const result = new AchievementCategory(code);
    result.achievements = achievements as never;
    return result;
};

const setSelectedCategoryCode = vi.fn();
const setSelectedAchievementId = vi.fn();
const close = vi.fn();
const social = category('social', [
    achievement(1, { unseen: 1 }),
    achievement(2, { finalLevel: true, level: 5 }),
    achievement(3, { level: 1, currentPoints: 0 })
]);
const identity = category('identity', [achievement(4, { category: 'identity' })]);

const setState = (over: Record<string, unknown> = {}) => {
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, {
        isVisible: true,
        isLoaded: true,
        show: vi.fn(),
        close,
        achievementCategories: [social, identity, category('wired_games', []), category('archive', [])],
        selectedCategoryCode: null,
        setSelectedCategoryCode,
        achievementScore: 1234,
        getProgress: 6,
        getMaxProgress: 20,
        selectedCategory: null,
        visibleAchievements: [],
        selectedAchievement: null,
        setSelectedAchievementId,
        ...over
    });
};

const inSocial = (selected = social.achievements[0]) =>
    setState({ selectedCategoryCode: 'social', selectedCategory: social, visibleAchievements: social.achievements, selectedAchievement: selected });

const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));

beforeEach(() => {
    vi.clearAllMocks();
    setState();
});

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('the achievements on a phone', () => {
    it('is a full-screen sheet with the score, the total and the categories as tiles in AIR order', () => {
        phone();
        render(<AchievementsView />);

        expect(screen.getByTestId('window').dataset.sheet).toBe('true');
        expect(screen.queryByTestId('desktop-card')).toBeNull();

        const page = screen.getByTestId('achievement-categories');

        expect(page.querySelector('.octane-handheld-achievements__score')?.textContent).toBe('achievements.categories.score|1234');
        expect(page.querySelector('.octane-handheld-achievements__total')?.textContent).toBe('achievements.categories.totalprogress|6,20');
        // wired_games is never a tile; identity comes before social; the archive last.
        expect([...page.querySelectorAll('.octane-handheld-achievements__tile')].map((tile) => tile.getAttribute('data-testid'))).toEqual([
            'achievement-category-identity',
            'achievement-category-social',
            'achievement-category-archive'
        ]);
        // social: levels done 1 + 5 + 0 of 15, one unseen.
        const tile = screen.getByTestId('achievement-category-social');
        expect(within(tile).getByText('6/15')).toBeTruthy();
        expect(tile.querySelector('.octane-handheld-achievements__unseen')?.textContent).toBe('1');
    });

    it('opens a category from its tile', () => {
        phone();
        render(<AchievementsView />);
        fireEvent.click(screen.getByTestId('achievement-category-social'));

        expect(setSelectedCategoryCode).toHaveBeenCalledWith('social');
    });

    it('lists the achievements of a category as cards with level, progress and reward, and goes back', () => {
        phone();
        inSocial();
        render(<AchievementsView />);

        expect(screen.queryByTestId('achievement-categories')).toBeNull();
        expect(screen.queryByTestId('achievement-detail')).toBeNull();

        const first = screen.getByTestId('achievement-1');
        expect(within(first).getByText('name:ACH_Test1')).toBeTruthy();
        expect(within(first).getByText('achievements.details.level|1,5')).toBeTruthy();
        expect(within(first).getByText('8/15')).toBeTruthy();
        expect(within(first).getByTestId('currency-0')).toBeTruthy();
        expect(first.dataset.unseen).toBe('true');
        // Finished: no progress and no reward; not started: a grey badge.
        expect(screen.getByTestId('achievement-2').querySelector('.octane-handheld-achievements__card-progress')).toBeNull();
        expect(screen.getByTestId('achievement-2').querySelector('.octane-handheld-achievements__reward')).toBeNull();
        expect(screen.getByTestId('badge-ACH_Test3').dataset.grey).toBe('true');

        fireEvent.click(screen.getByTestId('achievement-list').querySelector('.octane-handheld-achievements__back'));

        expect(setSelectedCategoryCode).toHaveBeenCalledWith(null);
    });

    it('opens an achievement as a page and goes back to the list', () => {
        phone();
        inSocial();
        const { rerender } = render(<AchievementsView />);

        fireEvent.click(screen.getByTestId('achievement-2'));

        expect(setSelectedAchievementId).toHaveBeenCalledWith(2);

        inSocial(social.achievements[1]);
        rerender(<AchievementsView />);

        const detail = screen.getByTestId('achievement-detail');
        expect(screen.queryByTestId('achievement-list')).toBeNull();
        expect(detail.dataset.achievement).toBe('2');
        expect(within(detail).getByText('description:ACH_Test2')).toBeTruthy();
        expect(within(detail).getByText('All levels completed')).toBeTruthy();

        fireEvent.click(detail.querySelector('.octane-handheld-achievements__back'));

        expect(screen.getByTestId('achievement-list')).toBeTruthy();
        expect(screen.queryByTestId('achievement-detail')).toBeNull();
    });

    it('shows the list and the selected achievement side by side on its side', () => {
        phone('landscape');
        inSocial();
        render(<AchievementsView />);

        expect(screen.getByTestId('achievement-list')).toBeTruthy();
        expect(screen.getByTestId('achievement-detail').dataset.achievement).toBe('1');
        expect(screen.getByTestId('achievement-1').dataset.active).toBe('true');
        expect(within(screen.getByTestId('achievement-detail')).getByText('achievements.details.reward|')).toBeTruthy();
        expect(screen.getByTestId('achievement-detail').querySelector('.octane-handheld-achievements__back')).toBeNull();
    });

    it('closes from the header', () => {
        phone();
        render(<AchievementsView />);
        fireEvent.click(document.querySelector('.octane-handheld-sheet__caption-button.is-close'));

        expect(close).toHaveBeenCalledTimes(1);
    });

    it('keeps the AIR window on the desktop', () => {
        render(<AchievementsView />);

        expect(screen.getByTestId('desktop-card').className).toContain('octane-achievements-air');
        expect(document.querySelector('.octane-handheld-achievements')).toBeNull();
    });
});
