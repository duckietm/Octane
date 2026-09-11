/**
 * Pure logic of the guardian chat review jury (GuideSessionController.as:92-110, 195-213,
 * 1104-1160, 1277-1320) and of the reporter feedback (ChatReviewReporterFeedbackCtrl.as,
 * parsers class_3954 / class_4054).
 */

/** The vote a guardian sends (ChatReviewGuideVoteMessageComposer). */
export const CHAT_REVIEW_VOTE_NONE = -1;
export const CHAT_REVIEW_VOTE_OK = 0;
export const CHAT_REVIEW_VOTE_BAD = 1;
export const CHAT_REVIEW_VOTE_VERY_BAD = 2;

/** The status of one juror (ChatReviewSessionVotingStatusMessageParser.status). */
export const CHAT_REVIEW_STATUS_WAITING = 0;
export const CHAT_REVIEW_STATUS_OK = 1;
export const CHAT_REVIEW_STATUS_BAD = 2;
export const CHAT_REVIEW_STATUS_VERY_BAD = 3;
export const CHAT_REVIEW_STATUS_REFUSED = 4;
export const CHAT_REVIEW_STATUS_SEARCHING = 5;

/** STATUS_KEYS: the icon and the per-juror text of a status. */
export const CHAT_REVIEW_STATUS_KEYS = ['waiting', 'ok', 'bad', 'very_bad', 'refused', 'searching'];

/** RESULT_KEYS: the text of the final verdict (index 4 reads "inconclusive" instead of "refused"). */
export const CHAT_REVIEW_RESULT_KEYS = ['waiting', 'ok', 'bad', 'very_bad', 'inconclusive', 'searching'];

export const CHAT_REVIEW_STATUS_TEXT_PREFIX = 'guide.bully.request.guide.results.outcome.';

const STATUS_FALLBACKS: Record<string, string> = {
    waiting: 'Waiting for vote...',
    ok: 'The suspect behaved acceptably.',
    bad: 'The suspect behaved badly!',
    very_bad: 'The suspect behaved awfully!',
    refused: 'The Guardian did not vote.',
    inconclusive: 'The case has been forwarded to us.',
    searching: 'Searching for Guardian...'
};

/** statusFromVote: a vote code (-1..2) becomes a status index (refused / ok / bad / very_bad). */
export const chatReviewStatusFromVote = (vote: number): number => {
    switch (vote) {
        case CHAT_REVIEW_VOTE_NONE:
            return CHAT_REVIEW_STATUS_REFUSED;
        case CHAT_REVIEW_VOTE_OK:
            return CHAT_REVIEW_STATUS_OK;
        case CHAT_REVIEW_VOTE_BAD:
            return CHAT_REVIEW_STATUS_BAD;
        case CHAT_REVIEW_VOTE_VERY_BAD:
            return CHAT_REVIEW_STATUS_VERY_BAD;
        default:
            return CHAT_REVIEW_STATUS_WAITING;
    }
};

const clampStatus = (status: number): number => (status >= 0 && status < CHAT_REVIEW_STATUS_KEYS.length ? status : CHAT_REVIEW_STATUS_WAITING);

/** The key of a juror status text (`guide.bully.request.guide.results.outcome.<status>`). */
export const getChatReviewStatusKey = (status: number): string => `${CHAT_REVIEW_STATUS_TEXT_PREFIX}${CHAT_REVIEW_STATUS_KEYS[clampStatus(status)]}`;

/** The key of the verdict text; the verdict comes as a vote code. */
export const getChatReviewResultKey = (winningVote: number): string =>
    `${CHAT_REVIEW_STATUS_TEXT_PREFIX}${CHAT_REVIEW_RESULT_KEYS[clampStatus(chatReviewStatusFromVote(winningVote))]}`;

export const getChatReviewStatusFallback = (status: number): string => STATUS_FALLBACKS[CHAT_REVIEW_STATUS_KEYS[clampStatus(status)]];

export const getChatReviewResultFallback = (winningVote: number): string =>
    STATUS_FALLBACKS[CHAT_REVIEW_RESULT_KEYS[clampStatus(chatReviewStatusFromVote(winningVote))]];

/** The icon name of a status (`help_chat_review_decision_<status>`); waiting and searching are animated. */
export const getChatReviewStatusIcon = (status: number): string => CHAT_REVIEW_STATUS_KEYS[clampStatus(status)];

export const isChatReviewStatusAnimated = (status: number): boolean => status === CHAT_REVIEW_STATUS_WAITING || status === CHAT_REVIEW_STATUS_SEARCHING;

export interface ChatReviewRecordEntry {
    /** 0 is the reported user ("SUSPECT"), the others are anonymous ("USER n"). */
    userIndex: number;
    isSuspect: boolean;
    lines: string[];
}

export interface ChatReviewRecord {
    /** Seconds between the incident and `now`; 0 when the record carries no usable timestamp. */
    incidentAgeSeconds: number;
    entries: ChatReviewRecordEntry[];
}

/**
 * setStateGuardianChatReviewVote: the record starts with the incident timestamp
 * (`YYYY MM DD hh mm ss;`), then one `<ignored>;<userIndex>;<message>` line per chat
 * message separated by `\r`; consecutive lines of the same user are grouped.
 */
export const parseChatReviewRecord = (record: string, now: Date = new Date()): ChatReviewRecord => {
    const text = record ?? '';
    const separator = text.indexOf(';');
    const header = separator >= 0 ? text.substring(0, separator) : text;
    const numbers = (header.match(/\d+/g) ?? []).map((value) => parseInt(value, 10));

    let incidentAgeSeconds = 0;

    if (numbers.length > 5) {
        const incident = new Date(numbers[0], numbers[1] - 1, numbers[2], numbers[3], numbers[4], numbers[5]);

        incidentAgeSeconds = Math.max(0, (now.getTime() - incident.getTime()) / 1000);
    }

    const entries: ChatReviewRecordEntry[] = [];

    for (const line of text.split('\r')) {
        if (!line.length) continue;

        const parts = line.split(';');

        if (parts.length < 3) continue;

        const userIndex = parseInt(parts[1], 10);

        if (Number.isNaN(userIndex)) continue;

        const message = parts.slice(2).join(';');
        const last = entries[entries.length - 1];

        if (last && last.userIndex === userIndex) {
            last.lines.push(message);
            continue;
        }

        entries.push({ userIndex, isSuspect: userIndex === 0, lines: [message] });
    }

    return { incidentAgeSeconds, entries };
};

/** ChatReviewReporterFeedbackCtrl: the localization code of a ticket creation result (class_4054). */
export const getChatReviewCreationCode = (result: number): string => {
    switch (result) {
        case 0:
            return 'sent';
        case 1:
            return 'blocked';
        case 2:
            return 'nochat';
        case 3:
            return 'alreadyreported';
        default:
            return 'invalid';
    }
};

/** The localization code of a ticket resolution (class_3954): 0 and 1 are "valid", the rest "invalid". */
export const getChatReviewResolutionCode = (resolution: number): string => (resolution === 0 || resolution === 1 ? 'valid' : 'invalid');

/**
 * setText: `guide.bully.request.reporter.<code>.<part>` when the text exists, otherwise
 * the shared `guide.bully.request.reporter.<part>`.
 */
export const getChatReviewReporterTextKeys = (code: string, part: string): string[] => [
    `guide.bully.request.reporter.${code}.${part}`,
    `guide.bully.request.reporter.${part}`
];
