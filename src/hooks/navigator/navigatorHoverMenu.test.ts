import { describe, expect, it } from 'vitest';
import { buildNavigatorHoverItems } from './navigatorHoverMenu';

describe('buildNavigatorHoverItems', () => {
    it('lists the six official rows in order', () => {
        expect(buildNavigatorHoverItems({ homeRoomId: 5, historyCount: 2 }).map((item) => item.id)).toEqual([
            'navigator',
            'home',
            'favorites',
            'create',
            'history',
            'frequent'
        ]);
    });

    it('disables the home row without a home room', () => {
        const byId = (homeRoomId: number) => buildNavigatorHoverItems({ homeRoomId, historyCount: 1 }).find((item) => item.id === 'home');

        expect(byId(0).disabled).toBe(true);
        expect(byId(-1).disabled).toBe(true);
        expect(byId(12).disabled).toBe(false);
    });

    it('disables the history rows until a room was visited', () => {
        const items = buildNavigatorHoverItems({ homeRoomId: 5, historyCount: 0 });

        expect(items.find((item) => item.id === 'history').disabled).toBe(true);
        expect(items.find((item) => item.id === 'frequent').disabled).toBe(true);
        expect(items.filter((item) => item.expandable).map((item) => item.id)).toEqual(['history', 'frequent']);
    });
});
