import { CreateLinkEvent, GetSessionDataManager } from '@octane/renderer';
import { FC } from 'react';
import {
    decodeNuxGiftSeparator,
    GetConfigurationValue,
    getNuxGiftCaption,
    getNuxGiftOptionName,
    getNuxGiftThumbnailUrl,
    INuxGiftProduct,
    LocalizeText,
    localizeWithFallback
} from '../../api';
import { DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useNotification, useNuxDialogs } from '../../hooks';
import { LibraryImageView } from '../help/habbo-way/HabboWayPagerView';
import { UiHelpBubblesView } from './UiHelpBubblesView';

/** NuxGiftSelectionView.getProductName: the localization key, the product data or the furni name. */
const getProductName = (product: INuxGiftProduct): string => {
    if (product.extraInfo) return localizeWithFallback(product.extraInfo, product.extraInfo);

    const productData = GetSessionDataManager().getProductData(product.itemName);

    if (productData?.name) return productData.name;

    const furni = GetSessionDataManager().getFloorItemDataByName(product.itemName) ?? GetSessionDataManager().getWallItemDataByName(product.itemName);

    if (furni?.name) return furni.name;

    return localizeWithFallback(`product_${product.itemName}_name`, product.itemName);
};

/** AIR nux/HabboNuxDialogs and the help bubbles of the new user tour. */
export const NuxView: FC = () => {
    const { oldUserOffer, acceptOldUserOffer, neverAgainOldUserOffer, giftSteps, giftStep, selectGift, lobbyOffer, hideLobbyOffer } = useNuxDialogs();
    const { showConfirm = null } = useNotification();
    const library = GetConfigurationValue<string>('image.library.url', '');
    const step = giftSteps?.[giftStep] ?? null;
    const separator = decodeNuxGiftSeparator(LocalizeText('nux.gift.selection.separator'));

    // HabboNuxDialogs.onReject: "no thanks" asks whether the offer should never come back.
    const rejectOldUserOffer = () =>
        showConfirm(
            localizeWithFallback('phone.number.never.again.confirm.text', 'Do you want to skip this offer for good?'),
            neverAgainOldUserOffer,
            () => {},
            null,
            null,
            localizeWithFallback('phone.number.never.again.confirm.title', 'Are you sure?')
        );

    return (
        <NativeTextTree>
            <>
                <UiHelpBubblesView />
                {oldUserOffer && (
                    // NuxOfferOldUserView (`nux_offer_old_user`, 456x220): no close box, skip or accept.
                    <OctaneCardView className="octane-nux-offer is-old-user" theme="primary-slim" uniqueKey="nux-old-user">
                        <OctaneCardHeaderView headerText={localizeWithFallback('notification.notification.nux.popup.title', 'Welcome to Habbo')} onCloseClick={rejectOldUserOffer} />
                        <OctaneCardContentView className="text-black" gap={2}>
                            <div className="octane-nux-offer__banner">
                                <LibraryImageView src={`${library}nux/nux_cropped_frank.png`} />
                                <span>{localizeWithFallback('nux.offer.old.user.title', 'Want some gifts?')}</span>
                            </div>
                            <div className="octane-nux-offer__text">{localizeWithFallback('nux.offer.old.user.summary', '')}</div>
                            <div className="octane-nux-offer__buttons">
                                <BaseButton className="octane-nux-offer__link" type="button" onClick={rejectOldUserOffer}>
                                    {localizeWithFallback('nux.offer.old.user.button.skip', 'No thanks!')}
                                </BaseButton>
                                <BaseButton className="octane-nux-offer__go" type="button" onClick={acceptOldUserOffer}>
                                    {localizeWithFallback('nux.offer.old.user.button.verify', 'Verify and get gifts')}
                                </BaseButton>
                            </div>
                        </OctaneCardContentView>
                    </OctaneCardView>
                )}
                {step && (
                    // NuxGiftSelectionView (`nux_gift_selection`, 487x287): one option per column, no close box.
                    <OctaneCardView className="octane-nux-gifts" theme="primary-slim" uniqueKey="nux-gifts">
                        <OctaneCardHeaderView
                            noCloseButton
                            className="octane-nux-gifts__header"
                            headerText={getNuxGiftCaption(localizeWithFallback('nux.gift.selection.title', 'Choose a gift'), giftStep, giftSteps.length)}
                            onCloseClick={() => {}}
                        />
                        <OctaneCardContentView className="text-black" gap={2}>
                            <div className="octane-nux-offer__banner">
                                <LibraryImageView src={`${library}nux/nux_present.png`} />
                                <span>{localizeWithFallback('nux.gift.selection.choose.one', 'Get your free gift!')}</span>
                            </div>
                            <div className="octane-nux-gifts__list">
                                {step.options.map((option, index) => (
                                    <div key={index} className="octane-nux-gifts__option">
                                        <div className="octane-nux-gifts__thumbnail">
                                            {getNuxGiftThumbnailUrl(library, option) && <LibraryImageView src={getNuxGiftThumbnailUrl(library, option)} />}
                                        </div>
                                        <div className="octane-nux-gifts__name">{getNuxGiftOptionName(option, getProductName, separator)}</div>
                                        <BaseButton className="octane-nux-offer__go octane-nux-offer__get" type="button" onClick={() => selectGift(index)}>
                                            {localizeWithFallback('nux.gift.selection.button.get', 'Get this')}
                                        </BaseButton>
                                    </div>
                                ))}
                            </div>
                        </OctaneCardContentView>
                    </OctaneCardView>
                )}
                {lobbyOffer && (
                    // NuxNoobRoomOfferView (`nux_noob_room_offer`, 382x222), placed at 20,20.
                    <OctaneCardView className="octane-nux-offer is-lobby" offsetLeft={-30} offsetTop={-30} windowPosition={DraggableWindowPosition.TOP_LEFT} theme="primary-slim" uniqueKey="nux-lobby">
                        <OctaneCardHeaderView headerText={localizeWithFallback('notification.notification.nux.popup.title', 'Welcome to Habbo')} onCloseClick={hideLobbyOffer} />
                        <OctaneCardContentView className="text-black" gap={2}>
                            <LibraryImageView className="octane-nux-offer__lobby-image" src={`${library}nux/NUXroom_prompt.png`} />
                            <div className="octane-nux-offer__text">{localizeWithFallback('nux.offer.noob.lobby.summary', 'Go to the room to meet other users.')}</div>
                            <div className="octane-nux-offer__buttons">
                                <span />
                                <BaseButton className="octane-nux-offer__go" type="button" onClick={() => CreateLinkEvent('navigator/goto/predefined_noob_lobby')}>
                                    {localizeWithFallback('nux.offer.noob.lobby.button', 'Go to the room!')}
                                </BaseButton>
                            </div>
                        </OctaneCardContentView>
                    </OctaneCardView>
                )}
            </>
        </NativeTextTree>
    );
};
