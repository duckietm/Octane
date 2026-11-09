// Task icons of the reward track, keyed by the official action name the server sends
// (the official client draws reward_track_tasks_<action>).
const rawRewardTrackTaskIcons = import.meta.glob('./*.png', { eager: true, import: 'default' });

export const REWARD_TRACK_TASK_ICON_URLS: Record<string, string> = Object.entries(rawRewardTrackTaskIcons).reduce(
    (accumulator, [path, url]) => {
        const stem = (path.split('/').pop() || '').replace(/\.png$/i, '');

        if (stem) accumulator[stem] = url as string;

        return accumulator;
    },
    {} as Record<string, string>
);

export const GetRewardTrackTaskIconUrl = (actionType: string): string | null => REWARD_TRACK_TASK_ICON_URLS[(actionType || '').toLowerCase()] ?? null;
