import { FC, useEffect, useState } from 'react';
import {
    CalendarItemState,
    getCalendarDayState,
    getCalendarItemsOnScreen,
    getCalendarListWidth,
    getCalendarRewardName,
    getCalendarSpinnerLayout,
    ICalendarItem,
    LocalizeText
} from '../../api';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { useHasPermission } from '../../hooks';
import { CalendarItemView } from './CalendarItemView';
import '../../css/campaign/CampaignCalendarView.css';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

interface CalendarViewProps {
    onClose(): void;
    openPackage(id: number, asStaff: boolean): void;
    receivedProducts: Map<number, ICalendarItem>;
    /** What each day opened before held, from the calendar data (Octane servers send it). */
    openedRewards?: Map<number, ICalendarItem>;
    campaignName: string;
    currentDay: number;
    numDays: number;
    openedDays: number[];
    missedDays: number[];
}

const getStageWidth = () => (typeof window === 'undefined' ? 1280 : window.innerWidth);

/**
 * AIR's campaign calendar (layout `calendar`): the day heading and info next to the advent icon, and below them a
 * spinner of 202 px day columns that keeps the selected day in the middle and shades the others. As many days show as
 * fit on the stage, up to five.
 */
export const CalendarView: FC<CalendarViewProps> = (props) => {
    const {
        onClose = null,
        campaignName = null,
        currentDay = 0,
        numDays = 0,
        missedDays = [],
        openedDays = [],
        openPackage = null,
        receivedProducts = null,
        openedRewards = null
    } = props;
    const [selectedDay, setSelectedDay] = useState(Math.max(0, Math.min(currentDay, numDays - 1)));
    const [stageWidth, setStageWidth] = useState(getStageWidth);
    const isModerator = useHasPermission('acc_calendar_force');

    useEffect(() => {
        const onResize = () => setStageWidth(getStageWidth());

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    const spinnerWidth = getCalendarListWidth(getCalendarItemsOnScreen(stageWidth));
    const spinner = getCalendarSpinnerLayout(selectedDay, spinnerWidth);
    const getDayState = (day: number) => getCalendarDayState(day, currentDay, openedDays, missedDays);
    const selectedState = getDayState(selectedDay);
    // AIR's setReceivedProduct: right after a day is opened its heading names what came out of it.
    const receivedProduct = receivedProducts?.get(selectedDay) ?? null;

    const dayMessage = () => {
        switch (selectedState) {
            case CalendarItemState.STATE_UNLOCKED:
                return LocalizeText('campaign.calendar.info.unlocked');
            case CalendarItemState.STATE_LOCKED_FUTURE:
                return LocalizeText('campaign.calendar.info.future');
            case CalendarItemState.STATE_LOCKED_EXPIRED:
                return LocalizeText('campaign.calendar.info.expired');
            default:
                return LocalizeText('campaign.calendar.info.available.desktop');
        }
    };

    const select = (day: number) => {
        if (day >= 0 && day < numDays) setSelectedDay(day);
    };

    const onClickItem = (day: number) => {
        if (day !== selectedDay) return select(day);

        if (selectedState === CalendarItemState.STATE_LOCKED_AVAILABLE) openPackage(day, false);
    };

    const forceOpen = () => {
        if (selectedState !== CalendarItemState.STATE_UNLOCKED) openPackage(selectedDay, true);
    };

    return (
        <NativeTextTree>
            <OctaneCardView className="octane-campaign-calendar" theme="primary-slim" style={{ width: spinnerWidth }}>
                <OctaneCardHeaderView
                    headerText={localizeWithFallback(`campaign.calendar.${campaignName}.title`, localizeWithFallback('campaign.calendar.title', 'Calendar'))}
                    onCloseClick={onClose}
                />
                <OctaneCardContentView className="octane-campaign-calendar__content" overflow="hidden">
                    <div className="octane-campaign-calendar__info">
                        <div className="octane-campaign-calendar__icon" />
                        <div className="octane-campaign-calendar__texts">
                            <div className="octane-campaign-calendar__heading">
                                {receivedProduct
                                    ? LocalizeText('campaign.calendar.heading.product.received')
                                    : LocalizeText('campaign.calendar.heading.day', ['number'], [(selectedDay + 1).toString()])}
                            </div>
                            <div className="octane-campaign-calendar__body">{receivedProduct ? getCalendarRewardName(receivedProduct) : dayMessage()}</div>
                        </div>
                        {isModerator && (
                            <Button
                                className="octane-campaign-calendar__force-open"
                                disabled={selectedState === CalendarItemState.STATE_UNLOCKED}
                                variant="danger"
                                onClick={forceOpen}
                            >
                                Force open
                            </Button>
                        )}
                    </div>
                    <div className="octane-campaign-calendar__spinner" data-testid="calendar-spinner">
                        <div className="octane-campaign-calendar__track" style={{ transform: `translateX(${spinner.offset}px)` }}>
                            {Array.from({ length: numDays }, (_, day) => (
                                <CalendarItemView
                                    key={day}
                                    active={selectedDay === day}
                                    itemId={day}
                                    product={receivedProducts?.get(day) ?? openedRewards?.get(day) ?? null}
                                    state={getDayState(day)}
                                    onClick={onClickItem}
                                />
                            ))}
                        </div>
                        <div className="octane-campaign-calendar__shade is-left" style={{ width: spinner.leftShade }} />
                        <div className="octane-campaign-calendar__shade is-right" style={{ width: spinner.rightShade }} />
                    </div>
                    <BaseButton
                        aria-label="previous"
                        className="octane-campaign-calendar__arrow is-back"
                        disabled={selectedDay <= 0}
                        onClick={() => select(selectedDay - 1)}
                    />
                    <BaseButton
                        aria-label="next"
                        className="octane-campaign-calendar__arrow is-forward"
                        disabled={selectedDay >= numDays - 1}
                        onClick={() => select(selectedDay + 1)}
                    />
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
