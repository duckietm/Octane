import { localizeWithFallback } from '../../../../api/utils/localizeWithFallback';
/**
 * Int params of the time-utilities add-on: `[mask, mode]`. Bit `id` of the mask creates the
 * sub-variable with that id; calendar parts are ids 1-10, time units since 1970 are ids 20-26.
 */
export const TIME_UTIL_MODE_VALUE = 0;
export const TIME_UTIL_MODE_CREATION_TIME = 1;
export const TIME_UTIL_MODE_LAST_UPDATE_TIME = 2;

export const TIME_UTIL_MODES = [TIME_UTIL_MODE_VALUE, TIME_UTIL_MODE_CREATION_TIME, TIME_UTIL_MODE_LAST_UPDATE_TIME];

/** The mode segment of a part's name: the server names a part `<variable>.<mode>.<part>`, e.g. `joined.value.hour_of_day`. */
const TIME_UTIL_MODE_KEYS: Record<number, string> = {
    [TIME_UTIL_MODE_VALUE]: 'value',
    [TIME_UTIL_MODE_CREATION_TIME]: 'creation_time',
    [TIME_UTIL_MODE_LAST_UPDATE_TIME]: 'last_update_time'
};

/** The name a part gets after its variable's name, for the box's mode. */
export const timeUtilPartName = (mode: number, partName: string) => `${TIME_UTIL_MODE_KEYS[mode] ?? TIME_UTIL_MODE_KEYS[TIME_UTIL_MODE_VALUE]}.${partName}`;

/**
 * A timestamp mode also lists the timestamp itself after the variable's name (`joined.creation_time`,
 * `joined.last_update_time`), whatever parts are ticked; the value mode lists nothing extra.
 */
export const timeUtilTimestampName = (mode: number) => (mode === TIME_UTIL_MODE_CREATION_TIME || mode === TIME_UTIL_MODE_LAST_UPDATE_TIME ? TIME_UTIL_MODE_KEYS[mode] : null);

/** Value-mode parts can be written (the variable moves by the difference); timestamp parts are read-only. */
export const isTimeUtilModeWritable = (mode: number) => mode === TIME_UTIL_MODE_VALUE;

export interface ITimeUtilSubVariable {
    id: number;
    name: string;
    label: string;
}

export const TIME_UTIL_SUB_VARIABLES: ITimeUtilSubVariable[] = [
    { id: 1, name: 'milliseconds_of_seconds', get label() { return localizeWithFallback('octane.wired.millisecond_of_the_second', 'Millisecond of the second'); } },
    { id: 2, name: 'seconds_of_minute', get label() { return localizeWithFallback('octane.wired.second_of_the_minute', 'Second of the minute'); } },
    { id: 3, name: 'minute_of_hour', get label() { return localizeWithFallback('octane.wired.minute_of_the_hour', 'Minute of the hour'); } },
    { id: 4, name: 'hour_of_day', get label() { return localizeWithFallback('octane.wired.hour_of_the_day', 'Hour of the day'); } },
    { id: 5, name: 'day_of_week', get label() { return localizeWithFallback('octane.wired.day_of_the_week', 'Day of the week'); } },
    { id: 6, name: 'day_of_month', get label() { return localizeWithFallback('octane.wired.day_of_the_month', 'Day of the month'); } },
    { id: 7, name: 'day_of_year', get label() { return localizeWithFallback('octane.wired.day_of_the_year', 'Day of the year'); } },
    { id: 8, name: 'week_of_year', get label() { return localizeWithFallback('octane.wired.week_of_the_year', 'Week of the year'); } },
    { id: 9, name: 'month_of_year', get label() { return localizeWithFallback('octane.wired.month_of_the_year', 'Month of the year'); } },
    { id: 10, name: 'year', label: 'Year' }
];

export const TIME_UTIL_ADVANCED_SUB_VARIABLES: ITimeUtilSubVariable[] = [
    { id: 20, name: 'millisecond', label: 'Milliseconds' },
    { id: 21, name: 'second', label: 'Seconds' },
    { id: 22, name: 'minute', label: 'Minutes' },
    { id: 23, name: 'hour', label: 'Hours' },
    { id: 24, name: 'day', label: 'Days' },
    { id: 25, name: 'week', label: 'Weeks' },
    { id: 26, name: 'month', label: 'Months' }
];

const VALID_MASK = [...TIME_UTIL_SUB_VARIABLES, ...TIME_UTIL_ADVANCED_SUB_VARIABLES].reduce((mask, subVariable) => mask | (1 << subVariable.id), 0);

export const normalizeTimeUtilMask = (value: number) => (Number.isInteger(value) ? value & VALID_MASK : 0);

export const normalizeTimeUtilMode = (value: number) => (TIME_UTIL_MODES.includes(value) ? value : TIME_UTIL_MODE_VALUE);

export const isTimeUtilSubVariableSelected = (mask: number, id: number) => (mask & (1 << id)) !== 0;

export const setTimeUtilSubVariableSelected = (mask: number, id: number, selected: boolean) =>
    normalizeTimeUtilMask(selected ? mask | (1 << id) : mask & ~(1 << id));

/** What a room variable can be read as, for the mode dropdown. */
export interface ITimeUtilVariableCapabilities {
    hasValue: boolean;
    canReadCreationTime: boolean;
    canReadLastUpdateTime: boolean;
}

const TIME_UTIL_MODE_CAPABILITY: Record<number, (variable: ITimeUtilVariableCapabilities) => boolean> = {
    [TIME_UTIL_MODE_VALUE]: (variable) => variable.hasValue,
    [TIME_UTIL_MODE_CREATION_TIME]: (variable) => variable.canReadCreationTime,
    [TIME_UTIL_MODE_LAST_UPDATE_TIME]: (variable) => variable.canReadLastUpdateTime
};

/**
 * Official VariableTimeUtilAddon: the dropdown only offers a mode some variable of the room can be read
 * as (all of them when the room has none), and always the stored mode.
 */
export const availableTimeUtilModes = (variables: ITimeUtilVariableCapabilities[], current: number): number[] =>
    TIME_UTIL_MODES.filter((mode) => mode === current || !variables.length || variables.some(TIME_UTIL_MODE_CAPABILITY[mode]));
