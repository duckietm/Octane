import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    SanitizeHtml: (html: string) => html,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../../../common', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    LayoutNotificationBubbleView: ({ children }: { children?: React.ReactNode }) => <div data-testid="bubble">{children}</div>
}));

import { NotificationBubbleItem, NotificationBubbleType } from '../../../../api';
import { GetBubbleLayout } from './GetBubbleLayout';

afterEach(cleanup);

describe('the Soundboard bubble', () => {
    it('shows the speaker, the caption and the text', () => {
        render(<>{GetBubbleLayout(new NotificationBubbleItem('Wait 8 seconds', NotificationBubbleType.SOUNDBOARD), () => null)}</>);

        expect(screen.getByTestId('soundboard-icon')).toBeTruthy();
        expect(screen.getByText('Soundboard')).toBeTruthy();
        expect(screen.getByText('Wait 8 seconds')).toBeTruthy();
    });
});
