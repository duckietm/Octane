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
import { Button, LayoutCurrencyIcon, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { useMessageEvent, useNotification, usePurse } from '../../../hooks';
import { joinCameraPhotoUrl } from '../CameraAirUtilities';

export interface CameraWidgetCheckoutViewProps {
    base64Url: string;
    onCloseClick: () => void;
    onCancelClick: () => void;
    price: { credits: number; duckets: number; publishDucketPrice: number };
}

const CAMERA_POINT_CURRENCY_TYPE = 0;
const CAMERA_POINT_ICON_TYPE = 5;

export const CameraWidgetCheckoutView: FC<CameraWidgetCheckoutViewProps> = (props) => {
    const { base64Url = null, onCloseClick = null, onCancelClick = null, price = null } = props;
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

    const reportRenderingFailure = useCallback(() => {
        setPictureUrl(null);
        setIsImageLoaded(false);
        setHasRenderingFailed(true);
        setStatusLocalization('');
        simpleAlert(LocalizeText('camera.render.count.info'), null, null, null, LocalizeText('generic.alert.title'));
    }, [simpleAlert]);

    const showNotEnoughCreditsAlert = useCallback(() => {
        simpleAlert(LocalizeText('catalog.alert.notenough.credits.description'), null, null, null, LocalizeText('catalog.alert.notenough.title'));
    }, [simpleAlert]);

    const showNotEnoughDucketsAlert = useCallback(() => {
        const currencyLocalization = GetConfigurationValue<string>(`activitypoint.name.${CAMERA_POINT_CURRENCY_TYPE}`, 'duckets');
        const currencyName = LocalizeText(currencyLocalization);

        simpleAlert(
            LocalizeText('catalog.alert.notenough.activitypoints.description', ['currencyname'], [currencyName]),
            null,
            null,
            null,
            LocalizeText('catalog.alert.notenough.activitypoints.title', ['currencyname'], [currencyName])
        );
    }, [simpleAlert]);

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
    });

    useMessageEvent<CameraPublishStatusMessageEvent>(CameraPublishStatusMessageEvent, (event) => {
        const parser = event.getParser();
        const secondsToWait = Math.max(0, parser.secondsToWait);

        setWasPicturePublished(parser.ok);
        setStatusLocalization(parser.ok ? 'camera.publish.successful' : '');
        setIsWaiting(false);

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
                if (isWaiting || !isImageLoaded || !disclaimerAccepted) return;

                if (price.credits > getCurrencyAmount(-1)) {
                    showNotEnoughCreditsAlert();
                    return;
                }

                if (price.duckets > getCurrencyAmount(CAMERA_POINT_CURRENCY_TYPE)) {
                    showNotEnoughDucketsAlert();
                    return;
                }

                setIsWaiting(true);
                setStatusLocalization('camera.purchase.pleasewait');

                if (spendingDisclaimerEnabled) setDisclaimerAccepted(false);

                SendMessageComposer(new PurchasePhotoMessageComposer(''));
                return;
            case 'publish':
                if (isWaiting || !isImageLoaded || publishCooldown > 0) return;

                if (price.publishDucketPrice > getCurrencyAmount(CAMERA_POINT_CURRENCY_TYPE)) {
                    showNotEnoughDucketsAlert();
                    return;
                }

                setIsWaiting(true);
                setStatusLocalization('camera.purchase.pleasewait');
                SendMessageComposer(new PublishPhotoMessageComposer());
                return;
            case 'competition':
                if (isWaiting || !isImageLoaded || ['submitted', 'limit', 'error'].includes(competitionState)) return;

                setIsWaiting(true);
                setStatusLocalization('camera.purchase.pleasewait');
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

    return (
        <OctaneCardView className="octane-camera-checkout" theme="primary-slim" isResizable={false}>
            <OctaneCardHeaderView headerText={LocalizeText('camera.confirm_phase.title')} onCloseClick={() => processAction('close')} />
            <OctaneCardContentView className="octane-camera-checkout__content">
                <div ref={productImageContainerRef} className="octane-camera-checkout__image">
                    {!isImageLoaded && !hasRenderingFailed && <div className="octane-camera-checkout__loading">{LocalizeText('camera.loading')}</div>}
                    {hasRenderingFailed && <div aria-hidden="true" className="absolute inset-0 bg-black" />}
                    {pictureUrl && !hasRenderingFailed && (
                        <img
                            ref={productImageRef}
                            alt=""
                            className="absolute inset-0"
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

                <div className="octane-camera-checkout__status">{statusLocalization ? LocalizeText(statusLocalization) : ''}</div>

                {competitionEnabled && (
                    <section className="octane-camera-checkout__section octane-camera-checkout__section--competition">
                        <div className="octane-camera-checkout__section-copy">
                            <h2>
                                {LocalizeText(
                                    competitionState === 'submitted'
                                        ? 'camera.competition.submitted.info'
                                        : competitionState === 'limit'
                                          ? 'camera.competition.limit.info'
                                          : 'camera.competition.header'
                                )}
                            </h2>
                            <p>{LocalizeText('camera.competition.info')}</p>
                        </div>
                        <Button
                            className="octane-camera-checkout__section-button"
                            disabled={isWaiting || !isImageLoaded || ['submitted', 'limit', 'error'].includes(competitionState)}
                            variant="success"
                            onClick={() => processAction('competition')}
                        >
                            {LocalizeText('generic.submit')}
                        </Button>
                    </section>
                )}

                <section className="octane-camera-checkout__section octane-camera-checkout__section--purchase">
                    <div className="octane-camera-checkout__section-copy">
                        <h2>{LocalizeText('camera.purchase.header')}</h2>
                        <div className="octane-camera-checkout__price">
                            <span>{LocalizeText('catalog.purchase.confirmation.dialog.cost')}</span>
                            <span className="octane-camera-checkout__currency">
                                <strong>{price.credits}</strong>
                                <LayoutCurrencyIcon type={-1} />
                            </span>
                            {price.duckets > 0 && (
                                <span className="octane-camera-checkout__currency">
                                    <strong>{price.duckets}</strong>
                                    <LayoutCurrencyIcon type={CAMERA_POINT_ICON_TYPE} />
                                </span>
                            )}
                        </div>
                        {picturesBought > 0 && (
                            <div className="octane-camera-checkout__inventory-link">
                                <strong>{LocalizeText('camera.purchase.count.info')}</strong>
                                <span>{picturesBought}</span>
                                <button type="button" onClick={() => CreateLinkEvent('inventory/show/furni')}>
                                    {LocalizeText('camera.open.inventory')}
                                </button>
                            </div>
                        )}
                    </div>
                    <Button
                        className="octane-camera-checkout__section-button"
                        disabled={isWaiting || !isImageLoaded || !disclaimerAccepted}
                        variant="success"
                        onClick={() => processAction('buy')}
                    >
                        {LocalizeText(picturesBought ? 'camera.buy.another.button.text' : 'catalog.purchase_confirmation.buy')}
                    </Button>
                </section>

                {!publishDisabled && (
                    <section className="octane-camera-checkout__section octane-camera-checkout__section--publish">
                        <div className="octane-camera-checkout__section-copy">
                            <h2>{LocalizeText(wasPicturePublished ? 'camera.publish.successful' : 'camera.publish.explanation')}</h2>
                            <p>{LocalizeText(wasPicturePublished ? 'camera.publish.success.short.info' : 'camera.publish.detailed.explanation')}</p>
                            {wasPicturePublished && publishedPhotoUrl && (
                                <a href={publishedPhotoUrl} rel="noreferrer" target="_blank">
                                    {LocalizeText('camera.link.to.published')}
                                </a>
                            )}
                            {!wasPicturePublished && (
                                <div className="octane-camera-checkout__price">
                                    <span>{LocalizeText('catalog.purchase.confirmation.dialog.cost')}</span>
                                    <span className="octane-camera-checkout__currency">
                                        <strong>{price.publishDucketPrice}</strong>
                                        <LayoutCurrencyIcon type={CAMERA_POINT_ICON_TYPE} />
                                    </span>
                                </div>
                            )}
                        </div>
                        {!wasPicturePublished && (
                            <Button
                                className="octane-camera-checkout__section-button"
                                disabled={isWaiting || !isImageLoaded || publishCooldown > 0}
                                variant="success"
                                onClick={() => processAction('publish')}
                            >
                                {LocalizeText('camera.publish.button.text')}
                            </Button>
                        )}
                    </section>
                )}

                <div className="octane-camera-checkout__removal-disclaimer">{LocalizeText('camera.warning.disclaimer')}</div>

                {spendingDisclaimerEnabled && (
                    <label className="octane-camera-checkout__spending-disclaimer">
                        <input type="checkbox" checked={disclaimerAccepted} onChange={(event) => setDisclaimerAccepted(event.target.checked)} />
                        <span>{LocalizeText('disclaimer.credit_spending')}</span>
                    </label>
                )}

                <div className="octane-camera-checkout__buttons">
                    <Button variant="secondary" onClick={() => processAction('cancel')}>
                        {LocalizeText(isWaiting ? 'generic.close' : 'catalog.purchase_confirmation.cancel')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
