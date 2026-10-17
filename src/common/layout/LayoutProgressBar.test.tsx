/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LayoutProgressBar } from './LayoutProgressBar';

describe('LayoutProgressBar', () => {
    afterEach(() => cleanup());

    it('exposes a determinate progressbar with the value and the label', () => {
        render(<LayoutProgressBar progress={30} maxProgress={120} text="30 / 120" />);

        const bar = screen.getByRole('progressbar', { name: '30 / 120' });

        expect(bar.getAttribute('aria-valuenow')).toBe('30');
        expect(bar.getAttribute('aria-valuemax')).toBe('120');
        expect(bar.getAttribute('aria-valuemin')).toBe('0');
        expect(screen.getByText('30 / 120')).toBeTruthy();
    });

    it('sizes the fill from progress / max and keeps the legacy bar classes', () => {
        const { container } = render(<LayoutProgressBar className="custom" progress={25} />);
        const bar = screen.getByRole('progressbar');
        const fill = container.querySelector('.z-10') as HTMLElement;

        expect(bar.className).toContain('custom');
        expect(bar.className).toContain('bg-[#418db0]');
        expect(fill.style.width).toBe('25%');
    });

    it('clamps the value into the range and survives a zero max', () => {
        render(<LayoutProgressBar progress={500} maxProgress={0} />);

        expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    });
});
