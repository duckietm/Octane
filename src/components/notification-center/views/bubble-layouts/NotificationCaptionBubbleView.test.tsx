import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    SanitizeHtml: (html: string) => html,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../../../common', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    LayoutNotificationBubbleView: ({ children, classNames }: { children?: React.ReactNode; classNames?: string[] }) => (
        <div data-testid="bubble" className={classNames?.join(' ')}>
            {children}
        </div>
    )
}));

import { NotificationBubbleItem, NotificationBubbleType } from '../../../../api';
import { GetBubbleLayout } from './GetBubbleLayout';

afterEach(cleanup);

describe('the captioned bubbles', () => {
    it.each([
        [NotificationBubbleType.WIRED, 'Wired'],
        [NotificationBubbleType.TREASURE_HUNT, 'Treasure hunt'],
        [NotificationBubbleType.NFT_OPENING, 'Collectible reward']
    ])('draws %s with its caption and the text', (type, caption) => {
        render(<>{GetBubbleLayout(new NotificationBubbleItem('Something happened', type), () => null)}</>);

        expect(screen.getByText(caption)).toBeTruthy();
        expect(screen.getByText('Something happened')).toBeTruthy();
        expect(screen.getByTestId('bubble').className).toContain(`octane-caption-notification--${type}`);
    });
});

describe('the nft_opening bubble', () => {
    it('shows the reward icon and its rarity, as AIR passes them', () => {
        const product = { productTypeId: 2, itemTypeId: '1', score: 0, amount: 0, petFigure: '', figureSetIds: [], productCode: 'fx', rarity: 'Epic' };
        const item = new NotificationBubbleItem('Someone received a Witch Chair', NotificationBubbleType.NFT_OPENING, null, null, '', {
            product: product as never,
            rarity: 'Epic',
            rarityColor: 0x6d1c66
        });

        const { container } = render(<>{GetBubbleLayout(item, () => null)}</>);

        expect(screen.getByText('Rarity: Epic')).toBeTruthy();
        expect((screen.getByText('Rarity: Epic') as HTMLElement).style.color).toBe('rgb(109, 28, 102)');
        expect(container.querySelector('.octane-caption-notification__product img')).toBeTruthy();
    });
});

describe('NotificationBubbleType.resolve', () => {
    it('takes the first captioned style asked for, and falls back to info', () => {
        expect(NotificationBubbleType.resolve(undefined, 'wired')).toBe('wired');
        expect(NotificationBubbleType.resolve('treasure_hunt', 'wired')).toBe('treasure_hunt');
        expect(NotificationBubbleType.resolve(undefined, 'floorplan_editor.error')).toBe('info');
    });
});
