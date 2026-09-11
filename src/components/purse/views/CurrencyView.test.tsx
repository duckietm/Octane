import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api', () => ({
    LocalizeFormattedNumber: (value: number) => value.toString(),
    LocalizeShortNumber: (value: number) => `${Math.round(value / 100) / 10}K`
}));

vi.mock('../../../assets/images/purse/air/credits.png', () => ({ default: 'credits.png' }));
vi.mock('../../../assets/images/purse/air/diamond.png', () => ({ default: 'diamond.png' }));
vi.mock('../../../assets/images/purse/air/duckets.png', () => ({ default: 'duckets.png' }));

vi.mock('../../../common', () => ({
    Flex: ({ children }: { children: unknown }) => <div>{children as string}</div>,
    LayoutCurrencyIcon: () => <i />,
    Text: ({ children }: { children: unknown }) => <span>{children as string}</span>
}));

import { CurrencyView } from './CurrencyView';
import { CURRENCY_CHANGE_OVERLAY_MS } from './currencyChange';

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('CurrencyView', () => {
    it('shows no flyover for the first amount it receives', () => {
        render(<CurrencyView amount={37} short={false} type={-1} />);

        expect(screen.getByText('37')).toBeInTheDocument();
        expect(screen.queryByTestId('purse-currency-change')).not.toBeInTheDocument();
    });

    it('flies the signed difference over the indicator when the balance changes, then hides it', () => {
        const { rerender } = render(<CurrencyView amount={37} short={false} type={-1} />);

        rerender(<CurrencyView amount={42} short={false} type={-1} />);
        expect(screen.getByTestId('purse-currency-change')).toHaveTextContent('+5');

        rerender(<CurrencyView amount={40} short={false} type={-1} />);
        expect(screen.getByTestId('purse-currency-change')).toHaveTextContent('-2');

        act(() => {
            vi.advanceTimersByTime(CURRENCY_CHANGE_OVERLAY_MS);
        });

        expect(screen.queryByTestId('purse-currency-change')).not.toBeInTheDocument();
        expect(screen.getByText('40')).toBeInTheDocument();
    });
});
