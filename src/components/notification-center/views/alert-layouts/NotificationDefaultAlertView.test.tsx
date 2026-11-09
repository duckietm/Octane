import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ openUrl: vi.fn() }));

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    LocalizeText: (key: string) => key,
    OpenUrl: mocks.openUrl
}));

vi.mock('../../../../common', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    LayoutNotificationAlertView: ({ children }: { children?: ReactNode }) => <div>{children}</div>
}));

import { NotificationAlertItem, NotificationAlertType } from '../../../../api';
import { NotificationDefaultAlertView } from './NotificationDefaultAlertView';

afterEach(() => {
    cleanup();
    mocks.openUrl.mockReset();
});

describe('NotificationDefaultAlertView', () => {
    it('draws a link alert as habbo_window_alert_link: "ok" as a link on the left, the link as the button', () => {
        const onClose = vi.fn();
        const item = new NotificationAlertItem(['Read the news'], NotificationAlertType.DEFAULT, 'https://example.org', 'Open URL', 'Title');

        render(<NotificationDefaultAlertView item={item} onClose={onClose} />);

        const ok = screen.getByRole('button', { name: 'generic.ok' });
        const link = screen.getByRole('button', { name: 'Open URL' });

        expect(ok.className).toContain('octane-confirm-actions__cancel');
        expect(ok.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'generic.close' })).toBeNull();

        fireEvent.click(link);

        expect(mocks.openUrl).toHaveBeenCalledWith('https://example.org');
        expect(onClose).toHaveBeenCalledTimes(1);

        fireEvent.click(ok);

        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('keeps the one close button when the alert has no link', () => {
        render(<NotificationDefaultAlertView item={new NotificationAlertItem(['Hello'])} onClose={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'generic.close' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'generic.ok' })).toBeNull();
    });
});
