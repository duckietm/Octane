import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CatalogLoadingStateView } from './CatalogLoadingStateView';

describe('catalog loading feedback', () => {
    it('announces page loading without replacing the catalog shell', () => {
        render(<CatalogLoadingStateView />);

        expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
        expect(screen.getByRole('status')).toHaveTextContent('Loading...');
        expect(screen.getByRole('status')).not.toHaveTextContent('catalog.loading');
    });

    it('turns a timed-out page request into a recoverable retry action', () => {
        let retries = 0;

        render(<CatalogLoadingStateView error="timeout" onRetry={() => retries++} />);

        expect(screen.getByRole('alert')).toHaveTextContent('The catalog page took too long to load.');
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
        expect(retries).toBe(1);
    });
});
