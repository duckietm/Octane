import { describe, expect, it, vi } from 'vitest';
import { resolveHandheldPeek } from './handheldPeek';

describe('resolveHandheldPeek', () => {
    it('does nothing on desktop or for a window that cannot be put aside', () => {
        expect(resolveHandheldPeek(false, { label: 'Wired' }, true)).toEqual({ hidden: false, canHide: false, barAction: null });
        expect(resolveHandheldPeek(true, undefined, true)).toEqual({ hidden: false, canHide: false, barAction: null });
    });

    it('offers the button on a phone, and the bar once the user put the window aside', () => {
        expect(resolveHandheldPeek(true, { label: 'Wired' }, false)).toEqual({ hidden: false, canHide: true, barAction: null });
        expect(resolveHandheldPeek(true, { label: 'Wired' }, true)).toEqual({ hidden: true, canHide: false, barAction: 'show' });
    });

    it('hides the window while the feature asks for it; the bar then ends what it hid it for', () => {
        expect(resolveHandheldPeek(true, { label: 'Area', forced: true, onReturn: vi.fn() }, false)).toEqual({ hidden: true, canHide: false, barAction: 'return' });
        expect(resolveHandheldPeek(true, { label: 'Area', forced: true }, false)).toEqual({ hidden: true, canHide: false, barAction: null });
    });
});
