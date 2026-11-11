import { CatalogPageMessageOfferData } from '@octane/renderer';
import { FC, MutableRefObject } from 'react';
import { LocalizeText, ProductImageUtility } from '../../../../../../api';
import { LayoutImage, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../../../common';
import { BaseButton } from '../../../../../../common/BaseButton';
import { InlineDialog } from '../../../../../../common/InlineDialog';
import { NativeTextTree } from '../../../../../../common/native-text/NativeTextTree';
import { getClubGiftFurniText } from './clubGifts.helpers';
import { getGiftFurniData } from './VipGiftItemView';

interface ClubGiftConfirmViewProps {
    offer: CatalogPageMessageOfferData;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * AIR ClubGiftConfirmationDialog (layout club_gift_confirmation, 280 x 142): the gift's image in a 48 x 48 box, its
 * furnidata name beside it, and the select and cancel buttons under them. The title is catalog.club_gift.confirm.
 */
export const ClubGiftConfirmView: FC<ClubGiftConfirmViewProps> = (props) => {
    const { offer, onCancel, onConfirm } = props;
    const product = offer?.products?.[0];
    const imageUrl = product ? ProductImageUtility.getProductImageUrl(product.productType, product.furniClassId, product.extraParam) : '';
    const name = getClubGiftFurniText(getGiftFurniData(offer), 'name', (key) => LocalizeText(key));
    const title = LocalizeText('catalog.club_gift.confirm');

    return (
        <NativeTextTree>
            <InlineDialog
                aria-label={title}
                aria-modal="true"
                modal="trap-focus"
                render={({ ref, ...popupProps }) => (
                    <OctaneCardView
                        {...popupProps}
                        innerRef={ref as MutableRefObject<HTMLDivElement>}
                        classNames={['octane-club-gift-confirm']}
                        frameStyle={3}
                        isResizable={false}
                        theme="primary-slim"
                    />
                )}
                onClose={onCancel}
            >
                <OctaneCardHeaderView headerText={title} onCloseClick={onCancel} />
                <OctaneCardContentView classNames={['octane-club-gift-confirm-content']} overflow="hidden">
                    <div className="octane-club-gift-confirm-image">
                        <LayoutImage imageUrl={imageUrl} />
                    </div>
                    <div className="octane-club-gift-confirm-name">{name}</div>
                    <BaseButton className="octane-club-gift-confirm-button is-select" type="button" onClick={onConfirm}>
                        {LocalizeText('catalog.club_gift.select')}
                    </BaseButton>
                    <BaseButton className="octane-club-gift-confirm-button is-cancel" type="button" onClick={onCancel}>
                        {LocalizeText('cancel')}
                    </BaseButton>
                </OctaneCardContentView>
            </InlineDialog>
        </NativeTextTree>
    );
};
