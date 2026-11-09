import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LayoutNotificationBubbleView, NOTIFICATION_DISPLAY_MS, NOTIFICATION_FADE_IN_MS } from './LayoutNotificationBubbleView';

describe('LayoutNotificationBubbleView', () => {
    afterEach(() => vi.useRealTimers());

    it('stays while hovered and fades once the pointer leaves after the display time', async () => {
        vi.useFakeTimers();

        const onClose = vi.fn();

        render(
            <LayoutNotificationBubbleView onClose={onClose}>
                <span>hello</span>
            </LayoutNotificationBubbleView>
        );

        fireEvent.mouseEnter(screen.getByText('hello').parentElement);
        act(() => {
            vi.advanceTimersByTime(NOTIFICATION_FADE_IN_MS + NOTIFICATION_DISPLAY_MS + 5000);
        });

        expect(screen.queryByText('hello')).not.toBeNull();

        vi.useRealTimers();
        fireEvent.mouseLeave(screen.getByText('hello').parentElement);

        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 3000 });
    });

    it('fades out on click unless told not to', async () => {
        const onClose = vi.fn();
        const onClick = vi.fn();

        const { rerender } = render(
            <LayoutNotificationBubbleView closeOnClick={false} onClick={onClick} onClose={onClose}>
                <span>offer</span>
            </LayoutNotificationBubbleView>
        );

        fireEvent.click(screen.getByText('offer'));
        expect(onClick).toHaveBeenCalledTimes(1);

        rerender(
            <LayoutNotificationBubbleView onClick={onClick} onClose={onClose}>
                <span>offer</span>
            </LayoutNotificationBubbleView>
        );

        fireEvent.click(screen.getByText('offer'));

        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 3000 });
    });
});
