import { CreateLinkEvent, GetSessionDataManager, QuestMessageData } from '@octane/renderer';
import { CSSProperties, FC, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import arrowBackActive from '../../assets/images/quests/seasonal-calendar/arrow_back_active.png';
import arrowBackHilite from '../../assets/images/quests/seasonal-calendar/arrow_back_hilite.png';
import arrowBackInactive from '../../assets/images/quests/seasonal-calendar/arrow_back_inactive.png';
import arrowNextActive from '../../assets/images/quests/seasonal-calendar/arrow_next_active.png';
import arrowNextHilite from '../../assets/images/quests/seasonal-calendar/arrow_next_hilite.png';
import arrowNextInactive from '../../assets/images/quests/seasonal-calendar/arrow_next_inactive.png';
import questCompleteIcon from '../../assets/images/quests/seasonal-calendar/calendar_quest_complete.png';
import stripeMaskLeft from '../../assets/images/quests/seasonal-calendar/stripe_mask_L.png';
import stripeMaskRight from '../../assets/images/quests/seasonal-calendar/stripe_mask_R.png';
import {
    adjustSeasonalBrightness,
    buildSeasonalCalendarDays,
    GetConfigurationValue,
    getFlashingSeasonalDay,
    getHighestSeasonalDay,
    getInitialSeasonalOffset,
    getRareTeaserState,
    getSeasonalBackgroundCount,
    getSeasonalDayImageName,
    getSeasonalImageHost,
    getSeasonalScrollLimits,
    LocalizeText,
    localizeWithFallback,
    parseSeasonalIntList,
    parseSeasonalStringList,
    SEASONAL_BACKGROUND_WIDTH,
    SEASONAL_DAY_ACTIVE,
    SEASONAL_DAY_COMPLETED,
    SEASONAL_ENTITIES_LEFT_MARGIN,
    SEASONAL_ENTITY_SPACING,
    SEASONAL_FLASH_MAX_BRIGHTNESS,
    SEASONAL_HOVER_BRIGHTEN,
    SEASONAL_INDICATOR_COLORS,
    SeasonalCalendarDay,
    toCssColor
} from '../../api';
import { Button, DraggableWindowPosition, LayoutCurrencyIcon, LayoutFurniImageView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { getSeasonalCalendarSettings, getSeasonalQuestRoomIds, usePurse, useQuests, useRoom, useSeasonalCalendar } from '../../hooks';
import { OctaneCard } from '../../layout';
import { QuestEntryView } from './QuestEntryView';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

/** Hold an arrow and the strip keeps moving, one day per step (Calendar.update). */
const SCROLL_REPEAT_MS = 150;

/** `${key}` when the external texts have it, the fallback otherwise. */
const localizeKeyOr = (key: string, fallback: string): string => {
    const value = LocalizeText(key);

    return value && value !== key ? value : fallback;
};

const SeasonalArrow: FC<{ direction: 'back' | 'next'; active: boolean; onStep: () => void }> = ({ direction, active, onStep }) => {
    const [hover, setHover] = useState(false);
    const [pressed, setPressed] = useState(false);
    const repeatRef = useRef<number>(null);
    const stepRef = useRef(onStep);

    useEffect(() => {
        stepRef.current = onStep;
    }, [onStep]);

    const stop = useCallback(() => {
        setPressed(false);

        if (repeatRef.current !== null) window.clearInterval(repeatRef.current);

        repeatRef.current = null;
    }, []);

    useEffect(() => stop, [stop]);

    useEffect(() => {
        if (!active) stop();
    }, [active, stop]);

    const images = direction === 'back' ? [arrowBackInactive, arrowBackActive, arrowBackHilite] : [arrowNextInactive, arrowNextActive, arrowNextHilite];
    const image = !active ? images[0] : hover ? images[2] : images[1];

    const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
        if (!active) return;

        event.preventDefault();
        setPressed(true);
        stepRef.current();
        repeatRef.current = window.setInterval(() => stepRef.current(), SCROLL_REPEAT_MS);
    };

    return (
        <NativeTextTree>
            <BaseButton
                type="button"
                className={`octane-seasonal-arrow octane-seasonal-arrow-${direction}${pressed ? ' octane-seasonal-arrow-pressed' : ''}`}
                aria-label={direction === 'back' ? 'Previous days' : 'Next days'}
                disabled={!active}
                onPointerDown={onPointerDown}
                onPointerUp={stop}
                onPointerLeave={() => {
                    setHover(false);
                    stop();
                }}
                onPointerEnter={() => setHover(true)}
            >
                <img src={image} alt="" draggable={false} />
            </BaseButton>
        </NativeTextTree>
    );
};

const SeasonalDayView: FC<{
    day: SeasonalCalendarDay<QuestMessageData>;
    imageHost: string;
    prefix: string;
    flashing: boolean;
    onOpen: (quest: QuestMessageData) => void;
}> = ({ day, imageHost, prefix, flashing, onOpen }) => {
    const [hover, setHover] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const baseColor = SEASONAL_INDICATOR_COLORS[day.state];
    const color = hover ? adjustSeasonalBrightness(baseColor, SEASONAL_HOVER_BRIGHTEN) : baseColor;
    const clickable = day.state === SEASONAL_DAY_ACTIVE && !!day.quest;
    const label = day.quest
        ? localizeKeyOr(`quests.${day.quest.campaignCode}.name`, String(day.day))
        : localizeKeyOr(`quests.${prefix}_${day.day}.name`, String(day.day));
    const style = {
        left: `${SEASONAL_ENTITIES_LEFT_MARGIN + (day.day - 1) * SEASONAL_ENTITY_SPACING}px`,
        '--seasonal-indicator': toCssColor(color),
        '--seasonal-indicator-flash': toCssColor(adjustSeasonalBrightness(color, SEASONAL_FLASH_MAX_BRIGHTNESS))
    } as CSSProperties;

    useEffect(() => setImageFailed(false), [imageHost, day.day, day.state]);

    return (
        <NativeTextTree>
            <div className={`octane-seasonal-day octane-seasonal-day-state-${day.state}`} style={style}>
                {!imageFailed && (
                    <img
                        className="octane-seasonal-day-image"
                        src={`${imageHost}${getSeasonalDayImageName(day.day, day.state)}.png`}
                        alt=""
                        draggable={false}
                        onError={() => setImageFailed(true)}
                    />
                )}
                <div className="octane-seasonal-day-indicator-edge" />
                <div className={`octane-seasonal-day-indicator${flashing ? ' octane-seasonal-day-indicator-flash' : ''}`}>
                    <span className="octane-seasonal-day-indicator-text">{label}</span>
                    {day.state === SEASONAL_DAY_COMPLETED && <img className="octane-seasonal-day-indicator-status" src={questCompleteIcon} alt="" />}
                </div>
                {clickable && (
                    <BaseButton
                        type="button"
                        className="octane-seasonal-day-region"
                        aria-label={label}
                        onClick={() => onOpen(day.quest)}
                        onPointerEnter={() => setHover(true)}
                        onPointerLeave={() => setHover(false)}
                    />
                )}
            </div>
        </NativeTextTree>
    );
};

/** CatalogPromo: the offer of the day, its furni, and the balance of the calendar currency. */
const SeasonalCatalogPromoView: FC<{ currency: number }> = ({ currency }) => {
    const { dailyOffer = null } = useSeasonalCalendar();
    const { getCurrencyAmount = null } = usePurse();
    const offer = dailyOffer?.offer ?? null;
    const product = offer?.products?.[0] ?? null;
    const productType = product ? String(product.productType).toLowerCase() : '';
    const balance = getCurrencyAmount ? getCurrencyAmount(currency) : 0;

    const productName = useMemo(() => {
        if (!offer) return '';

        const productData = GetSessionDataManager().getProductData(offer.localizationId);

        if (productData?.name) return productData.name;

        if (!product) return '';

        const furniData = productType === 'i' ? GetSessionDataManager().getWallItemData(product.furniClassId) : GetSessionDataManager().getFloorItemData(product.furniClassId);

        return furniData?.name ?? '';
    }, [offer, product, productType]);

    return (
        <NativeTextTree>
            <div className="octane-seasonal-promo">
                <div className="octane-seasonal-promo-preview">
                    {product && (productType === 's' || productType === 'i') && (
                        <LayoutFurniImageView productType={product.productType} productClassId={product.furniClassId} extraData={product.extraParam} direction={2} />
                    )}
                </div>
                <div className="octane-seasonal-promo-info">
                    <div className="octane-seasonal-promo-header">{localizeWithFallback('quests.seasonalcalendar.promo.header', 'Offer of the day')}</div>
                    <div className="octane-seasonal-promo-name">{productName}</div>
                    <div className="octane-seasonal-promo-balance">
                        <span>{localizeWithFallback('quests.seasonalcalendar.promo.balance', 'You have: %amount%', ['amount'], [String(balance)])}</span>
                        <LayoutCurrencyIcon type={currency} />
                    </div>
                    <Button
                        className="octane-seasonal-promo-buy"
                        variant="success"
                        disabled={!offer}
                        onClick={() => offer && CreateLinkEvent(`catalog/open/offerId/${offer.offerId}`)}
                    >
                        {localizeWithFallback('quests.seasonalcalendar.promo.buy', 'To the Shop')}
                    </Button>
                </div>
            </div>
        </NativeTextTree>
    );
};

/** RareTeaser: three rares that unlock on configured days, from the calendar gallery. */
const SeasonalRareTeaserView: FC<{ highestDay: number; imageHost: string }> = ({ highestDay, imageHost }) => {
    const days = parseSeasonalIntList(LocalizeText('quests.seasonalcalendar.rareteaser.days'));
    const images = parseSeasonalStringList(LocalizeText('quests.seasonalcalendar.rareteaser.images'));
    const pages = parseSeasonalStringList(LocalizeText('quests.seasonalcalendar.rareteaser.pages'));
    const { locked, daysUntilNext } = getRareTeaserState(days.slice(0, 3), highestDay);

    return (
        <NativeTextTree>
            <div className="octane-seasonal-teaser">
                <div className="octane-seasonal-teaser-header">{localizeWithFallback('quests.seasonalcalendar.rareteaser.header', 'Unlocked items')}</div>
                <div className="octane-seasonal-teaser-rares">
                    {locked.map((isLocked, index) => (
                        <BaseButton
                            key={index}
                            type="button"
                            className={`octane-seasonal-teaser-rare${isLocked ? ' octane-seasonal-teaser-rare-locked' : ''}`}
                            disabled={isLocked || !pages[index]}
                            aria-label={isLocked ? 'Locked' : (pages[index] ?? '')}
                            onClick={() => pages[index] && CreateLinkEvent(`catalog/open/${pages[index]}`)}
                        >
                            {isLocked ? <span className="octane-seasonal-teaser-lock" /> : images[index] && <img src={`${imageHost}${images[index]}.png`} alt="" draggable={false} />}
                        </BaseButton>
                    ))}
                </div>
                {daysUntilNext !== -1 && (
                    <div className="octane-seasonal-teaser-info">
                        {localizeWithFallback('quests.seasonalcalendar.rareteaser.info', '%days% days until the next unlock.', ['days'], [String(daysUntilNext)])}
                    </div>
                )}
            </div>
        </NativeTextTree>
    );
};

/**
 * The official seasonal quest calendar (SeasonalCalendar.xml, 642x465): a strip of days with the
 * campaign images of `${image.library.url}<prefix>_quest_calendar/`, the catalogue promo of the
 * day and the rare teaser. Clicking today's day opens the quest details from the calendar.
 */
export const SeasonalCalendarView: FC<{}> = () => {
    const { enabled = false, prefix = '', quests = [], isVisible = false, close = null, goToQuestRoom = null } = useSeasonalCalendar();
    const { acceptQuest = null, rejectQuest = null } = useQuests();
    const { roomSession = null } = useRoom();
    const [offset, setOffset] = useState(-1);
    const [detailsQuest, setDetailsQuest] = useState<QuestMessageData>(null);
    const previousRoomRef = useRef(roomSession);
    const { currency, maximumEntities } = getSeasonalCalendarSettings();
    const imageHost = getSeasonalImageHost(GetConfigurationValue<string>('image.library.url', ''), prefix);

    const days = useMemo(() => buildSeasonalCalendarDays(quests, prefix, maximumEntities), [quests, prefix, maximumEntities]);
    const highestDay = useMemo(() => getHighestSeasonalDay(quests, prefix), [quests, prefix]);
    const flashingDay = getFlashingSeasonalDay(days, highestDay);
    const currentOffset = offset < 0 ? getInitialSeasonalOffset(highestDay, maximumEntities) : offset;
    const { canScrollBack, canScrollForward } = getSeasonalScrollLimits(currentOffset, days.length, maximumEntities, highestDay);
    const backgroundCount = getSeasonalBackgroundCount(days.length);

    // Calendar: the first answer places today three days from the left edge, later ones keep the scroll.
    useEffect(() => {
        if (offset < 0 && quests.length) setOffset(getInitialSeasonalOffset(highestDay, maximumEntities));
    }, [offset, quests.length, highestDay, maximumEntities]);

    // MainWindow.onRoomExit: leaving a room closes the calendar.
    useEffect(() => {
        if (previousRoomRef.current && !roomSession && close) close();

        previousRoomRef.current = roomSession;
    }, [roomSession, close]);

    useEffect(() => {
        if (!detailsQuest) return;

        const current = quests.find((quest) => quest.campaignCode === detailsQuest.campaignCode);

        if (current && current !== detailsQuest) setDetailsQuest(current.completedCampaign ? null : current);
    }, [quests, detailsQuest]);

    // The forward arrow stays active while offset < this, so a held arrow stops on the last step.
    const maxOffset = Math.max(0, Math.min(days.length - 4, maximumEntities - 7, highestDay - 1));
    const scrollBack = useCallback(() => setOffset((value) => Math.max(0, (value < 0 ? currentOffset : value) - 1)), [currentOffset]);
    const scrollForward = useCallback(() => setOffset((value) => Math.min(maxOffset, (value < 0 ? currentOffset : value) + 1)), [currentOffset, maxOffset]);

    if (!enabled) return null;

    const hasRoomLink = getSeasonalQuestRoomIds(prefix).length > 0;

    return (
        <NativeTextTree>
            <>
                {isVisible && (
                    <OctaneCard className="octane-seasonal-calendar" uniqueKey="seasonal-calendar" windowPosition={DraggableWindowPosition.CENTER}>
                        <OctaneCard.Header headerText={localizeWithFallback(`quests.${prefix}.title`, localizeWithFallback('quests.list.caption', 'Quests'))} onCloseClick={() => close && close()} />
                        <OctaneCard.Content className="octane-seasonal-calendar-content">
                            <div className="octane-seasonal-strip-window">
                                <div className="octane-seasonal-strip" style={{ transform: `translateX(-${currentOffset * SEASONAL_ENTITY_SPACING}px)` }}>
                                    {Array.from({ length: backgroundCount }, (_, index) => (
                                        <img
                                            key={`background-${index}`}
                                            className="octane-seasonal-background"
                                            style={{ left: `${index * SEASONAL_BACKGROUND_WIDTH}px` }}
                                            src={`${imageHost}background_${index + 1}.png`}
                                            alt=""
                                            draggable={false}
                                            onError={(event) => {
                                                event.currentTarget.style.visibility = 'hidden';
                                            }}
                                        />
                                    ))}
                                    {days.map((day) => (
                                        <SeasonalDayView key={day.day} day={day} imageHost={imageHost} prefix={prefix} flashing={day.day === flashingDay} onOpen={setDetailsQuest} />
                                    ))}
                                </div>
                                <img className="octane-seasonal-stripe-mask octane-seasonal-stripe-mask-left" src={stripeMaskLeft} alt="" draggable={false} />
                                <img className="octane-seasonal-stripe-mask octane-seasonal-stripe-mask-right" src={stripeMaskRight} alt="" draggable={false} />
                                <SeasonalArrow direction="back" active={canScrollBack} onStep={scrollBack} />
                                <SeasonalArrow direction="next" active={canScrollForward} onStep={scrollForward} />
                            </div>
                            <div className="octane-seasonal-footer">
                                <SeasonalCatalogPromoView currency={currency} />
                                <SeasonalRareTeaserView highestDay={highestDay} imageHost={imageHost} />
                            </div>
                        </OctaneCard.Content>
                    </OctaneCard>
                )}
                {detailsQuest && (
                    <OctaneCard className="octane-quest-details" uniqueKey="seasonal-quest-details" windowPosition={DraggableWindowPosition.CENTER}>
                        <OctaneCard.Header headerText={localizeWithFallback('quests.details.caption', 'Quest details')} onCloseClick={() => setDetailsQuest(null)} />
                        <OctaneCard.Content className="octane-quest-details-content">
                            <QuestEntryView
                                quest={detailsQuest}
                                showHint
                                onAccept={(quest) => {
                                    // QuestDetails opened from the calendar: accept, close the calendar, go to a quest room.
                                    acceptQuest && acceptQuest(quest.id);
                                    setDetailsQuest(null);
                                    close && close();
                                    if (hasRoomLink && goToQuestRoom) goToQuestRoom();
                                }}
                                onReject={(quest) => {
                                    rejectQuest && rejectQuest(quest.id);
                                    setDetailsQuest(null);
                                }}
                            />
                            {hasRoomLink && detailsQuest.waitPeriodSeconds < 1 && (
                                <BaseButton className="octane-quest-link" onClick={() => goToQuestRoom && goToQuestRoom()}>
                                    {localizeWithFallback('quests.gotocampaignroom', 'Go to the campaign room')}
                                </BaseButton>
                            )}
                        </OctaneCard.Content>
                    </OctaneCard>
                )}
            </>
        </NativeTextTree>
    );
};
