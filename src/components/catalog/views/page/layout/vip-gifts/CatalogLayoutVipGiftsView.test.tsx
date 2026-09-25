import { SelectClubGiftComposer } from '@octane/renderer';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SendMessageComposer } from '../../../../../../api';
import { useClubGifts, useNotification, usePurse } from '../../../../../../hooks';
import { CatalogLayoutVipGiftsView } from './CatalogLayoutVipGiftsView';

const textOverrides = vi.hoisted(() => new Map<string, string>());

vi.mock('../../../../../../api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../../../api')>();

    return {
        ...actual,
        LocalizeText: (key: string, _names?: string[], values?: string[]) =>
            textOverrides.has(key) ? textOverrides.get(key) : values?.length ? `${key}:${values.join(',')}` : key,
        ProductImageUtility: { getProductCategory: () => 1, getProductImageUrl: () => '' },
        SendMessageComposer: vi.fn()
    };
});

vi.mock('../../../../../../hooks', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../../../hooks')>();

    return {
        ...actual,
        useClubGifts: vi.fn(),
        useNotification: vi.fn(),
        usePurse: vi.fn()
    };
});

const offer = (offerId: number, localizationId: string, furniClassId: number) => ({
    localizationId,
    offerId,
    products: [{ extraParam: '', furniClassId, productType: 's' }]
});

const clubGifts = (giftsAvailable: number, daysUntilNextGift = 0) => {
    const giftData = new Map([
        [1, { daysRequired: 31, isSelectable: true, isVip: false, offerId: 1 }],
        [2, { daysRequired: 93, isSelectable: false, isVip: true, offerId: 2 }]
    ]);

    return {
        daysUntilNextGift,
        getOfferExtraData: (offerId: number) => giftData.get(offerId),
        giftsAvailable,
        offers: [offer(2, 'gift_two', 20), offer(1, 'gift_one', 10)]
    };
};

const showConfirm = vi.fn();

const renderView = () => render(<CatalogLayoutVipGiftsView page={{ layoutCode: 'club_gifts' } as any} hideNavigation={() => undefined} />);

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
    textOverrides.clear();
    vi.mocked(useNotification).mockReturnValue({ showConfirm } as any);
    vi.mocked(usePurse).mockReturnValue({ purse: { isVip: true, pastClubDays: 20, pastVipDays: 13 } } as any);
    vi.mocked(useClubGifts).mockReturnValue({ data: clubGifts(2) } as any);
});

describe('club gifts page', () => {
    it('shows the gift state and the past club and vip days', () => {
        renderView();

        expect(screen.getByText('catalog.club_gift.available:2')).toBeInTheDocument();
        expect(screen.getByText('catalog.club_gift.past_club.long:2,1')).toBeInTheDocument();
        expect(screen.getByText('catalog.club_gift.past_vip:13,0')).toBeInTheDocument();
    });

    it('omits the past days lines while the purse is unknown', () => {
        vi.mocked(usePurse).mockReturnValue({ purse: null } as any);
        vi.mocked(useClubGifts).mockReturnValue({ data: clubGifts(0) } as any);

        renderView();

        expect(screen.getByText('catalog.club_gift.no_club')).toBeInTheDocument();
        expect(screen.queryByText(/catalog\.club_gift\.past_club/)).not.toBeInTheDocument();
        expect(screen.queryByText(/catalog\.club_gift\.past_vip/)).not.toBeInTheDocument();
    });

    it('falls back to the long past-club text when the pack leaves the short form empty', () => {
        textOverrides.set('catalog.club_gift.past_club', '');
        vi.mocked(usePurse).mockReturnValue({ purse: { isVip: true, pastClubDays: 10, pastVipDays: 2 } } as any);

        renderView();

        expect(screen.getByText('catalog.club_gift.past_club.long:12,0')).toBeInTheDocument();
        expect(screen.getByText('catalog.club_gift.past_vip:2,0')).toBeInTheDocument();
    });

    it('lists each gift with its requirement, description and vip mark, by days required', () => {
        const { container } = renderView();
        const rows = container.querySelectorAll('.octane-catalog-club-gift');

        expect(rows).toHaveLength(2);

        const [clubGift, vipGift] = Array.from(rows) as HTMLElement[];

        expect(within(clubGift).getByText('roomItem.name.10')).toBeInTheDocument();
        expect(within(clubGift).getByText('roomItem.desc.10')).toBeInTheDocument();
        expect(within(clubGift).getByText('catalog.club_gift.selectable')).toBeInTheDocument();
        expect(clubGift.querySelector('.octane-club-compact-mark.is-vip')).toBeNull();

        expect(within(vipGift).getByText('roomItem.name.20')).toBeInTheDocument();
        expect(within(vipGift).getByText('roomItem.desc.20')).toBeInTheDocument();
        expect(within(vipGift).getByText('catalog.club_gift.vip_missing.long:18,2')).toBeInTheDocument();
        expect(vipGift.querySelector('.octane-club-compact-mark.is-vip')).not.toBeNull();
    });

    it('enables the select button only for a selectable gift while gifts are available', () => {
        renderView();

        const [selectable, locked] = screen.getAllByRole('button', { name: 'catalog.club_gift.select' });

        expect(selectable).toHaveAttribute('aria-disabled', 'false');
        expect(locked).toHaveAttribute('aria-disabled', 'true');

        fireEvent.click(locked);

        expect(showConfirm).not.toHaveBeenCalled();
    });

    it('disables every select button when no gift is available', () => {
        vi.mocked(useClubGifts).mockReturnValue({ data: clubGifts(0, 4) } as any);

        renderView();

        expect(screen.getByText('catalog.club_gift.days_until_next:4')).toBeInTheDocument();

        for (const button of screen.getAllByRole('button', { name: 'catalog.club_gift.select' })) {
            expect(button).toHaveAttribute('aria-disabled', 'true');
        }
    });

    it('sends the selection after the confirmation', () => {
        showConfirm.mockImplementation((_message: string, onConfirm: () => void) => onConfirm());

        renderView();

        fireEvent.click(screen.getAllByRole('button', { name: 'catalog.club_gift.select' })[0]);

        expect(showConfirm).toHaveBeenCalledWith('catalog.club_gift.confirm', expect.any(Function), null);
        expect(SendMessageComposer).toHaveBeenCalledTimes(1);
        expect(vi.mocked(SendMessageComposer).mock.calls[0][0]).toBeInstanceOf(SelectClubGiftComposer);
        expect((vi.mocked(SendMessageComposer).mock.calls[0][0] as any).getMessageArray()).toEqual(['gift_one']);
    });
});
