/* @vitest-environment jsdom */

import { OctaneLogger } from '@octane/renderer';
import { cleanup, render, screen } from '@testing-library/react';
import { FC } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

// `import { OctaneLogger } from '@octane/renderer'` resolves to
// `src/octane-renderer.mock.ts` via the alias in vitest.config.mts.
// The SUT imports the same path, so both reach the same vi.fn instance.

describe('WidgetErrorBoundary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // react-error-boundary lets React's "uncaught error" log through
        // by default — silence it so jsdom doesn't dump a stack trace
        // every time we deliberately throw below.
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders its children when nothing throws', () => {
        render(
            <WidgetErrorBoundary name="HappyPath">
                <span data-testid="child">visible</span>
            </WidgetErrorBoundary>
        );

        expect(screen.getByTestId('child')).toHaveTextContent('visible');
    });

    it('swallows a render-time error to a silent fallback and logs it', () => {
        const Boom: FC = () => {
            throw new Error('kaboom');
        };

        const { container } = render(
            <WidgetErrorBoundary name="Boom">
                <Boom />
            </WidgetErrorBoundary>
        );

        // Default fallback is `() => null` → boundary subtree is empty.
        expect(container).toBeEmptyDOMElement();

        expect(OctaneLogger.error).toHaveBeenCalledTimes(1);
        const [message, err] = (OctaneLogger.error as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(message).toBe('[Widget:Boom] crashed');
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe('kaboom');
    });

    it('renders a custom fallback node when provided', () => {
        const Boom: FC = () => {
            throw new Error('explode');
        };

        render(
            <WidgetErrorBoundary name="WithFallback" fallback={<div data-testid="fb">offline</div>}>
                <Boom />
            </WidgetErrorBoundary>
        );

        expect(screen.getByTestId('fb')).toHaveTextContent('offline');
    });

    it('uses "unknown" as the widget name when the prop is omitted', () => {
        const Boom: FC = () => {
            throw new Error('anonymous');
        };

        render(
            <WidgetErrorBoundary>
                <Boom />
            </WidgetErrorBoundary>
        );

        expect(OctaneLogger.error).toHaveBeenCalledTimes(1);
        expect((OctaneLogger.error as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('[Widget:unknown] crashed');
    });
});
