import { FC, useMemo } from 'react';
import { FriendlyTime, LocalizeText } from '../../../../api';
import { Button, LayoutCurrencyIcon, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useFurnitureRentableSpaceWidget, usePurse } from '../../../../hooks';
import { formatRentableSpacePrice, resolveRentableSpaceView } from './rentableSpace.helpers';

/**
 * The official "For Rent" widget (RWE_RENTABLESPACE, layout `rentablespace`):
 * the rent view with the price button and the reason the rent is refused,
 * the rented view with the renter and the time left, and the error view
 * shown after a failed rent.
 */
export const FurnitureRentableSpaceView: FC<{}> = () => {
    const {
        objectId = -1,
        status = null,
        rentErrorCode = -1,
        canCancelRent = false,
        onClose = null,
        rent = null,
        cancelRent = null
    } = useFurnitureRentableSpaceWidget();
    const { purse = null } = usePurse();
    const view = useMemo(() => resolveRentableSpaceView(status, rentErrorCode, purse?.credits ?? 0), [status, rentErrorCode, purse]);

    if (objectId === -1 || !view) return null;

    return (
        <OctaneCardView className="octane-widget-rentable-space" theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText('rentablespace.widget.title')} onCloseClick={onClose} />
            <OctaneCardContentView>
                {view.mode === 'rent' && (
                    <div className="flex flex-col gap-2" data-testid="rentable-space-rent-view">
                        <Text small wrap>
                            {LocalizeText('rentablespace.widget.instructions')}
                        </Text>
                        <Button className="octane-widget-rentable-space__rent-button" disabled={!view.canRent} onClick={rent}>
                            <span className="flex items-center gap-1">
                                <Text bold>{formatRentableSpacePrice(view.price)}</Text>
                                <LayoutCurrencyIcon type={-1} />
                                <Text bold>{LocalizeText('rentablespace.widget.rent')}</Text>
                            </span>
                        </Button>
                        {!!view.errorKey && (
                            <Text bold small wrap variant="danger">
                                {LocalizeText(view.errorKey)}
                            </Text>
                        )}
                    </div>
                )}
                {view.mode === 'rented' && (
                    <div className="flex flex-col gap-1" data-testid="rentable-space-rented-view">
                        <Text bold>{LocalizeText('rentablespace.widget.rented_to_label')}</Text>
                        <Text italics>{view.renterName}</Text>
                        <Text bold>{LocalizeText('rentablespace.widget.expires_label')}</Text>
                        <Text italics>{FriendlyTime.format(view.timeRemaining)}</Text>
                        {canCancelRent && (
                            <Button className="mt-2" variant="danger" onClick={cancelRent}>
                                {LocalizeText('rentablespace.widget.cancel_rent')}
                            </Button>
                        )}
                    </div>
                )}
                {view.mode === 'error' && (
                    <div className="flex flex-col gap-2" data-testid="rentable-space-error-view">
                        <Text small wrap variant="danger">
                            {LocalizeText(view.errorKey)}
                        </Text>
                        <Button onClick={onClose}>{LocalizeText('rentablespace.widget.close')}</Button>
                    </div>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
