import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const openUrl = vi.fn();

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    OpenUrl: (url: string) => openUrl(url),
    SanitizeHtml: (html: string) => html,
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../../../common', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    LayoutNotificationAlertView: ({ children, title, type }: { children?: React.ReactNode; title?: string; type?: string }) => (
        <div data-testid="alert" data-title={title} data-type={type}>
            {children}
        </div>
    ),
    Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
        <button type="button" onClick={onClick}>
            {children}
        </button>
    ),
    LayoutCurrencyIcon: () => <i data-testid="hc-icon" />
}));

import { NotificationAlertItem, NotificationAlertType } from '../../../../api';
import { GetAlertLayout } from './GetAlertLayout';
import { CLUB_PROMO_LINK_KEY, CLUB_PROMO_TEXT_KEY } from './NotificationClubPromoAlertView';

afterEach(cleanup);
beforeEach(() => openUrl.mockClear());

describe('GetAlertLayout', () => {
    it('renders the epic popup as one picture with a Close button', () => {
        const onClose = vi.fn();
        const item = new NotificationAlertItem([], NotificationAlertType.EPIC, null, null, '', 'https://cdn.test/campaign.png');

        render(<>{GetAlertLayout(item, onClose)}</>);

        expect(screen.getByTestId('alert').dataset.type).toBe('epic');
        expect(screen.getByTestId('epic-popup-image').querySelector('img')?.getAttribute('src')).toBe('https://cdn.test/campaign.png');

        fireEvent.click(screen.getByText('Close'));

        expect(onClose).toHaveBeenCalled();
    });

    it('renders the room-limit alert with the HC promo strip opening the club page', () => {
        const onClose = vi.fn();
        const data = new Map([
            [CLUB_PROMO_TEXT_KEY, 'HC members can have more rooms! >>'],
            [CLUB_PROMO_LINK_KEY, 'catalog/open/habbo_club']
        ]);
        const item = new NotificationAlertItem(
            ['You are not allowed to own more than 3 rooms.'],
            NotificationAlertType.CLUB_PROMO,
            null,
            null,
            'Cannot create room',
            null,
            null,
            data
        );

        render(<>{GetAlertLayout(item, onClose)}</>);

        expect(screen.getByTestId('alert').dataset.title).toBe('Cannot create room');
        expect(screen.getByText('You are not allowed to own more than 3 rooms.')).toBeTruthy();
        expect(screen.getByTestId('hc-icon')).toBeTruthy();

        fireEvent.click(screen.getByTestId('club-promo-strip'));

        expect(openUrl).toHaveBeenCalledWith('catalog/open/habbo_club');
        expect(onClose).toHaveBeenCalled();
    });
});
