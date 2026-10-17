import {
    CameraPublishStatusMessageEvent,
    CameraPurchaseOKMessageEvent,
    CameraStorageUrlMessageEvent,
    CompetitionStatusMessageEvent,
    CreateLinkEvent,
    GetEventDispatcher,
    GetRoomEngine,
    GetSessionDataManager,
    OctaneToolbarAnimateIconEvent,
    PhotoCompetitionMessageComposer,
    PublishPhotoMessageComposer,
    PurchasePhotoMessageComposer,
    ToolbarIconEnum
} from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetConfigurationValue, LocalizeText, OpenUrl, SendMessageComposer } from '../../../api';
import creditIcon from '../../../assets/images/camera/checkout/credit.png';
import ducketIcon from '../../../assets/images/camera/checkout/ducket.png';
import { OctaneCardView } from '../../../common';
import { useMessageEvent, useNotification, usePurse } from '../../../hooks';
import { joinCameraPhotoUrl } from '../CameraAirUtilities';
import { CameraCenteredText, CameraNativeText } from './CameraNativeText';
import { CameraSkinButton } from './CameraSkinButton';

export interface CameraWidgetCheckoutViewProps {
    base64Url: string;
    onCloseClick: () => void;
    onCancelClick: () => void;
    price: { credits: number; duckets: number; publishDucketPrice: number };
}

const CAMERA_POINT_CURRENCY_TYPE = 0;

export const CameraWidgetCheckoutView: FC<CameraWidgetCheckoutViewProps> = (props) => {
    const { base64Url = null, onCloseClick = null, onCancelClick = null, price: offeredPrice = null } = props;
    // Official (setPrices runs once): the prices are fixed when the dialog opens.
    const [price, setPrice] = useState(offeredPrice);
    // A second click before React re-renders must not send the request again (the server would
    // create and charge twice); set in the same task as the send.
    const pendingRef = useRef(false);
    const pendingTimerRef = useRef<number>(null);
    const [pictureUrl, setPictureUrl] = useState<string>(null);
    const [publishId, setPublishId] = useState<string>(null);
    const [picturesBought, setPicturesBought] = useState(0);
    const [wasPicturePublished, setWasPicturePublished] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [hasRenderingFailed, setHasRenderingFailed] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);
    const [publishCooldown, setPublishCooldown] = useState(0);
    const [statusLocalization, setStatusLocalization] = useState('camera.purchase.pleasewait');
    const [competitionState, setCompetitionState] = useState<'idle' | 'submitted' | 'limit' | 'email' | 'error'>('idle');
    const productImageContainerRef = useRef<HTMLDivElement>(null);
    const productImageRef = useRef<HTMLImageElement>(null);
    const { getCurrencyAmount = null } = usePurse();
    const { showConfirm = null, simpleAlert = null } = useNotification();

    const publishDisabled = useMemo(
        () => GetConfigurationValue<boolean>('camera.publish.disabled', false) || !GetConfigurationValue<boolean>('camera.photo.publishing.enabled', true),
        []
    );
    const competitionEnabled = useMemo(() => GetConfigurationValue<boolean>('camera.competition.enabled', false), []);
    const spendingDisclaimerEnabled = useMemo(() => GetConfigurationValue<boolean>('disclaimer.credit_spending.enabled', false), []);
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(!spendingDisclaimerEnabled);

    const publishedPhotoUrl = useMemo(() => {
        if (!publishId) return '';
        if (/^(?:https?:)?\/\//i.test(publishId) || publishId.startsWith('/')) return publishId;

        const userName = GetSessionDataManager()?.userName ?? '';

        return `/profile/${encodeURIComponent(userName)}/photo/${encodeURIComponent(publishId)}`;
    }, [publishId]);

    useEffect(() => {
        if (!price && offeredPrice) setPrice(offeredPrice);
    }, [offeredPrice, price]);

    const finishPending = useCallback(() => {
        pendingRef.current = false;
        if (pendingTimerRef.current !== null) window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
    }, []);

    const startPending = () => {
        pendingRef.current = true;
        setIsWaiting(true);
        setStatusLocalization('camera.purchase.pleasewait');
        if (pendingTimerRef.current !== null) window.clearTimeout(pendingTimerRef.current);
        // No answer within 30 s: let the user try again.
        pendingTimerRef.current = window.setTimeout(() => {
            pendingRef.current = false;
            pendingTimerRef.current = null;
            setIsWaiting(false);
            setStatusLocalization('generic.failed');
        }, 30000);
    };

    useEffect(() => () => {
        if (pendingTimerRef.current !== null) window.clearTimeout(pendingTimerRef.current);
    }, []);

    const reportRenderingFailure = useCallback(() => {
        setPictureUrl(null);
        setIsImageLoaded(false);
        setHasRenderingFailed(true);
        setStatusLocalization('');
        simpleAlert(LocalizeText('camera.render.count.info'), null, null, null, LocalizeText('generic.alert.title'));
    }, [simpleAlert]);

    // Official: not enough credits offers the shop; not enough duckets offers the duckets page.
    const showNotEnoughCreditsAlert = useCallback(() => {
        const shopUrl = GetConfigurationValue<string>('web.shop.relativeUrl', '');

        if (!shopUrl || !showConfirm) {
            simpleAlert(LocalizeText('catalog.alert.notenough.credits.description'), null, null, null, LocalizeText('catalog.alert.notenough.title'));
            return;
        }

        showConfirm(
            LocalizeText('catalog.alert.notenough.credits.description'),
            () => OpenUrl(shopUrl),
            () => undefined,
            null,
            null,
            LocalizeText('catalog.alert.notenough.title')
        );
    }, [showConfirm, simpleAlert]);

    const showNotEnoughDucketsAlert = useCallback(() => {
        const currencyLocalization = GetConfigurationValue<string>(`activitypoint.name.${CAMERA_POINT_CURRENCY_TYPE}`, 'duckets');
        const currencyName = LocalizeText(currencyLocalization);
        const ducketsUrl = GetConfigurationValue<string>('link.format.duckets', '');

        if (ducketsUrl && showConfirm) {
            showConfirm(
                LocalizeText('catalog.alert.notenough.activitypoints.description', ['currencyname'], [currencyName]),
                () => OpenUrl(ducketsUrl),
                () => undefined,
                null,
                null,
                LocalizeText('catalog.alert.notenough.activitypoints.title', ['currencyname'], [currencyName])
            );
            return;
        }

        simpleAlert(
            LocalizeText('catalog.alert.notenough.activitypoints.description', ['currencyname'], [currencyName]),
            null,
            null,
            null,
            LocalizeText('catalog.alert.notenough.activitypoints.title', ['currencyname'], [currencyName])
        );
    }, [showConfirm, simpleAlert]);

    const animatePictureToInventory = useCallback(() => {
        const sourceImage = productImageRef.current;
        const sourceContainer = productImageContainerRef.current;

        if (!sourceImage || !sourceContainer) return;

        const transitionImage = sourceImage.cloneNode(true) as HTMLImageElement;
        const sourceBounds = sourceContainer.getBoundingClientRect();
        const transitionEvent = new OctaneToolbarAnimateIconEvent(transitionImage, sourceBounds.x, sourceBounds.y);

        transitionImage.width = 120;
        transitionImage.height = 120;
        transitionEvent.iconName = ToolbarIconEnum.INVENTORY;
        GetEventDispatcher().dispatchEvent(transitionEvent);
    }, []);

    useMessageEvent<CameraPurchaseOKMessageEvent>(CameraPurchaseOKMessageEvent, () => {
        animatePictureToInventory();
        setPicturesBought((value) => value + 1);
        setStatusLocalization('camera.purchase.successful');
        setIsWaiting(false);
        finishPending();
    });

    useMessageEvent<CameraPublishStatusMessageEvent>(CameraPublishStatusMessageEvent, (event) => {
        const parser = event.getParser();
        const secondsToWait = Math.max(0, parser.secondsToWait);

        setWasPicturePublished(parser.ok);
        setStatusLocalization(parser.ok ? 'camera.publish.successful' : '');
        setIsWaiting(false);
        finishPending();

        if (parser.ok) {
            setPublishId(parser.extraDataId);
            setPublishCooldown(0);
            return;
        }

        setPublishCooldown(secondsToWait);
        simpleAlert(
            LocalizeText('camera.publish.wait', ['minutes'], [(Math.floor(secondsToWait / 60) + 1).toString()]),
            null,
            null,
            null,
            LocalizeText('generic.alert.title')
        );
    });

    useMessageEvent<CompetitionStatusMessageEvent>(CompetitionStatusMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.ok) {
            setCompetitionState('submitted');
            setStatusLocalization('camera.competition.submitted.status');
        } else {
            switch (parser.errorReason) {
                case 'too-many-submits':
                    setCompetitionState('limit');
                    break;
                case 'email-not-verified':
                    setCompetitionState('email');

                    showConfirm(
                        LocalizeText('camera.competition.email.not.verified'),
                        () => {
                            const verificationUrl = GetConfigurationValue<string>('email.verification.url', '');

                            if (verificationUrl) OpenUrl(verificationUrl);
                        },
                        () => undefined,
                        LocalizeText('email.settings'),
                        LocalizeText('groupforum.settings.cancel'),
                        LocalizeText('generic.alert.title')
                    );
                    break;
                default:
                    setCompetitionState('error');
                    break;
            }

            setStatusLocalization('generic.failed');
        }

        setIsWaiting(false);
        finishPending();
    });

    useMessageEvent<CameraStorageUrlMessageEvent>(CameraStorageUrlMessageEvent, (event) => {
        const parser = event.getParser();
        const imageBaseUrl = GetConfigurationValue<string>('stories.image_url_base', '') || GetConfigurationValue<string>('camera.url', '');
        const nextPictureUrl = joinCameraPhotoUrl(imageBaseUrl, parser.url);

        setIsImageLoaded(false);
        setHasRenderingFailed(false);

        if (!nextPictureUrl) {
            reportRenderingFailure();
            return;
        }

        setPictureUrl(nextPictureUrl);
    });

    const processAction = (type: string) => {
        switch (type) {
            case 'close':
                onCloseClick();
                return;
            case 'buy':
                if (pendingRef.current || isWaiting || !isImageLoaded || !disclaimerAccepted) return;

                if (price.credits > getCurrencyAmount(-1)) {
                    showNotEnoughCreditsAlert();
                    return;
                }

                if (price.duckets > getCurrencyAmount(CAMERA_POINT_CURRENCY_TYPE)) {
                    showNotEnoughDucketsAlert();
                    return;
                }

                startPending();

                if (spendingDisclaimerEnabled) setDisclaimerAccepted(false);

                SendMessageComposer(new PurchasePhotoMessageComposer(''));
                return;
            case 'publish':
                if (pendingRef.current || isWaiting || !isImageLoaded || publishCooldown > 0) return;

                if (price.publishDucketPrice > getCurrencyAmount(CAMERA_POINT_CURRENCY_TYPE)) {
                    showNotEnoughDucketsAlert();
                    return;
                }

                startPending();
                SendMessageComposer(new PublishPhotoMessageComposer());
                return;
            case 'competition':
                if (pendingRef.current || isWaiting || !isImageLoaded || ['submitted', 'limit', 'error'].includes(competitionState)) return;

                startPending();
                SendMessageComposer(new PhotoCompetitionMessageComposer());
                return;
            case 'cancel':
                onCancelClick();
                return;
        }
    };

    useEffect(() => {
        if (!base64Url) return;

        GetRoomEngine().saveBase64AsScreenshot(base64Url);
    }, [base64Url]);

    useEffect(() => {
        if (publishCooldown <= 0) return;

        const timer = window.setTimeout(() => setPublishCooldown(0), publishCooldown * 1000);

        return () => window.clearTimeout(timer);
    }, [publishCooldown]);

    if (!price) return null;

    const buyDisabled = isWaiting || !isImageLoaded || !disclaimerAccepted;
    const publishButtonDisabled = isWaiting || !isImageLoaded || publishCooldown > 0;
    const competitionDisabled = isWaiting || !isImageLoaded || ['submitted', 'limit', 'error'].includes(competitionState);
    const costLabel = LocalizeText('catalog.purchase.confirmation.dialog.cost');
    const renderButton = (key: string, className: string, label: string, disabled: boolean, variant: 'green' | 'gray', onClick: () => void) => (
        <CameraSkinButton key={key} className={className} disabled={disabled} label={label} variant={variant} onClick={onClick} />
    );

    return (
        <OctaneCardView className="octane-camera-checkout" frameStyle={3} isResizable={false} theme="primary-slim">
            <div className="octane-card-header-shell">
                <span className="octane-card-title">
                    <CameraCenteredText color={0xffffff} text={LocalizeText('camera.confirm_phase.title')} textStyle="u_frame_title" width={340} />
                </span>
                <button aria-label={LocalizeText('generic.close')} className="octane-card-close-button" type="button" onClick={() => processAction('close')} />
            </div>
            <div className="octane-camera-checkout__list">
                <div ref={productImageContainerRef} className={`octane-camera-checkout__image${hasRenderingFailed ? ' is-failed' : ''}`}>
                    {!isImageLoaded && !hasRenderingFailed && (
                        <div className="octane-camera-checkout__loading">
                            <CameraNativeText color={0xffffff} size={36} text={LocalizeText('camera.loading')} />
                        </div>
                    )}
                    {pictureUrl && !hasRenderingFailed && (
                        <img
                            ref={productImageRef}
                            alt=""
                            src={pictureUrl}
                            style={{ visibility: isImageLoaded ? 'visible' : 'hidden' }}
                            onLoad={() => {
                                setIsImageLoaded(true);
                                setHasRenderingFailed(false);
                                setStatusLocalization('camera.confirm_phase.info');
                            }}
                            onError={reportRenderingFailure}
                        />
                    )}
                </div>

                <div className={`octane-camera-checkout__status${statusLocalization ? '' : ' is-empty'}`}>
                    {!!statusLocalization && <CameraNativeText maxWidth={320} text={LocalizeText(statusLocalization)} />}
                </div>

                {competitionEnabled && (
                    <section className="octane-camera-checkout__box is-competition">
                        <div className="octane-camera-checkout__box-name">
                            <CameraNativeText
                               
                                color={0xffffff}
                                size={14}
                                text={LocalizeText(
                                    competitionState === 'submitted'
                                        ? 'camera.competition.submitted.info'
                                        : competitionState === 'limit'
                                          ? 'camera.competition.limit.info'
                                          : 'camera.competition.header'
                                )}
                                textStyle="u_bold"
                            />
                        </div>
                        <div className="octane-camera-checkout__competition-info">
                            <CameraNativeText color={0xffffff} maxWidth={190} text={LocalizeText('camera.competition.info')} />
                        </div>
                        {renderButton('competition', 'is-competition-button', LocalizeText('generic.submit'), competitionDisabled, 'green', () => processAction('competition'))}
                    </section>
                )}

                <section className={`octane-camera-checkout__box is-purchase${picturesBought > 0 ? ' has-inventory-link' : ''}`}>
                    <div className="octane-camera-checkout__box-name">
                        <CameraNativeText size={14} text={LocalizeText('camera.purchase.header')} textStyle="u_bold" />
                    </div>
                    <div className="octane-camera-checkout__price-row">
                        <CameraNativeText size={14} text={costLabel} />
                        <CameraNativeText size={14} text={String(price.credits)} textStyle="u_bold" />
                        <img alt="" className="octane-camera-checkout__icon" src={creditIcon} />
                        {price.duckets > 0 && (
                            <>
                                <CameraNativeText size={14} text={String(price.duckets)} textStyle="u_bold" />
                                <img alt="" className="octane-camera-checkout__icon" src={ducketIcon} />
                            </>
                        )}
                    </div>
                    {picturesBought > 0 && (
                        <div className="octane-camera-checkout__inventory-row">
                            <CameraNativeText size={14} text={LocalizeText('camera.purchase.count.info')} textStyle="u_bold" />
                            <CameraNativeText size={14} text={String(picturesBought)} />
                            <button className="octane-camera-checkout__link" type="button" onClick={() => CreateLinkEvent('inventory/show/furni')}>
                                <CameraNativeText text={LocalizeText('camera.open.inventory')} underline />
                            </button>
                        </div>
                    )}
                    {renderButton(
                        'buy',
                        'is-buy-button',
                        LocalizeText(picturesBought ? 'camera.buy.another.button.text' : 'catalog.purchase_confirmation.buy'),
                        buyDisabled,
                        'green',
                        () => processAction('buy')
                    )}
                </section>

                {!publishDisabled && (
                    <section className={`octane-camera-checkout__box is-publish${wasPicturePublished ? ' is-published' : ''}`}>
                        <div className="octane-camera-checkout__box-name">
                            <CameraNativeText
                               
                                maxWidth={300}
                                size={14}
                                text={LocalizeText(wasPicturePublished ? 'camera.publish.successful' : 'camera.publish.explanation')}
                                textStyle="u_bold"
                            />
                        </div>
                        <div className="octane-camera-checkout__publish-info">
                            <CameraNativeText
                               
                                maxWidth={191}
                                text={LocalizeText(wasPicturePublished ? 'camera.publish.success.short.info' : 'camera.publish.detailed.explanation')}
                            />
                        </div>
                        {!wasPicturePublished && (
                            <div className="octane-camera-checkout__price-row is-publish-price">
                                <CameraNativeText size={14} text={costLabel} />
                                <CameraNativeText size={14} text={String(price.publishDucketPrice)} textStyle="u_bold" />
                                <img alt="" className="octane-camera-checkout__icon" src={ducketIcon} />
                            </div>
                        )}
                        {wasPicturePublished && !!publishedPhotoUrl && (
                            <a className="octane-camera-checkout__link is-publish-link" href={publishedPhotoUrl} rel="noreferrer" target="_blank">
                                <CameraNativeText text={LocalizeText('camera.link.to.published')} underline />
                            </a>
                        )}
                        {!wasPicturePublished &&
                            renderButton('publish', 'is-publish-button', LocalizeText('camera.publish.button.text'), publishButtonDisabled, 'green', () => processAction('publish'))}
                    </section>
                )}

                <div className="octane-camera-checkout__removal">
                    <CameraNativeText maxWidth={320} text={LocalizeText('camera.warning.disclaimer')} />
                </div>

                {spendingDisclaimerEnabled && (
                    <label className="octane-camera-checkout__spending">
                        <input checked={disclaimerAccepted} type="checkbox" onChange={(event) => setDisclaimerAccepted(event.target.checked)} />
                        <span className="octane-camera-checkout__spending-text">
                            <CameraNativeText maxWidth={278} text={LocalizeText('disclaimer.credit_spending')} />
                        </span>
                    </label>
                )}

                <div className="octane-camera-checkout__buttons">
                    {renderButton(
                        'cancel',
                        'is-cancel-button',
                        LocalizeText(isWaiting || picturesBought > 0 || wasPicturePublished ? 'generic.close' : 'catalog.purchase_confirmation.cancel'),
                        false,
                        'gray',
                        () => processAction('cancel')
                    )}
                </div>
            </div>
        </OctaneCardView>
    );
};
