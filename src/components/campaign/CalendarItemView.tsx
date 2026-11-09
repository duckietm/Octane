import { FC } from 'react';
import { CalendarItemState, getCalendarRewardImageUrl, ICalendarItem } from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

interface CalendarItemViewProps {
    itemId: number;
    state: number;
    active?: boolean;
    product?: ICalendarItem;
    onClick: (itemId: number) => void;
}

/**
 * One day column of AIR's calendar (`btn_slot`): the day background, the present button (the green "?" while closed,
 * the yellow burst with the opened box once opened) and, for a missed or future day, the lock in the corner.
 * The selected day that can be opened bounces like AIR's CalendarItemWiggle.
 */
export const CalendarItemView: FC<CalendarItemViewProps> = (props) => {
    const { itemId = -1, state = null, product = null, active = false, onClick = null } = props;
    const opened = state === CalendarItemState.STATE_UNLOCKED;
    const locked = state === CalendarItemState.STATE_LOCKED_EXPIRED || state === CalendarItemState.STATE_LOCKED_FUTURE;
    const wiggle = active && state === CalendarItemState.STATE_LOCKED_AVAILABLE;
    const iconUrl = getCalendarRewardImageUrl(product);

    return (
        <NativeTextTree>
            <div className={`octane-calendar-day${active ? ' is-active' : ''}`} data-state={state}>
                <BaseButton aria-label={`day ${itemId + 1}`} className="octane-calendar-day__present" onClick={() => onClick(itemId)}>
                    <span className={`octane-calendar-day__bg${opened ? ' is-opened' : ''}${wiggle ? ' is-wiggling' : ''}`} />
                    {opened && <span className="octane-calendar-day__opened" />}
                    {opened && iconUrl && <img alt="" className="octane-calendar-day__icon" draggable={false} src={iconUrl} />}
                </BaseButton>
                {locked && <span className="octane-calendar-day__lock" />}
            </div>
        </NativeTextTree>
    );
};
