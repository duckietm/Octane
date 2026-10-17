/**
 * Leave block of the games hub (AIR GamesMainViewController.checkBlockStatus):
 * after leaving a running match the play button is disabled and shows the
 * time left as m:ss. The server sends the length in seconds
 * (Game2UserBlocked / Game2GameDirectoryStatus); it is kept as a wall-clock
 * deadline so a throttled tab still counts down correctly.
 */
export const snowWarBlockDeadline = (seconds: number, now: number): number =>
    (seconds > 0) ? now + (seconds * 1000) : 0;

export const snowWarBlockSecondsLeft = (deadline: number, now: number): number =>
    (deadline > now) ? Math.ceil((deadline - now) / 1000) : 0;

export const formatSnowWarBlockCountdown = (seconds: number): string =>
{
    const total = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;

    return `${ minutes }:${ (rest < 10) ? '0' : '' }${ rest }`;
};
