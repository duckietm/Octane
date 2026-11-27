import { FC } from 'react';
import { formatQuestWaitTime, localizeWithFallback } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { RENTABLE_SPACE_ERROR_TEXTS, useFurnitureRentableSpaceWidget } from '../../../../hooks';
import '../../../../css/room/RoomWidgetsSweepAir.css';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const errorText = (code: number) => {
    const entry = RENTABLE_SPACE_ERROR_TEXTS.get(code);

    return entry ? localizeWithFallback(entry.key, entry.fallback) : '';
};

/** AIR rentablespace_xml: one 256px frame holding the rent view, the rented view or the error view. */
export const FurnitureRentableSpaceView: FC<{}> = () => {
    const {
        isOpen = false,
        status = null,
        rentView = null,
        errorCode = 0,
        canCancelRent = false,
        rent = null,
        cancelRent = null,
        onClose = null
    } = useFurnitureRentableSpaceWidget();

    if (!isOpen || !status) return null;

    const rentErrorText = rentView && rentView.errorCode ? errorText(rentView.errorCode) : '';

    return (
        <NativeTextTree>
            <OctaneCardView className="octane-widget-rentablespace" theme="primary-slim" uniqueKey="rentablespace">
                <OctaneCardHeaderView headerText={localizeWithFallback('rentablespace.widget.title', 'For rent')} onCloseClick={onClose} />
                <OctaneCardContentView>
                    {errorCode > 0 && (
                        <div className="rentablespace-error-view">
                            <Text className="rentablespace-error-message">{errorText(errorCode)}</Text>
                            <Button variant="secondary" onClick={onClose}>{localizeWithFallback('rentablespace.widget.close', 'Close')}</Button>
                        </div>
                    )}
                    {errorCode === 0 && !status.rented && (
                        <div className="rentablespace-rent-view">
                            <Text className="rentablespace-instructions">
                                {localizeWithFallback(
                                    'rentablespace.widget.instructions',
                                    'Use this space and decorate it as you like. When the rent ends, all your furni goes safely back to your inventory.'
                                )}
                            </Text>
                            <Button className="rentablespace-rent-button" variant="secondary" disabled={!rentView?.rentEnabled} onClick={rent}>
                                <span className="rentablespace-price">{`${status.price} x`}</span>
                                <i className="rentablespace-coin" />
                                <span className="rentablespace-rent-label">{localizeWithFallback('rentablespace.widget.rent', 'Rent')}</span>
                            </Button>
                            <div className="rentablespace-rent-footer">
                                {rentErrorText ? <Text className="rentablespace-cant-rent">{rentErrorText}</Text> : <span />}
                                <i className="rentablespace-habboclub" />
                            </div>
                        </div>
                    )}
                    {errorCode === 0 && status.rented && (
                        <div className="rentablespace-rented-view">
                            <Text className="rentablespace-headline">
                                {localizeWithFallback('rentablespace.widget.rented_to_label', 'This space is rented to:')}
                            </Text>
                            <Text italics>{status.renterName}</Text>
                            <Text className="rentablespace-headline">{localizeWithFallback('rentablespace.widget.expires_label', 'Rent expires in:')}</Text>
                            <Text italics>{formatQuestWaitTime(status.timeRemaining)}</Text>
                            {canCancelRent && (
                                <Button className="rentablespace-cancel-button" variant="secondary" onClick={cancelRent}>
                                    {localizeWithFallback('rentablespace.widget.cancel_rent', 'Cancel rental space (no refund)')}
                                </Button>
                            )}
                        </div>
                    )}
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
