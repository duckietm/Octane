import { FurnitureType } from '@octane/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { Button, LayoutCurrencyIcon, LayoutFurniImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';
import { useRentConfirmation } from '../../../hooks';
import { getRentConfirmationPresentation, getRentConfirmationPrice } from './rentConfirmation.helpers';

/**
 * The official rent confirmation window (layout `rent_confirmation`): the
 * furni image, the rental description for an extension, the furni name and
 * the price, with Cancel / OK (Buy for a buy-out).
 */
export const RentConfirmationView: FC<{}> = () => {
    const { request = null, offer = null, confirm = null, close = null } = useRentConfirmation();

    if (!request || !offer) return null;

    const presentation = getRentConfirmationPresentation(offer.buyout);
    const price = getRentConfirmationPrice(offer);
    const furniData = request.furniData;

    return (
        <OctaneCardView className="octane-rent-confirmation" theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText(presentation.titleKey)} onCloseClick={close} />
            <OctaneCardContentView>
                <div className="flex gap-3">
                    <div className="octane-rent-confirmation__image">
                        <LayoutFurniImageView direction={90} productClassId={furniData.id} productType={furniData.type === FurnitureType.WALL ? 'i' : 's'} />
                    </div>
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                        {presentation.showRentalDescription && (
                            <Text small wrap>
                                {LocalizeText('rent.confirmation.rental.description')}
                            </Text>
                        )}
                        <Text bold wrap>
                            {furniData.name}
                        </Text>
                        <div className="flex items-center gap-1">
                            <Text>{LocalizeText('catalog.purchase.confirmation.dialog.cost')}</Text>
                            <Text bold>{price.amount}</Text>
                            <LayoutCurrencyIcon type={price.currencyType} />
                        </div>
                    </div>
                </div>
                <div className="flex justify-between mt-3">
                    <Button variant="secondary" onClick={close}>
                        {LocalizeText('generic.cancel')}
                    </Button>
                    <Button variant="success" onClick={confirm}>
                        {LocalizeText(presentation.okKey)}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
