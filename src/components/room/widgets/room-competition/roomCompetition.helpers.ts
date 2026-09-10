import { localizeWithFallback } from '../../../../api';
import type { IRoomCompetitionState } from '../../../../hooks/rooms/widgets/useRoomCompetition';

/** `CompetitionVotingInfoResult`: anything but zero is a visitor who may not vote at all. */
export const COMPETITION_VOTING_ALLOWED = 0;

/** The official submit result codes; they pick the texts and the button. */
export const COMPETITION_RESULT_SUBMITTED = 0;
export const COMPETITION_RESULT_READY = 1;
export const COMPETITION_RESULT_CONFIRM = 2;
export const COMPETITION_RESULT_MISSING_FURNI = 3;
export const COMPETITION_RESULT_DOOR_CLOSED = 4;
export const COMPETITION_RESULT_NOT_ELIGIBLE = 5;
export const COMPETITION_RESULT_RULES = 6;

export type RoomCompetitionAction = 'accept' | 'submit' | 'confirm' | 'close' | 'navigator' | 'vote' | null;

/**
 * Which button the window offers, exactly as the official controller decides it: the rules are
 * accepted first, then the room is submitted, then the submission is confirmed. A room that is
 * missing furniture or has its door closed offers nothing to press, because neither is fixed here.
 */
export const competitionAction = (competition: IRoomCompetitionState): RoomCompetitionAction => {
    if (!competition) return null;

    if (competition.mode === 'vote') {
        return competition.result === COMPETITION_VOTING_ALLOWED && competition.votesRemaining > 0 ? 'vote' : null;
    }

    switch (competition.result) {
        case COMPETITION_RESULT_RULES:
            return 'accept';
        case COMPETITION_RESULT_READY:
            return 'submit';
        case COMPETITION_RESULT_CONFIRM:
            return 'confirm';
        case COMPETITION_RESULT_SUBMITTED:
            return 'close';
        case COMPETITION_RESULT_NOT_ELIGIBLE:
            return 'navigator';
        default:
            return null;
    }
};

/**
 * The official text lookup: try the key with the result code, fall back to the key without it, and
 * hide the element when neither exists. `%competition_name%` and `%votes%` are the two parameters
 * every one of those texts may carry.
 */
export const competitionText = (base: string, competition: IRoomCompetitionState, competitionName: string): string => {
    if (!competition) return '';

    const key = `${base}.${competition.mode}`;
    const parameters = ['competition_name', 'votes'];
    const values = [competitionName, competition.votesRemaining.toString()];
    const withResult = localizeWithFallback(`${key}.${competition.result}`, '', parameters, values);

    return withResult || localizeWithFallback(key, '', parameters, values);
};

/** The competition's own name, which every text can interpolate. */
export const competitionName = (competition: IRoomCompetitionState): string =>
    competition ? localizeWithFallback(`roomcompetition.${competition.goalCode}.name`, competition.goalCode) : '';

/**
 * The official texts carry markup for the parts that are links (`<u>see all participants</u>`).
 * The window underlines the whole info line instead, so the tags are dropped rather than shown.
 */
export const plainText = (value: string): string => value.replace(/<[^>]+>/g, '');
