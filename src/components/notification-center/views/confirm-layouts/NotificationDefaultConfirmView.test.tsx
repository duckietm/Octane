import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CSSProperties, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../common', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    LayoutNotificationAlertView: ({ children, style }: { children?: ReactNode; style?: CSSProperties }) => (
        <div data-testid="confirm-window" style={style}>
            {children}
        </div>
    )
}));

import { NotificationDefaultConfirmView } from './NotificationDefaultConfirmView';

afterEach(cleanup);

const make = () => ({ message: 'Sure?', onConfirm: vi.fn(), onCancel: vi.fn(), confirmText: 'OK', cancelText: 'Cancel', title: 'Title' }) as never;

describe('NotificationDefaultConfirmView', () => {
    it('confirms from the button and cancels from the link, closing in both cases', () => {
        const item = make() as { onConfirm: () => void; onCancel: () => void };
        const onClose = vi.fn();

        render(<NotificationDefaultConfirmView item={item as never} onClose={onClose} />);
        fireEvent.click(screen.getByText('Cancel'));
        fireEvent.click(screen.getByText('OK'));

        expect(item.onCancel).toHaveBeenCalledTimes(1);
        expect(item.onConfirm).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(2);
        expect(screen.getByText('Cancel').className).toContain('octane-confirm-actions__cancel');
    });

    it("hands AIR's title bar colour to the window, and leaves the window alone without one", () => {
        const { rerender } = render(<NotificationDefaultConfirmView item={{ ...(make() as object), titleBarColor: '#d43d59' } as never} onClose={vi.fn()} />);

        expect(screen.getByTestId('confirm-window').style.getPropertyValue('--octane-confirm-title-bar')).toBe('#d43d59');

        rerender(<NotificationDefaultConfirmView item={make()} onClose={vi.fn()} />);

        expect(screen.getByTestId('confirm-window').style.getPropertyValue('--octane-confirm-title-bar')).toBe('');
    });
});
