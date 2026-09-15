import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

import { MarketplaceChartView } from './MarketplaceChartView';

afterEach(cleanup);

describe('MarketplaceChartView', () => {
    it('draws one polyline through the daily points under the given title', () => {
        render(
            <MarketplaceChartView
                height={51}
                points={[
                    { dayOffset: -30, value: 0 },
                    { dayOffset: 0, value: 10 }
                ]}
                title="Average sale price during last 30 days"
                width={101}
            />
        );

        expect(screen.getByText('Average sale price during last 30 days')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Average sale price during last 30 days' })).toBeInTheDocument();
        expect(screen.getByTestId('marketplace-chart-line')).toHaveAttribute('points', '0,50 100,0');
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('explains the missing data instead of drawing when there is a single day', () => {
        render(<MarketplaceChartView points={[{ dayOffset: 0, value: 10 }]} title="Trade volumes" />);

        expect(screen.getByText('No data (need two days of trading to show graph)')).toBeInTheDocument();
        expect(screen.queryByTestId('marketplace-chart-line')).not.toBeInTheDocument();
    });
});
