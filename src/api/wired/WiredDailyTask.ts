export const DAILY_TASK_NAME_MAX_LENGTH = 100;

export const normalizeDailyTaskName = (value: string): string => {
    const raw = value ?? '';

    return raw.substring(raw.lastIndexOf('\t') + 1).replace(/[\r\n]/g, '').slice(0, DAILY_TASK_NAME_MAX_LENGTH);
};
