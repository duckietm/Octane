import { SelectClubGiftComposer } from '@octane/renderer';
import { FC, useCallback, useMemo } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../../../api';
import { AutoGrid, Text } from '../../../../../../common';
import { useClubGifts, useNotification, usePurse } from '../../../../../../hooks';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { VipGiftItem } from './VipGiftItemView';

let isSelectingGift = false;

export const CatalogLayoutVipGiftsView: FC<CatalogLayoutProps> = (props) => {
    const { purse = null } = usePurse();
    const { data: clubGifts = null } = useClubGifts();
    const { showConfirm = null } = useNotification();

    const giftsAvailable = useCallback(() => {
        if (!clubGifts) return '';

        if (clubGifts.giftsAvailable > 0) return LocalizeText('catalog.club_gift.available', ['amount'], [clubGifts.giftsAvailable.toString()]);

        if (clubGifts.daysUntilNextGift > 0) return LocalizeText('catalog.club_gift.days_until_next', ['days'], [clubGifts.daysUntilNextGift.toString()]);

        if (purse.isVip) return LocalizeText('catalog.club_gift.not_available');

        return LocalizeText('catalog.club_gift.no_club');
    }, [clubGifts, purse]);

    const selectGift = useCallback(
        (localizationId: string) => {
            showConfirm(
                LocalizeText('catalog.club_gift.confirm'),
                () => {
                    if (isSelectingGift) return;

                    isSelectingGift = true;

                    // The server replies with a fresh ClubGiftInfoEvent after
                    // accepting the selection; useClubGifts subscribes to that
                    // event via useOctaneEventInvalidator, so giftsAvailable
                    // refreshes from the authoritative source — no need to
                    // mutate the parser locally.
                    SendMessageComposer(new SelectClubGiftComposer(localizationId));

                    setTimeout(() => (isSelectingGift = false), 5000);
                },
                null
            );
        },
        [showConfirm]
    );

    const sortGifts = useMemo(() => {
        if (!clubGifts) return [];

        return [...clubGifts.offers].sort((a, b) => clubGifts.getOfferExtraData(a.offerId).daysRequired - clubGifts.getOfferExtraData(b.offerId).daysRequired);
    }, [clubGifts]);

    return (
        <>
            <Text shrink truncate fontWeight="bold">
                {giftsAvailable()}
            </Text>
            <AutoGrid className="octane-catalog-layout-vip-gifts-grid" columnCount={1}>
                {clubGifts &&
                    clubGifts.offers.length > 0 &&
                    sortGifts.map((offer) => (
                        <VipGiftItem
                            key={offer.offerId}
                            daysRequired={clubGifts.getOfferExtraData(offer.offerId).daysRequired}
                            isAvailable={clubGifts.getOfferExtraData(offer.offerId).isSelectable && clubGifts.giftsAvailable > 0}
                            offer={offer}
                            onSelect={selectGift}
                        />
                    ))}
            </AutoGrid>
        </>
    );
};
