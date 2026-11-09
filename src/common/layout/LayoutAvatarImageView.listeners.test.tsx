import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutAvatarImageView } from './LayoutAvatarImageView';

const mocks = vi.hoisted(() => ({ listeners: [] as any[], create: vi.fn() }));

vi.mock('@octane/renderer', () => ({
    AvatarScaleType: { LARGE: 'h', SMALL: 'sh' },
    AvatarSetType: { FULL: 'full', HEAD: 'head' },
    GetAvatarRenderManager: () => ({ createAvatarImage: mocks.create })
}));

beforeEach(() => {
    mocks.listeners.length = 0;
    mocks.create.mockReset().mockImplementation((_figure, _scale, _gender, listener) => {
        mocks.listeners.push(listener);
        return null;
    });
});

afterEach(cleanup);

describe('LayoutAvatarImageView download listeners', () => {
    it('retires the old listener on a figure change and on unmount, ignoring late downloads', () => {
        const view = render(<LayoutAvatarImageView figure="hd-1-1" />);
        const first = mocks.listeners[0];

        view.rerender(<LayoutAvatarImageView figure="hd-2-2" />);
        expect(first.disposed).toBe(true);
        expect(mocks.create).toHaveBeenCalledTimes(2);

        first.resetFigure('hd-1-1');
        expect(mocks.create).toHaveBeenCalledTimes(2);

        const latest = mocks.listeners[1];

        view.unmount();
        expect(latest.disposed).toBe(true);

        latest.resetFigure('hd-2-2');
        expect(mocks.create).toHaveBeenCalledTimes(2);
    });

    it('reuses the same listener when the download manager retries the figure', () => {
        render(<LayoutAvatarImageView figure="hd-3-3" />);
        const listener = mocks.listeners[0];

        listener.resetFigure('hd-3-3');

        expect(mocks.create).toHaveBeenCalledTimes(2);
        expect(mocks.listeners[1]).toBe(listener);
        expect(listener.disposed).toBe(false);
    });
});
