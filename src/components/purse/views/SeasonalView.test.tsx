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

        expect(screen.getByText('Info')).toHaveClass('is-zero');
    });

    it('slides the change over the row and lands on the new balance', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
        const { rerender, container } = render(<SeasonalView type={101} amount={10} />);

        rerender(<SeasonalView type={101} amount={60} />);
        expect(container.querySelector('.seasonal-change')).toHaveTextContent('+50');

        act(() => {
            vi.advanceTimersByTime(1100);
        });

        expect(screen.getByText('60')).toBeInTheDocument();
        expect(container.querySelector('.seasonal-change')).toBeNull();
    });
});
