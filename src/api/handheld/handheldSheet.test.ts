import { describe, expect, it } from 'vitest';
import { sheetDragIntent, sheetPullDistance, shouldDismissSheet } from './handheldSheet';

describe('handheld sheet pulls', () => {
    it('only follows a pull downwards', () => {
        expect(sheetPullDistance(300, 340)).toBe(40);
        expect(sheetPullDistance(300, 260)).toBe(0);
    });

    it('dismisses after a third of the sheet, and never for less than a short pull', () => {
        expect(shouldDismissSheet(63, 100)).toBe(false);
        expect(shouldDismissSheet(64, 100)).toBe(true);
        expect(shouldDismissSheet(100, 400)).toBe(false);
        expect(shouldDismissSheet(120, 400)).toBe(true);
    });
});

describe('sheetDragIntent', () => {
    it('takes a finger that barely moved for a tap on the grip', () => {
        expect(sheetDragIntent(0, false, 140)).toBe('toggle');
        expect(sheetDragIntent(-5, true, 500)).toBe('toggle');
    });

    it('opens the peek on a pull up, and leaves the open drawer alone', () => {
        expect(sheetDragIntent(-27, false, 140)).toBe('none');
        expect(sheetDragIntent(-28, false, 140)).toBe('expand');
        expect(sheetDragIntent(-80, true, 500)).toBe('none');
    });

    it('folds the open drawer on a pull down instead of closing it', () => {
        expect(sheetDragIntent(20, true, 500)).toBe('none');
        expect(sheetDragIntent(300, true, 500)).toBe('collapse');
    });

    it('closes the peek once it is pulled far enough down', () => {
        expect(sheetDragIntent(40, false, 140)).toBe('none');
        expect(sheetDragIntent(64, false, 140)).toBe('dismiss');
    });
});
