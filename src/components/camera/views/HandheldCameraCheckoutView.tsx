import { FC, RefObject } from 'react';
import { LocalizeText } from '../../../api';
import creditIcon from '../../../assets/images/camera/checkout/credit.png';
import ducketIcon from '../../../assets/images/camera/checkout/ducket.png';
import { BaseButton } from '../../../common/BaseButton';
import { Checkbox } from '../../../common/Checkbox';
import { DraggableWindow } from '../../../common/draggable-window';
import { HandheldSheetFrame } from '../../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

export type HandheldCameraCheckoutAction = 'close' | 'buy' | 'publish' | 'competition' | 'cancel';

export interface HandheldCameraCheckoutViewProps {
    price: { credits: number; duckets: number; publishDucketPrice: number };
    pictureUrl: string;
    isImageLoaded: boolean;
    hasRenderingFailed: boolean;
    /** The status line, already localised (empty for none). */
    status: string;
    imageContainerRef: RefObject<HTMLDivElement>;
    imageRef: RefObject<HTMLImageElement>;
    onImageLoad: () => void;
    onImageError: () => void;
    competitionEnabled: boolean;
    /** The competition card's heading, already localised (it changes once a picture is sent in or the limit is reached). */
    competitionHeader: string;
    competitionDisabled: boolean;
    picturesBought: number;
    buyDisabled: boolean;
    publishEnabled: boolean;
    wasPicturePublished: boolean;
    publishedPhotoUrl: string;
    publishButtonDisabled: boolean;
    spendingDisclaimerEnabled: boolean;
    disclaimerAccepted: boolean;
    onDisclaimer: (accepted: boolean) => void;
    /** Cancel, or Close once something was bought or published (or while waiting). */
    cancelLabel: string;
    onAction: (action: HandheldCameraCheckoutAction) => void;
    onOpenInventory: () => void;
}

const Price: FC<{ amount: number; icon: string }> = ({ amount, icon }) => (
    <span className="octane-handheld-camera-checkout__amount">
        <span className="octane-handheld-camera-checkout__amount-value">{amount}</span>
        <img alt="" className="octane-handheld-camera-checkout__amount-icon" draggable={false} src={icon} />
    </span>
);

/**
 * Buying and publishing a picture on a phone, in the phone frame (HandheldSheetFrame, HandheldCamera.css). The checkout
 * keeps the packets, the prices, the waiting and the alerts; this shows them as cards: the picture (on its side: at the
 * left), the status, the competition, the purchase with its price and the way to the inventory, publishing with its price
 * and the link to the published picture, the disclaimers, and Cancel / Close in a bar at the bottom.
 */
export const HandheldCameraCheckoutView: FC<HandheldCameraCheckoutViewProps> = (props) => {
    const {
        price,
        pictureUrl = null,
        isImageLoaded = false,
        hasRenderingFailed = false,
        status = '',
        imageContainerRef,
        imageRef,
        onImageLoad,
        onImageError,
        competitionEnabled = false,
        competitionHeader = '',
        competitionDisabled = true,
        picturesBought = 0,
        buyDisabled = true,
        publishEnabled = false,
        wasPicturePublished = false,
        publishedPhotoUrl = '',
        publishButtonDisabled = true,
        spendingDisclaimerEnabled = false,
        disclaimerAccepted = true,
        onDisclaimer,
        cancelLabel,
        onAction,
        onOpenInventory
    } = props;
    const costLabel = LocalizeText('catalog.purchase.confirmation.dialog.cost');

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="camera-checkout">
                <HandheldSheetFrame
                    className="octane-handheld-camera-checkout"
                    icon="icon-camera-small"
                    title={LocalizeText('camera.confirm_phase.title')}
                    onClose={() => onAction('close')}
                >
                    <div className="octane-handheld-camera-checkout__layout">
                        <div className="octane-handheld-camera-checkout__picture-column">
                            <div ref={imageContainerRef} className={`octane-handheld-camera-checkout__picture${hasRenderingFailed ? ' is-failed' : ''}`}>
                                {!isImageLoaded && !hasRenderingFailed && (
                                    <span className="octane-handheld-camera-checkout__loading">{LocalizeText('camera.loading')}</span>
                                )}
                                {pictureUrl && !hasRenderingFailed && (
                                    <img
                                        ref={imageRef}
                                        alt=""
                                        draggable={false}
                                        src={pictureUrl}
                                        style={{ visibility: isImageLoaded ? 'visible' : 'hidden' }}
                                        onError={onImageError}
                                        onLoad={onImageLoad}
                                    />
                                )}
                            </div>
                            {!!status && (
                                <p aria-live="polite" className="octane-handheld-camera-checkout__status">
                                    {status}
                                </p>
                            )}
                        </div>

                        <div className="octane-handheld-camera-checkout__cards">
                            {competitionEnabled && (
                                <section className="octane-handheld-camera-checkout__card is-competition">
                                    <h3 className="octane-handheld-camera-checkout__card-title">{competitionHeader}</h3>
                                    <p className="octane-handheld-camera-checkout__card-text">{LocalizeText('camera.competition.info')}</p>
                                    <BaseButton
                                        className="octane-handheld-camera-checkout__button is-primary"
                                        disabled={competitionDisabled}
                                        onClick={() => onAction('competition')}
                                    >
                                        {LocalizeText('generic.submit')}
                                    </BaseButton>
                                </section>
                            )}

                            <section className="octane-handheld-camera-checkout__card is-purchase">
                                <h3 className="octane-handheld-camera-checkout__card-title">{LocalizeText('camera.purchase.header')}</h3>
                                <div className="octane-handheld-camera-checkout__price">
                                    <span className="octane-handheld-camera-checkout__price-label">{costLabel}</span>
                                    <Price amount={price.credits} icon={creditIcon} />
                                    {price.duckets > 0 && <Price amount={price.duckets} icon={ducketIcon} />}
                                </div>
                                {picturesBought > 0 && (
                                    <div className="octane-handheld-camera-checkout__bought">
                                        <span className="octane-handheld-camera-checkout__bought-count">
                                            {LocalizeText('camera.purchase.count.info')} {picturesBought}
                                        </span>
                                        <BaseButton className="octane-handheld-camera-checkout__link" onClick={onOpenInventory}>
                                            {LocalizeText('camera.open.inventory')}
                                        </BaseButton>
                                    </div>
                                )}
                                <BaseButton
                                    className="octane-handheld-camera-checkout__button is-primary"
                                    disabled={buyDisabled}
                                    onClick={() => onAction('buy')}
                                >
                                    {LocalizeText(picturesBought ? 'camera.buy.another.button.text' : 'catalog.purchase_confirmation.buy')}
                                </BaseButton>
                            </section>

                            {publishEnabled && (
                                <section className={`octane-handheld-camera-checkout__card is-publish${wasPicturePublished ? ' is-published' : ''}`}>
                                    <h3 className="octane-handheld-camera-checkout__card-title">
                                        {LocalizeText(wasPicturePublished ? 'camera.publish.successful' : 'camera.publish.explanation')}
                                    </h3>
                                    <p className="octane-handheld-camera-checkout__card-text">
                                        {LocalizeText(wasPicturePublished ? 'camera.publish.success.short.info' : 'camera.publish.detailed.explanation')}
                                    </p>
                                    {!wasPicturePublished && (
                                        <div className="octane-handheld-camera-checkout__price">
                                            <span className="octane-handheld-camera-checkout__price-label">{costLabel}</span>
                                            <Price amount={price.publishDucketPrice} icon={ducketIcon} />
                                        </div>
                                    )}
                                    {wasPicturePublished && !!publishedPhotoUrl && (
                                        <a
                                            className="octane-handheld-camera-checkout__link is-published-link"
                                            href={publishedPhotoUrl}
                                            rel="noreferrer"
                                            target="_blank"
                                        >
                                            {LocalizeText('camera.link.to.published')}
                                        </a>
                                    )}
                                    {!wasPicturePublished && (
                                        <BaseButton
                                            className="octane-handheld-camera-checkout__button is-primary"
                                            disabled={publishButtonDisabled}
                                            onClick={() => onAction('publish')}
                                        >
                                            {LocalizeText('camera.publish.button.text')}
                                        </BaseButton>
                                    )}
                                </section>
                            )}

                            <p className="octane-handheld-camera-checkout__note">{LocalizeText('camera.warning.disclaimer')}</p>

                            {spendingDisclaimerEnabled && (
                                <label className="octane-handheld-camera-checkout__spending">
                                    <Checkbox checked={disclaimerAccepted} onCheckedChange={(nextChecked) => onDisclaimer(nextChecked)} />
                                    <span className="octane-handheld-camera-checkout__spending-text">{LocalizeText('disclaimer.credit_spending')}</span>
                                </label>
                            )}
                        </div>

                        <div className="octane-handheld-camera-checkout__bar">
                            <BaseButton className="octane-handheld-camera-checkout__button is-cancel" onClick={() => onAction('cancel')}>
                                {cancelLabel}
                            </BaseButton>
                        </div>
                    </div>
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
