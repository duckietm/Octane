import { LocalizeText } from '../../../../api';

export const localizeWithFallback = (key: string, fallback: string) =>
{
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

/** Server SnowWar error code (SnowWarConstants.ERROR_*) -> UITexts key and English fallback. */
export const SNOWWAR_ERROR_TEXTS: Record<number, [string, string]> = {
    1: ['snowwar.error.queue_full', 'The queue is full, try again soon!'],
    2: ['snowwar.error.already_in_game', 'You are already in a game.'],
    3: ['snowwar.error.not_enough_players', 'Not enough players to start.'],
    4: ['snowwar.error.no_tickets', 'You have no games left.'],
    5: ['snowwar.error.internal', 'Something went wrong, try again.'],
    6: ['snowwar.error.idle_warning', 'Are you still there? Move or throw a snowball, or you will be removed from the match.'],
    7: ['snowwar.error.idle_removed', 'You were removed from the match because you did nothing for too long.'],
};

/** Sent during a match to a player who has been idle for a while. */
export const SNOWWAR_ERROR_IDLE_WARNING = 6;

export const snowWarErrorText = (errorCode: number) =>
{
    const [key, fallback] = SNOWWAR_ERROR_TEXTS[errorCode] ?? SNOWWAR_ERROR_TEXTS[5];
    return localizeWithFallback(key, fallback);
};
