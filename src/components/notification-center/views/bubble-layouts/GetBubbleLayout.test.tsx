import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    OpenUrl: vi.fn(),
    OpenMessengerChat: vi.fn(),
    SanitizeHtml: (html: string) => html,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../../../common', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    LayoutNotificationBubbleView: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
        <div data-testid="bubble" onClick={onClick}>
            {children}
        </div>
    ),
    LayoutAvatarImageView: () => <div data-testid="avatar" />
}));

import { NotificationBubbleItem, NotificationBubbleType } from '../../../../api';
import { GetBubbleLayout } from './GetBubbleLayout';

afterEach(cleanup);

describe('GetBubbleLayout', () => {
    it('shows a friend going offline on the greyed presence strip', () => {
        render(<>{GetBubbleLayout(new NotificationBubbleItem('Sulake is offline', NotificationBubbleType.FRIENDOFFLINE), () => null)}</>);

        const strip = screen.getByTestId('friendoffline-bubble');

        expect(strip.style.filter).toContain('grayscale');
        expect(screen.getByText('Sulake is offline')).toBeTruthy();
    });

    it('shows room messages with the envelope icon', () => {
        render(<>{GetBubbleLayout(new NotificationBubbleItem('New messages in your room', NotificationBubbleType.ROOMMESSAGESPOSTED), () => null)}</>);

        expect(screen.getByTestId('roommessagesposted-icon')).toBeTruthy();
        expect(screen.getByText('New messages in your room')).toBeTruthy();
    });

    it('shows a sound machine song with its caption', () => {
        render(<>{GetBubbleLayout(new NotificationBubbleItem('Now playing Song by Author', NotificationBubbleType.SOUNDMACHINE), () => null)}</>);

        expect(screen.getByTestId('soundmachine-icon')).toBeTruthy();
        expect(screen.getByText('Sound machine')).toBeTruthy();
        expect(screen.getByText('Now playing Song by Author')).toBeTruthy();
    });
});
