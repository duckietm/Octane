import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    links: [] as string[],
    config: {} as Record<string, unknown>
}));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@octane/renderer')>()),
    CreateLinkEvent: (link: string) => mocks.links.push(link)
}));

vi.mock('../../../api', async (importOriginal) => {
    const value = (key: string, fallback: unknown) => (key in mocks.config ? mocks.config[key] : fallback);

    return {
        ...(await importOriginal<typeof import('../../../api')>()),
        GetConfigurationValue: value,
        GetOptionalConfigurationValue: value,
        localizeWithFallback: (key: string, fallback: string) => (key === 'seasonal.name.snowflakes' ? 'Snowflakes' : fallback)
    };
});

import { SeasonalView } from './SeasonalView';

describe('SeasonalView (AIR SeasonalCurrencyIndicator)', () => {
    beforeEach(() => {
        mocks.config = { 'activitypoint.name.101': 'seasonal.name.snowflakes', 'seasonalcurrencyindicator.page': 'snowflakes' };
    });

    afterEach(() => {
        cleanup();
        mocks.links.length = 0;
        vi.useRealTimers();
    });

    it('names the currency from activitypoint.name.<type> and opens the indicator page', () => {
        render(<SeasonalView type={101} amount={1500} />);

        expect(screen.getByText('Snowflakes')).toBeInTheDocument();
        expect(screen.getByText('1500')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button'));
        expect(mocks.links).toEqual(['catalog/open/snowflakes']);
    });

    it('shows the zero text underlined at 0', () => {
        render(<SeasonalView type={101} amount={0} />);

        expect(screen.getByText('Info').closest('.seasonal-amount')).toHaveClass('is-zero');
    });

    it('holds the old balance for the first half, then counts to the new one while the overlay crosses the row (40 ticks of 40 ms)', () => {
        vi.useFakeTimers();
        const { rerender, container } = render(<SeasonalView type={101} amount={10} />);

        rerender(<SeasonalView type={101} amount={60} />);

        const overlay = () => container.querySelector<HTMLElement>('.seasonal-change');

        expect(overlay()).toHaveTextContent('+50');
        expect(overlay()?.style.left).toBe('0px');
        expect(screen.getByText('10')).toBeInTheDocument();

        // 20 ticks: progress 0.5, the overlay at the middle of 192 - 33 and fully shown, the counter still on the old balance.
        act(() => {
            vi.advanceTimersByTime(20 * 40);
        });

        expect(overlay()?.style.left).toBe('80px');
        expect(overlay()?.style.opacity).toBe('1');
        expect(screen.getByText('10')).toBeInTheDocument();

        // 30 ticks: progress 0.75, halfway through the count.
        act(() => {
            vi.advanceTimersByTime(10 * 40);
        });

        expect(screen.getByText('35')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(10 * 40);
        });

        expect(screen.getByText('60')).toBeInTheDocument();
        expect(overlay()).toBeNull();
    });

    it('starts no change for the first balance', () => {
        const { container } = render(<SeasonalView type={101} amount={60} />);

        expect(container.querySelector('.seasonal-change')).toBeNull();
    });
});
