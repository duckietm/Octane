/**
 * The seasonal quest calendar of the official client (quest/seasonalcalendar: MainWindow, Calendar,
 * CalendarEntityStateEnums, RareTeaser). One campaign per day, `<prefix>_<day>`, whose quest sort
 * order is the day; the strip shows every day up to the highest available one plus two locked
 * days ahead, seven at a time.
 */

/** CalendarEntityStateEnums: ACTIVE, INACTIVE (a day still to come), COMPLETED, and a missed day. */
export const SEASONAL_DAY_ACTIVE = 0;
export const SEASONAL_DAY_INACTIVE = 1;
export const SEASONAL_DAY_COMPLETED = 2;
export const SEASONAL_DAY_UNAVAILABLE = 3;

export type SeasonalDayState = typeof SEASONAL_DAY_ACTIVE | typeof SEASONAL_DAY_INACTIVE | typeof SEASONAL_DAY_COMPLETED | typeof SEASONAL_DAY_UNAVAILABLE;

/** CalendarEntityStateEnums.INDICATOR_COLOR, per state. */
export const SEASONAL_INDICATOR_COLORS: Record<SeasonalDayState, number> = {
    [SEASONAL_DAY_ACTIVE]: 0x20911d,
    [SEASONAL_DAY_INACTIVE]: 0xbdd0d2,
    [SEASONAL_DAY_COMPLETED]: 0x999999,
    [SEASONAL_DAY_UNAVAILABLE]: 0x999999
};

/** Calendar's layout constants. */
export const SEASONAL_ENTITY_SPACING = 80;
export const SEASONAL_ENTITIES_LEFT_MARGIN = 37;
export const SEASONAL_VISIBLE_ENTITIES = 7;
export const SEASONAL_FUTURE_INACTIVE_ENTITIES = 2;
export const SEASONAL_SCROLL_MARGIN = 3;
export const SEASONAL_BACKGROUND_WIDTH = 640;
export const SEASONAL_DEFAULT_MAXIMUM_ENTITIES = 42;
/** The calendar asks the server again when the date changed, checked every five minutes. */
export const SEASONAL_DAILY_REFRESH_MS = 5 * 60 * 1000;
/** Hover brightens the indicator by 0x202020. */
export const SEASONAL_HOVER_BRIGHTEN = 0x20;
export const SEASONAL_FLASH_MAX_BRIGHTNESS = 100;

export interface SeasonalQuestLike {
    campaignCode: string;
    sortOrder: number;
    completedCampaign: boolean;
}

export interface SeasonalCalendarDay<T extends SeasonalQuestLike = SeasonalQuestLike> {
    /** 1-based day, the quest sort order. */
    day: number;
    state: SeasonalDayState;
    quest: T | null;
}

/** HabboQuestEngine.isSeasonalQuest: the campaign code starts with the configured prefix. */
export const isSeasonalQuest = (quest: Pick<SeasonalQuestLike, 'campaignCode'>, prefix: string): boolean =>
    !!prefix && !!quest && typeof quest.campaignCode === 'string' && quest.campaignCode.indexOf(prefix) === 0;

/** MainWindow's highest available day: the highest sort order among the seasonal quests. */
export const getHighestSeasonalDay = (quests: SeasonalQuestLike[], prefix: string): number => {
    let highest = 0;

    for (const quest of quests) {
        if (isSeasonalQuest(quest, prefix)) highest = Math.max(highest, quest.sortOrder);
    }

    return highest;
};

/** The number of days on the strip: the highest day plus two to come, capped by the maximum. */
export const getSeasonalEntityCount = (highestDay: number, maximumEntities: number): number =>
    Math.max(0, Math.min(maximumEntities, highestDay + SEASONAL_FUTURE_INACTIVE_ENTITIES));

/** Calendar.prepareImages: every day gets a state, a quest for the days the server sent. */
export const buildSeasonalCalendarDays = <T extends SeasonalQuestLike>(quests: T[], prefix: string, maximumEntities: number): SeasonalCalendarDay<T>[] => {
    const seasonal = quests.filter((quest) => isSeasonalQuest(quest, prefix)).sort((a, b) => a.sortOrder - b.sortOrder);
    const highestDay = getHighestSeasonalDay(seasonal, prefix);
    const count = getSeasonalEntityCount(highestDay, maximumEntities);
    const days: SeasonalCalendarDay<T>[] = [];

    for (let index = 0; index < count; index++) {
        const day = index + 1;
        const quest = seasonal.find((value) => value.sortOrder === day) ?? null;

        let state: SeasonalDayState = SEASONAL_DAY_UNAVAILABLE;

        if (quest) state = quest.completedCampaign ? SEASONAL_DAY_COMPLETED : SEASONAL_DAY_ACTIVE;
        else if (day > highestDay) state = SEASONAL_DAY_INACTIVE;

        days.push({ day, state, quest });
    }

    return days;
};

/** Calendar._r506c277abd736f: the strip opens with today three days from the left edge. */
export const getInitialSeasonalOffset = (highestDay: number, maximumEntities: number): number =>
    Math.max(0, Math.min(highestDay - SEASONAL_SCROLL_MARGIN, maximumEntities - SEASONAL_VISIBLE_ENTITIES));

/** The arrows: back while not at the start, forward while days are left and not past today. */
export const getSeasonalScrollLimits = (offset: number, entityCount: number, maximumEntities: number, highestDay: number) => ({
    canScrollBack: offset > 0,
    canScrollForward:
        offset < Math.min(entityCount - SEASONAL_SCROLL_MARGIN - 1, maximumEntities - SEASONAL_VISIBLE_ENTITIES) && offset < highestDay - 1
});

/** The day image: `day<n>_uncomplete` or `day<n>_completed`. */
export const getSeasonalDayImageName = (day: number, state: SeasonalDayState): string =>
    `day${day}${state === SEASONAL_DAY_COMPLETED ? '_completed' : '_uncomplete'}`;

/** The strip background is cut in 640 px slices, `background_<n>`. */
export const getSeasonalBackgroundCount = (entityCount: number): number => Math.ceil(entityCount / SEASONAL_VISIBLE_ENTITIES) + 1;

/** MainWindow.getCalendarImageGalleryHost: `${image.library.url}<prefix>_quest_calendar/`. */
export const getSeasonalImageHost = (imageLibraryUrl: string, prefix: string): string => `${imageLibraryUrl ?? ''}${prefix}_quest_calendar/`;

/** Calendar.adjustBrightness: every channel moves by the same amount, clamped. */
export const adjustSeasonalBrightness = (color: number, amount: number): number => {
    const channel = (value: number) => Math.min(255, Math.max(0, value + amount));

    return (channel((color >> 16) & 255) << 16) + (channel((color >> 8) & 255) << 8) + channel(color & 255);
};

export const toCssColor = (color: number): string => `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;

/** The day of the calendar that flashes: today, while its quest is still open. */
export const getFlashingSeasonalDay = (days: SeasonalCalendarDay[], highestDay: number): number => {
    const today = days[highestDay - 1];

    return today && today.state === SEASONAL_DAY_ACTIVE ? highestDay : -1;
};

/** RareTeaser.parseInts / parseStrings over the comma lists of the localization. */
export const parseSeasonalIntList = (value: string): number[] =>
    (value ?? '')
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part !== '' && !Number.isNaN(Number(part)))
        .map((part) => Number.parseInt(part, 10));

export const parseSeasonalStringList = (value: string): string[] =>
    (value ?? '')
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part !== '');

/** RareTeaser.refresh: a rare is locked while its day is ahead; the info counts to the next one. */
export const getRareTeaserState = (unlockDays: number[], highestDay: number) => {
    const locked = unlockDays.map((day) => day > highestDay);
    const next = unlockDays.find((day) => day > highestDay);

    return { locked, daysUntilNext: next === undefined ? -1 : next - highestDay };
};

/** HabboQuestEngine._r32b882492d068c: a random room of `quests.<prefix>.roomids`. */
export const pickSeasonalQuestRoomId = (roomIds: string, random: number = Math.random()): number | null => {
    const ids = parseSeasonalIntList(roomIds).filter((id) => id > 0);

    if (!ids.length) return null;

    const index = Math.max(0, Math.min(ids.length - 1, Math.floor(random * ids.length)));

    return ids[index];
};

/** Calendar.TimerEvent: true when the local date moved since the last check. */
export const hasSeasonalDateChanged = (lastDate: number, now: Date = new Date()): boolean => lastDate !== now.getDate();
