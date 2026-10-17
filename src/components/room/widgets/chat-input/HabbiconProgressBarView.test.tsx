/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HabbiconProgressBarView } from './HabbiconProgressBarView';

describe('HabbiconProgressBarView', () => {
    afterEach(() => cleanup());

    it('is a progressbar with the collected count and keeps its variant class', () => {
        render(<HabbiconProgressBarView completed={3} total={12} variant="rail" />);

        const bar = screen.getByRole('progressbar');

        expect(bar.getAttribute('aria-valuenow')).toBe('3');
        expect(bar.getAttribute('aria-valuemax')).toBe('12');
        expect(bar.className).toContain('habbicon-progress-bar-rail');
    });

    it('flags a finished bar with data-complete="true" for the css, and an empty set stays at 0', () => {
        const { rerender } = render(<HabbiconProgressBarView completed={12} total={12} variant="set" />);

        expect(screen.getByRole('progressbar').getAttribute('data-complete')).toBe('true');

        rerender(<HabbiconProgressBarView completed={0} total={0} variant="set" />);

        expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
    });
});
