import { OctaneLogger } from '@octane/renderer';
import { FC, ReactNode } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

interface WidgetErrorBoundaryProps {
    name?: string;
    fallback?: ReactNode;
    /**
     * Values that, when they change, give the widget another go. Without them a widget
     * that crashed once stays gone for the rest of the session, even when what broke it
     * is over - a room id is the usual key.
     */
    resetKeys?: unknown[];
    children: ReactNode;
}

const SilentFallback = (_props: FallbackProps) => null;

/**
 * Wraps a (room) widget so a runtime error inside it degrades gracefully
 * instead of unmounting the whole UI. Errors are logged to OctaneLogger
 * with the widget name.
 *
 * Bonus addition from docs/ARCHITECTURE.md.
 */
export const WidgetErrorBoundary: FC<WidgetErrorBoundaryProps> = ({ name = 'unknown', fallback, resetKeys, children }) => (
    <ErrorBoundary
        FallbackComponent={fallback ? () => <>{fallback}</> : SilentFallback}
        onError={(err) => OctaneLogger.error(`[Widget:${name}] crashed`, err)}
        resetKeys={resetKeys}
    >
        {children}
    </ErrorBoundary>
);
