import { describe, expect, it } from 'vitest';
import {
    buildEnforceCategoryUpdate,
    ENFORCE_CATEGORY_TRADE_KEYS,
    getEnforceableCategories,
    shouldReloadRoomListAfterSettingsSaved
} from './navigatorEnforceCategory';

const category = (id: number, overrides: Partial<{ visible: boolean; automatic: boolean; staffOnly: boolean }> = {}) => ({
    id,
    name: `cat_${id}`,
    visible: true,
    automatic: false,
    staffOnly: false,
    ...overrides
});

describe('getEnforceableCategories', () => {
    it('keeps visible, non-automatic categories and hides staff-only ones from players', () => {
        const categories = [category(1), category(2, { automatic: true }), category(3, { staffOnly: true }), category(4, { visible: false })];

        expect(getEnforceableCategories(categories, 0).map((entry) => entry.id)).toEqual([1]);
    });

    it('shows staff-only categories to staff (security level 7 and above)', () => {
        const categories = [category(1), category(3, { staffOnly: true })];

        expect(getEnforceableCategories(categories, 7).map((entry) => entry.id)).toEqual([1, 3]);
        expect(getEnforceableCategories(categories, 6).map((entry) => entry.id)).toEqual([1]);
    });

    it('copes with a missing list', () => {
        expect(getEnforceableCategories(null, 9)).toEqual([]);
        expect(getEnforceableCategories(undefined, 9)).toEqual([]);
    });
});

describe('buildEnforceCategoryUpdate', () => {
    const categories = [category(10), category(20), category(30)];

    it('sends the chosen category id and trade mode for the current room', () => {
        expect(buildEnforceCategoryUpdate(55, categories, 1, 2)).toEqual({ roomId: 55, categoryId: 20, tradeMode: 2 });
    });

    it('clamps out-of-range selections like the official Math.max(0, selection)', () => {
        expect(buildEnforceCategoryUpdate(55, categories, -1, -1)).toEqual({ roomId: 55, categoryId: 10, tradeMode: 0 });
        expect(buildEnforceCategoryUpdate(55, categories, 99, 99)).toEqual({ roomId: 55, categoryId: 30, tradeMode: ENFORCE_CATEGORY_TRADE_KEYS.length - 1 });
    });

    it('refuses to send without a room or without categories', () => {
        expect(buildEnforceCategoryUpdate(0, categories, 0, 0)).toBeNull();
        expect(buildEnforceCategoryUpdate(55, [], 0, 0)).toBeNull();
    });
});

describe('shouldReloadRoomListAfterSettingsSaved', () => {
    it('reloads only the open "my rooms" list', () => {
        expect(shouldReloadRoomListAfterSettingsSaved(true, 'myworld_view')).toBe(true);
        expect(shouldReloadRoomListAfterSettingsSaved(false, 'myworld_view')).toBe(false);
        expect(shouldReloadRoomListAfterSettingsSaved(true, 'hotel_view')).toBe(false);
        expect(shouldReloadRoomListAfterSettingsSaved(true, null)).toBe(false);
    });
});
