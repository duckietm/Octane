import { LocalizeText } from '../utils/LocalizeText';
import { localizeWithFallback } from '../utils/localizeWithFallback';

/**
 * The guardian's side of a bully report (AIR GuideSessionController, chat review states) and the
 * reporter's verdict (ChatReviewReporterFeedbackCtrl), as pure tables and parsers.
 */

/** Vote codes sent with ChatReviewGuideVote and read back in ChatReviewSessionResults. */
export const GUARDIAN_VOTE_OK = 0;
export const GUARDIAN_VOTE_BAD = 1;
export const GUARDIAN_VOTE_VERY_BAD = 2;
/** The result code of a review that ended without a verdict (forwarded to the moderators). */
export const GUARDIAN_VOTE_FORWARDED = -1;

/** ChatReviewSessionVotingStatus codes, which index the status tables below. */
export const GUARDIAN_STATUS_AWAITING_VOTE = 0;
export const GUARDIAN_STATUS_VOTED_OK = 1;
export const GUARDIAN_STATUS_VOTED_BAD = 2;
export const GUARDIAN_STATUS_VOTED_VERY_BAD = 3;
export const GUARDIAN_STATUS_NO_VOTE = 4;
export const GUARDIAN_STATUS_FINDING_NEW_VOTER = 5;

/** AIR `_r14af66d3bdfb9a`: the text and icon of a vote or a status. */
export const GUARDIAN_STATUS_KEYS = ['waiting', 'ok', 'bad', 'very_bad', 'refused', 'searching'];
/** AIR `_r9c27036690f7e4`: the text of the final verdict, where a refused vote reads "inconclusive". */
export const GUARDIAN_RESULT_KEYS = ['waiting', 'ok', 'bad', 'very_bad', 'inconclusive', 'searching'];

/** AIR `GuideSessionController.statusFromVote`. */
export const statusFromVote = (vote: number): number => {
    switch (vote) {
        case GUARDIAN_VOTE_OK:
            return GUARDIAN_STATUS_VOTED_OK;
        case GUARDIAN_VOTE_BAD:
            return GUARDIAN_STATUS_VOTED_BAD;
        case GUARDIAN_VOTE_VERY_BAD:
            return GUARDIAN_STATUS_VOTED_VERY_BAD;
        case GUARDIAN_VOTE_FORWARDED:
            return GUARDIAN_STATUS_NO_VOTE;
        default:
            return GUARDIAN_STATUS_AWAITING_VOTE;
    }
};

/** A status the official client animates (still waiting for a vote, or looking for a voter). */
export const isAnimatedStatus = (status: number): boolean => status === GUARDIAN_STATUS_AWAITING_VOTE || status === GUARDIAN_STATUS_FINDING_NEW_VOTER;

const statusKey = (status: number): string => GUARDIAN_STATUS_KEYS[status] ?? GUARDIAN_STATUS_KEYS[GUARDIAN_STATUS_AWAITING_VOTE];

export interface IChatReviewLine {
    /** 0 is the reported user, every other number an anonymous user of the room. */
    userIndex: number;
    messages: string[];
}

export interface IChatReviewRecord {
    /** When the incident happened, or null when the record carries no complete date. */
    incidentTime: Date | null;
    lines: IChatReviewLine[];
}

/**
 * AIR `setStateGuardianChatReviewVote`: the record starts with "y m d h min s;" and then has one
 * "unused;userIndex;message" line per chat line, separated by "\r". Consecutive lines of the same
 * user are joined into one entry.
 */
export const parseChatReviewRecord = (record: string): IChatReviewRecord => {
    const source = record ?? '';
    const separator = source.indexOf(';');
    const numbers = (separator >= 0 ? source.substring(0, separator) : '').match(/\d+/g) ?? [];

    const incidentTime =
        numbers.length > 5
            ? new Date(Number(numbers[0]), Number(numbers[1]) - 1, Number(numbers[2]), Number(numbers[3]), Number(numbers[4]), Number(numbers[5]))
            : null;

    const lines: IChatReviewLine[] = [];

    for (const line of source.split('\r')) {
        if (!line.length) continue;

        const first = line.indexOf(';');
        const second = first >= 0 ? line.indexOf(';', first + 1) : -1;

        if (second < 0) continue;

        const userIndex = Number(line.substring(first + 1, second));

        if (!Number.isFinite(userIndex)) continue;

        // AIR cuts at the third ";" (split(";", 3)); the message keeps everything up to there.
        const rest = line.substring(second + 1);
        const third = rest.indexOf(';');
        const message = third >= 0 ? rest.substring(0, third) : rest;
        const last = lines[lines.length - 1];

        if (last && last.userIndex === userIndex) {
            last.messages.push(message);
            continue;
        }

        lines.push({ userIndex, messages: [message] });
    }

    return { incidentTime, lines };
};

/** Seconds between the incident and `now`, what the "(x ago)" label shows; 0 without a date. */
export const secondsSinceIncident = (incidentTime: Date | null, now: number): number => {
    if (!incidentTime) return 0;

    return Math.max(0, Math.floor((now - incidentTime.getTime()) / 1000));
};

/** Every chat review text with the English the official client shipped. */
const GUARDIAN_TEXTS: Record<string, string> = {
    'guide.bully.request.guide.accept.title': 'Your help requests',
    'guide.bully.request.guide.accept.request.title': 'New request',
    'guide.bully.request.guide.accept.request.type': 'Bully report',
    'guide.bully.request.guide.accept.request.description':
        'A user has reported a case of bullying. Look at the anonymous chat log and vote on the case together with other Guardians.',
    'guide.bully.request.guide.accept.accept.button': 'Accept request',
    'guide.bully.request.guide.accept.skip.link': "I can't help with this request",
    'guide.bully.request.guide.vote.title': 'A bully report',
    'guide.bully.request.guide.vote.subtitle': 'THE INCIDENT',
    'guide.bully.request.guide.vote.waiting': 'Waiting for other Guardians to look at the case...',
    'guide.bully.request.guide.vote.question': 'How do you think the user behaved?',
    'guide.bully.request.guide.vote.ok': 'OK',
    'guide.bully.request.guide.vote.bad': 'Bully',
    'guide.bully.request.guide.vote.very_bad': 'SERIOUS',
    'guide.bully.request.guide.vote.ok.tooltip': 'Maybe a little annoying and pesky.',
    'guide.bully.request.guide.vote.bad.tooltip': "Very cruel and mean! That's not OK!",
    'guide.bully.request.guide.vote.very_bad.tooltip': 'Worse than bullying - let our moderation team know!',
    'guide.bully.request.guide.vote.close': "I can't decide based on this chat log",
    'guide.bully.request.guide.vote.perpetrator': 'SUSPECT',
    'guide.bully.request.guide.vote.anonymous': 'USER %ID%',
    'guide.bully.request.guide.results.title': 'Waiting for votes',
    'guide.bully.request.guide.results.waiting.title': 'Wait for the votes to come in.',
    'guide.bully.request.guide.results.waiting.description': 'The final verdict will be shown here as soon as enough votes have come in.',
    'guide.bully.request.guide.results.votes': 'THE VOTES SO FAR:',
    'guide.bully.request.guide.results.wait': "Thanks for your vote! You can close this window if you don't want to wait for the final result.",
    'guide.bully.request.guide.results.your_vote': 'YOUR VOTE',
    'guide.bully.request.guide.results.final.title': 'The final verdict',
    'guide.bully.request.guide.results.final.votes': 'THE FINAL VOTES:',
    'guide.bully.request.guide.results.thanks': 'Thanks for your vote!',
    'guide.bully.request.guide.results.outcome.waiting': 'Waiting for vote...',
    'guide.bully.request.guide.results.outcome.ok': 'Suspect behaved acceptably.',
    'guide.bully.request.guide.results.outcome.bad': 'Suspect behaved badly!',
    'guide.bully.request.guide.results.outcome.very_bad': 'Suspect behaved horribly!',
    'guide.bully.request.guide.results.outcome.refused': 'The Guardian did not vote.',
    'guide.bully.request.guide.results.outcome.inconclusive': 'This report has been forwarded to us.',
    'guide.bully.request.guide.results.outcome.searching': 'Looking for Guardians',
    'guide.bully.request.error.not_enough_guardians.title': 'Voting without result',
    'guide.bully.request.error.not_enough_guardians.heading': 'Not enough Guardians',
    'guide.bully.request.error.not_enough_guardians.message':
        'Your report could not be handled because there are not enough Guardians online. The report has been forwarded to us.',
    'guide.bully.request.reporter.title': 'Not so fast!',
    'guide.bully.request.reporter.note': 'Did you know you can also ignore another user by selecting them and clicking Tools -> Ignore?',
    'guide.bully.request.reporter.sent.caption': 'Your report has been sent.',
    'guide.bully.request.reporter.sent.body':
        'The Guardians have received your report and are looking at it.<br/><br/>You will get a separate confirmation when appropriate action has been taken.',
    'guide.bully.request.reporter.blocked.caption': "You can't send new reports.",
    'guide.bully.request.reporter.blocked.body':
        'Your reports have repeatedly been judged invalid by the Guardians, so you cannot send bully reports for a short while.',
    'guide.bully.request.reporter.blocked.note':
        'You can still ignore a bullying user by selecting them and clicking Tools -> Ignore, and in an emergency send a call for help to the Moderators.',
    'guide.bully.request.reporter.nochat.caption': 'Oops!',
    'guide.bully.request.reporter.nochat.body': "The Guardians can't vote on your case because the user you reported has not said anything.",
    'guide.bully.request.reporter.nochat.note':
        'If this is an emergency and you feel threatened by this user, you can still send a call for help to the Moderators.',
    'guide.bully.request.reporter.alreadyreported.caption': 'Oops!',
    'guide.bully.request.reporter.alreadyreported.body': 'Someone else has already reported this Habbo and the Guardians are looking at the case.',
    'guide.bully.request.reporter.alreadyreported.note':
        'If this is an emergency and you feel threatened by this Habbo, you can still send a call for help to the Moderators.',
    'guide.bully.request.reporter.tooquick.caption': 'Oops!',
    'guide.bully.request.reporter.tooquick.body': 'You used the help system recently, so you have to wait a moment before you can make a new request.',
    'guide.bully.request.reporter.tooquick.note':
        'If this is an emergency and you feel threatened by a user, you can still send a call for help to the Moderators.',
    'guide.bully.request.reporter.valid.caption': 'Thank you!',
    'guide.bully.request.reporter.valid.body':
        'Your report has been reviewed and appropriate action has been taken.<br/><br/>Thanks for helping us keep Habbo safe and fun for everyone!',
    'guide.bully.request.reporter.invalid.caption': "Don't misuse the bully reporting system.",
    'guide.bully.request.reporter.invalid.body':
        'Misusing the bully reporting system is punishable and will mean you temporarily cannot report new cases.<br/><br/>Read the Habbo Way if you want to refresh your memory about which behaviour is appropriate in Habbo.',
    'guide.pending.bully.title': 'Request pending',
    'guide.pending.bully.subtitle': 'Your previous request is still being reviewed',
    'guide.pending.bully.description': 'Our Guardians are still looking at your previous bully report. Wait until they are done.',
    'guide.pending.bully.report': 'YOUR CURRENT BULLY REPORT BEING HANDLED:',
    'guide.pending.bully.room': 'in room %ROOM%',
    'guide.pending.guide.title': 'Ongoing help case',
    'guide.pending.guide.subtitle': 'You have an ongoing help case',
    'guide.pending.guide.description': 'You have already accepted a request as a Helper and cannot send help requests of your own until it is resolved.',
    'guide.pending.tour.title': 'Ongoing tour',
    'guide.pending.tour.subtitle': 'You are still taking part in a tour',
    'guide.pending.tour.description': 'You are taking part in a tour right now and cannot send other help requests in the meantime.',
    'guide.pending.instructions.title': 'Request pending',
    'guide.pending.instructions.subtitle': 'Your previous request is still pending.',
    'guide.pending.instructions.description':
        'You are taking part in a tour or already have a question out. Wait until it is finished before you send a new request.',
    'guide.pending.instructions.report': 'YOUR CURRENT QUESTION BEING HANDLED:',
    'help.bully.title': 'Report a bully',
    'help.bully.subtitle': 'Someone is behaving badly?',
    'help.bully.description': 'Tell us who has been mean to you or bullied you.',
    'help.bully.submit': 'Report the selected user',
    'alert.close.button': 'Close'
};

/** A chat review text, in the hotel's language when it has one and in English otherwise. */
export const guardianText = (key: string, parameters: string[] = null, replacements: string[] = null): string => {
    let fallback = GUARDIAN_TEXTS[key] ?? key;

    if (parameters && replacements) {
        parameters.forEach((parameter, index) => {
            fallback = fallback.replace(new RegExp(`%${parameter}%`, 'gi'), () => replacements[index] ?? '');
        });
    }

    return localizeWithFallback(key, fallback, parameters, replacements);
};

/** The text of a vote or a status, e.g. "Suspect behaved badly!". */
export const guardianStatusText = (status: number): string => guardianText(`guide.bully.request.guide.results.outcome.${statusKey(status)}`);

/** The text of the final verdict, where a review without verdict reads "forwarded to us". */
export const guardianResultText = (status: number): string =>
    guardianText(`guide.bully.request.guide.results.outcome.${GUARDIAN_RESULT_KEYS[status] ?? GUARDIAN_RESULT_KEYS[0]}`);

/** The icon key of a vote or status ("ok", "very-bad", "waiting", ...) as the assets are named. */
export const guardianStatusIcon = (status: number): string => statusKey(status).replace('_', '-');

/**
 * ChatReviewReporterFeedbackCtrl.setText: the feedback window reads
 * guide.bully.request.reporter.<code>.<part> and falls back to guide.bully.request.reporter.<part>
 * when that code has no text of its own (only the note is shared).
 */
export const reporterFeedbackText = (code: string, part: 'caption' | 'body' | 'note'): string => {
    const specific = `guide.bully.request.reporter.${code}.${part}`;
    const localized = LocalizeText(specific);

    if (GUARDIAN_TEXTS[specific] || (localized && localized !== specific)) return guardianText(specific);

    return guardianText(`guide.bully.request.reporter.${part}`);
};

/**
 * AIR HelpController.showPendingTicket: which pending window a ticket opens ("guide" when the user
 * is the guide of it, otherwise by request type), or null for a type it has none for.
 */
export const pendingTicketWindow = (type: number, isGuide: boolean): string | null => {
    if (isGuide) return 'guide';

    switch (type) {
        case 0:
        case 2:
            return 'tour';
        case 1:
            return 'instructions';
        case 3:
            return 'bully';
        default:
            return null;
    }
};

/** GuideTicketCreationResult (class_4165.localizationCode). */
export const creationResultCode = (result: number): string => {
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

/** GuideTicketResolution (class_4059.localizationCode): guardians took action or forwarded is "valid". */
export const resolutionCode = (resolution: number): string => (resolution === 0 || resolution === 1 ? 'valid' : 'invalid');

/** GuideReportingStatus (class_2120.localizationCode) for the answers that refuse a report. */
export const reportingStatusCode = (status: number): string => {
    switch (status) {
        case 2:
            return 'blocked';
        case 3:
            return 'tooquick';
        default:
            return '';
    }
};
