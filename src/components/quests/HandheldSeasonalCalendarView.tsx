import { QuestMessageData } from '@octane/renderer';
import { FC, ReactNode, useEffect, useRef, useState } from 'react';
import {
    getSeasonalDayImageName,
    localizeWithFallback,
    SEASONAL_DAY_ACTIVE,
    SEASONAL_DAY_COMPLETED,
    SEASONAL_DAY_INACTIVE,
    SeasonalCalendarDay
} from '../../api';
import questCompleteIcon from '../../assets/images/quests/seasonal-calendar/calendar_quest_complete.png';
import { BaseButton } from '../../common/BaseButton';
import { DraggableWindow } from '../../common/draggable-window';
import { HandheldSheetFrame } from '../../common/handheld/HandheldSheetFrame';
import { useHandheldLayout } from '../../hooks/handheld/useHandheldLayout';

type DayLook = 'open' | 'done' | 'missed' | 'coming';

const lookOf = (state: number): DayLook =>
    state === SEASONAL_DAY_ACTIVE ? 'open' : state === SEASONAL_DAY_COMPLETED ? 'done' : state === SEASONAL_DAY_INACTIVE ? 'coming' : 'missed';

const LOOK_TEXTS: Record<DayLook, [string, string]> = {
    open: ['octane.handheld.room_extras.seasonal.open', 'Open'],
    done: ['octane.handheld.room_extras.seasonal.done', 'Done'],
    missed: ['octane.handheld.room_extras.seasonal.missed', 'Missed'],
    coming: ['octane.handheld.room_extras.seasonal.coming', 'Soon']
};

/** A day of the calendar: its picture, number and state; only an open day with a quest opens. */
const DayTile: FC<{
    day: SeasonalCalendarDay<QuestMessageData>;
    label: string;
    imageHost: string;
    today: boolean;
    selected: boolean;
    onOpen: (quest: QuestMessageData) => void;
}> = ({ day, label, imageHost, today, selected, onOpen }) => {
    const [imageFailed, setImageFailed] = useState(false);
    const look = lookOf(day.state);
    const clickable = day.state === SEASONAL_DAY_ACTIVE && !!day.quest;
    const stateText = localizeWithFallback(...LOOK_TEXTS[look]);

    useEffect(() => setImageFailed(false), [imageHost, day.day, day.state]);

    const body = (
        <>
            <span className="octane-handheld-rx-seasonal__day-art">
                {!imageFailed && (
                    <img alt="" draggable={false} src={`${imageHost}${getSeasonalDayImageName(day.day, day.state)}.png`} onError={() => setImageFailed(true)} />
                )}
            </span>
            <span className="octane-handheld-rx-seasonal__day-number">{day.day}</span>
            <span className="octane-handheld-rx-seasonal__day-state">
                {look === 'done' && <img alt="" draggable={false} src={questCompleteIcon} />}
                {stateText}
            </span>
        </>
    );
    const common = {
        className: 'octane-handheld-rx-seasonal__day',
        'data-look': look,
        'data-today': today || undefined,
        'data-selected': selected || undefined,
        'data-testid': `seasonal-day-${day.day}`
    };

    if (!clickable)
        return (
            <div {...common} aria-label={`${label}: ${stateText}`} role="img">
                {body}
            </div>
        );

    return (
        <BaseButton {...common} aria-label={`${label}: ${stateText}`} onClick={() => onOpen(day.quest)}>
            {body}
        </BaseButton>
    );
};

interface HandheldSeasonalCalendarViewProps {
    title: string;
    days: SeasonalCalendarDay<QuestMessageData>[];
    labelOf: (day: SeasonalCalendarDay<QuestMessageData>) => string;
    imageHost: string;
    flashingDay: number;
    highestDay: number;
    /** The open day's quest, shown as a page (upright) or beside the days (on its side). */
    detailsQuest: QuestMessageData | null;
    /** The quest's card with its accept / cancel and the campaign room link, built by SeasonalCalendarView. */
    details: ReactNode;
    promo: ReactNode;
    teaser: ReactNode;
    onOpenDay: (quest: QuestMessageData) => void;
    onCloseDetails: () => void;
    onClose: () => void;
}

/**
 * The seasonal calendar on a phone: a sheet with every day as a finger-sized tile (picture, number, state; today
 * marked), the offer of the day and the unlocked rares as cards under them. An open day's quest is a page with Back
 * upright, and the right column on its side. The grid shows every day at once, so the strip's arrows are not needed;
 * SeasonalCalendarView keeps the quests, the links and the accept / reject packets.
 */
export const HandheldSeasonalCalendarView: FC<HandheldSeasonalCalendarViewProps> = (props) => {
    const { title, days, labelOf, imageHost, flashingDay, highestDay, detailsQuest, details, promo, teaser, onOpenDay, onCloseDetails, onClose } = props;
    const { orientation } = useHandheldLayout();
    const gridRef = useRef<HTMLDivElement>(null);
    const showDetailsPage = !!detailsQuest && orientation === 'portrait';
    const todayDay = flashingDay > 0 ? flashingDay : highestDay;

    // Opened, today's tile is brought into view (the strip opened near today as well).
    useEffect(() => {
        if (showDetailsPage) return;

        const today = gridRef.current?.querySelector<HTMLElement>('[data-today]');

        today?.scrollIntoView?.({ block: 'nearest' });
    }, [showDetailsPage, todayDay]);

    const detailPage = detailsQuest && (
        <section className="octane-handheld-rx-seasonal__details" data-testid="handheld-seasonal-details">
            <div className="octane-handheld-rx__page-head">
                <BaseButton className="octane-handheld-rx__back" onClick={onCloseDetails}>
                    <svg aria-hidden="true" className="octane-handheld-rx__chevron" viewBox="0 0 16 16">
                        <path d="M10 3 L5 8 L10 13" />
                    </svg>
                    {orientation === 'portrait'
                        ? localizeWithFallback('octane.handheld.room_extras.back', 'Back')
                        : localizeWithFallback('generic.close', 'Close')}
                </BaseButton>
                <span className="octane-handheld-rx__page-title">{localizeWithFallback('quests.details.caption', 'Quest details')}</span>
            </div>
            {details}
        </section>
    );

    return (
        <DraggableWindow handheldSheet uniqueKey="seasonal-calendar">
            <HandheldSheetFrame className="octane-handheld-rx octane-handheld-rx-seasonal" icon="icon-progression" title={title} onClose={onClose}>
                <div className="octane-handheld-rx-seasonal__layout" data-page={showDetailsPage ? 'details' : 'days'}>
                    {showDetailsPage ? (
                        <div className="octane-handheld-rx__scroll">{detailPage}</div>
                    ) : (
                        <>
                            <div className="octane-handheld-rx__scroll octane-handheld-rx-seasonal__main">
                                <div ref={gridRef} className="octane-handheld-rx-seasonal__days" data-testid="handheld-seasonal-days">
                                    {days.map((day) => (
                                        <DayTile
                                            key={day.day}
                                            day={day}
                                            imageHost={imageHost}
                                            label={labelOf(day)}
                                            selected={!!detailsQuest && day.quest === detailsQuest}
                                            today={day.day === todayDay}
                                            onOpen={onOpenDay}
                                        />
                                    ))}
                                </div>
                                {orientation === 'portrait' && (
                                    <div className="octane-handheld-rx-seasonal__extras">
                                        {promo}
                                        {teaser}
                                    </div>
                                )}
                            </div>
                            {orientation === 'landscape' && (
                                <div className="octane-handheld-rx__scroll octane-handheld-rx-seasonal__side">
                                    {detailPage || (
                                        <div className="octane-handheld-rx-seasonal__extras">
                                            {promo}
                                            {teaser}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </HandheldSheetFrame>
        </DraggableWindow>
    );
};
