import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({ values: {} as Record<string, string> }));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@octane/renderer')>()),
    GetConfiguration: () => ({
        definitions: { has: (key: string) => key in config.values },
        getValue: (key: string) => config.values[key],
        interpolate: (value: string) => value
    })
}));

import { LoadingView } from './LoadingView';

describe('LoadingView (AIR HabboLoadingScreen)', () => {
    afterEach(() => {
        cleanup();
        config.values = {};
        vi.useRealTimers();
    });

    it('shows the logo, the photo splash, a revolving message, the bar and the percentage', () => {
        config.values['client.starting.revolving'] = 'One/Two';
        const { container } = render(<LoadingView progress={45} currentTask="Loading rooms..." />);

        expect(screen.getByAltText('Octane')).toHaveClass('octane-loading__logo');
        expect(container.querySelectorAll('.octane-loading__splash img')).toHaveLength(3);
        expect(['One', 'Two']).toContain(screen.getByRole('status').textContent);
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '45');
        expect(screen.getByText('45%')).toBeInTheDocument();
        expect(screen.getByText('Loading rooms...')).toBeInTheDocument();
    });

    it('turns to the next message while loading', () => {
        vi.useFakeTimers();
        config.values['client.starting.revolving'] = 'One/Two';
        render(<LoadingView progress={10} />);

        const first = screen.getByRole('status').textContent;

        act(() => {
            vi.advanceTimersByTime(2250);
        });

        expect(screen.getByRole('status').textContent).not.toBe(first);
    });

    it('says the load failed, with the error and the way home', () => {
        render(<LoadingView isError message="The server is offline." homeUrl="/home" />);

        expect(screen.getByRole('status')).toHaveTextContent('Loading failed');
        expect(screen.getByText('The server is offline.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Back to Hotel' })).toHaveAttribute('href', '/home');
        expect(screen.queryByRole('progressbar')).toBeNull();
    });
});
