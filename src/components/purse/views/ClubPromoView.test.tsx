import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ sent: [] as unknown[], config: {} as Record<string, unknown> }));

vi.mock('../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../api')>()),
    GetOptionalConfigurationValue: (key: string, fallback: unknown) => (key in mocks.config ? mocks.config[key] : fallback),
    localizeWithFallback: (key: string) => key,
    SendMessageComposer: (composer: unknown) => mocks.sent.push(composer)
}));

import { IPurse } from '../../../api';
import { ClubPromoView, isClubPromoVisible } from './ClubPromoView';

const purse = (patch: Partial<IPurse> = {}) => ({ isExpiring: true, clubLevel: 1, minutesUntilExpiration: 5000, ...patch }) as IPurse;

describe('ClubPromoView (AIR ClubDiscountPromoExtension)', () => {
    afterEach(() => {
        cleanup();
        mocks.sent.length = 0;
        mocks.config = {};
    });

    it('shows while a membership runs out, unless switched off', () => {
        expect(isClubPromoVisible(purse(), false)).toBe(true);
        expect(isClubPromoVisible(purse({ isExpiring: false }), false)).toBe(false);
        expect(isClubPromoVisible(purse({ clubLevel: 0 }), false)).toBe(false);
        expect(isClubPromoVisible(purse(), true)).toBe(false);

        mocks.config['club.membership.extend.vip.promotion.enabled'] = false;
        expect(isClubPromoVisible(purse(), false)).toBe(false);
    });

    it('offers the HC or VIP renewal text and asks for the offer on click', () => {
        const { rerender } = render(<ClubPromoView purse={purse()} />);

        fireEvent.click(screen.getByRole('button', { name: 'discount.bar.hc.expiring' }));
        expect(mocks.sent).toHaveLength(1);

        rerender(<ClubPromoView purse={purse({ clubLevel: 2 })} />);
        expect(screen.getByRole('button', { name: 'discount.bar.vip.expiring' })).toBeInTheDocument();
    });
});
