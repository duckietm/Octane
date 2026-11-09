import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutNotificationAlertView } from './LayoutNotificationAlertView';

describe('LayoutNotificationAlertView auto close', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('closes itself once the delay has passed', () => {
        const onClose = vi.fn();

        render(
            <LayoutNotificationAlertView title="Event" onClose={onClose} autoCloseSeconds={120}>
                <div />
            </LayoutNotificationAlertView>
        );

        vi.advanceTimersByTime(119_000);
        expect(onClose).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1_000);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('stays open when no delay was given', () => {
        const onClose = vi.fn();

        render(
            <LayoutNotificationAlertView title="Broadcast" onClose={onClose}>
                <div />
            </LayoutNotificationAlertView>
        );

        vi.advanceTimersByTime(600_000);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('does not close an alert the user already dismissed', () => {
        const onClose = vi.fn();

        const view = render(
            <LayoutNotificationAlertView title="Event" onClose={onClose} autoCloseSeconds={120}>
                <div />
            </LayoutNotificationAlertView>
        );

        view.unmount();
        vi.advanceTimersByTime(120_000);

        expect(onClose).not.toHaveBeenCalled();
    });
});
