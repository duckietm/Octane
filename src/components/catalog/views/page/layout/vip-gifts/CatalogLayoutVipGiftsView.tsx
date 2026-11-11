import { CatalogPageMessageOfferData, SelectClubGiftComposer } from '@octane/renderer';
import { FC, useCallback, useMemo, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../../../api';
import { NativeTextTree } from '../../../../../../common/native-text/NativeTextTree';
import { useClubGifts, usePurse } from '../../../../../../hooks';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { ClubGiftConfirmView } from './ClubGiftConfirmView';
import { ClubGiftText, getGiftRequirementText, getPastClubDaysText } from './clubGifts.helpers';
import { VipGiftItem } from './VipGiftItemView';

let isSelectingGift = false;

const localizeClubGiftText = (text: ClubGiftText | null): string => {
    if (!text) return '';

    if (!text.params) return LocalizeText(text.key);

    const names = ['days', 'months'];
    const values = [text.params.days.toString(), text.params.months.toString()];
    const localized = LocalizeText(text.key, names, values);

    // A text pack may leave the short form empty; the long form carries the same information.
    if ((localized && localized !== text.key) || text.key.endsWith('.long')) return localized;

    return LocalizeText(`${text.key}.long`, names, values);
};

export const CatalogLayoutVipGiftsView: FC<CatalogLayoutProps> = (props) => {
    const { purse = null } = usePurse();
    const { data: clubGifts = null } = useClubGifts();
    const [pendingGift, setPendingGift] = useState<CatalogPageMessageOfferData | null>(null);

    const giftsAvailable = useCallback(() => {
        if (!clubGifts) return '';

        if (clubGifts.giftsAvailable > 0) return LocalizeText('catalog.club_gift.available', ['amount'], [clubGifts.giftsAvailable.toString()]);

        if (clubGifts.daysUntilNextGift > 0) return LocalizeText('catalog.club_gift.days_until_next', ['days'], [clubGifts.daysUntilNextGift.toString()]);

        if (purse?.isVip) return LocalizeText('catalog.club_gift.not_available');

        return LocalizeText('catalog.club_gift.no_club');
    }, [clubGifts, purse]);

    const pastClubDaysText = purse ? localizeClubGiftText(getPastClubDaysText(purse.pastClubDays, purse.pastVipDays)) : '';

    // AIR ClubGiftController.selectGift: the gift's own confirmation window; a second pick replaces the first.
    const selectGift = useCallback(
        (localizationId: string) => setPendingGift(clubGifts?.offers.find((offer) => offer.localizationId === localizationId) ?? null),
        [clubGifts]
    );

    const confirmGift = useCallback(() => {
        const gift = pendingGift;

        setPendingGift(null);

        if (!gift || isSelectingGift) return;

        isSelectingGift = true;

        // The server answers with a fresh ClubGiftInfoEvent, which useClubGifts picks up: the number of gifts
        // left comes from the server, not from a local count.
        SendMessageComposer(new SelectClubGiftComposer(gift.localizationId));

        setTimeout(() => (isSelectingGift = false), 5000);
    }, [pendingGift]);

    const sortGifts = useMemo(() => {
        if (!clubGifts) return [];

        return [...clubGifts.offers].sort((a, b) => clubGifts.getOfferExtraData(a.offerId).daysRequired - clubGifts.getOfferExtraData(b.offerId).daysRequired);
    }, [clubGifts]);

    // AIR layout_club_gifts_xml (360 x 460): the info text, the gift list and the past club days under it
    // (past_vip_days is in the layout but hidden).
    return (
        <NativeTextTree>
            <div className="octane-catalog-club-gifts">
                <div className="octane-catalog-club-gifts__info">{giftsAvailable()}</div>
                <div className="octane-catalog-club-gifts__list">
                    {clubGifts &&
                        sortGifts.map((offer) => {
                            const giftData = clubGifts.getOfferExtraData(offer.offerId);

                            return (
                                <VipGiftItem
                                    key={offer.offerId}
                                    isAvailable={giftData.isSelectable && clubGifts.giftsAvailable > 0}
                                    isVip={giftData.isVip}
                                    offer={offer}
                                    requirementText={purse ? localizeClubGiftText(getGiftRequirementText(giftData, purse, clubGifts.giftsAvailable)) : ''}
                                    onSelect={selectGift}
                                />
                            );
                        })}
                </div>
                <div className="octane-catalog-club-gifts__past">{pastClubDaysText}</div>
                {pendingGift && <ClubGiftConfirmView offer={pendingGift} onCancel={() => setPendingGift(null)} onConfirm={confirmGift} />}
            </div>
        </NativeTextTree>
    );
};
