/**
 * Validation of the free-text step of a call for help, mirrored from the
 * official TopicsFlowHelpController: an empty message and a message shorter
 * than `help.cfh.length.minimum` (15 by default) are refused with an alert.
 */
export const REPORT_MESSAGE_MINIMUM_LENGTH_DEFAULT = 15;

// The category the hotel names "unlawful_activity" asks for evidence instead
// of the generic "tell us what happened" prompt.
export const UNLAWFUL_ACTIVITY_CATEGORY = 'unlawful_activity';

export type ReportMessageError = 'nomsg' | 'msgtooshort';

export const resolveReportMessageMinimumLength = (configured: unknown): number => {
    const minimum = Number(configured);

    return Number.isFinite(minimum) && minimum > 0 ? minimum : REPORT_MESSAGE_MINIMUM_LENGTH_DEFAULT;
};

export const getReportMessageError = (message: string, minimumLength: number): ReportMessageError | null => {
    const trimmed = (message || '').trim();

    if (!trimmed.length) return 'nomsg';

    if (trimmed.length < minimumLength) return 'msgtooshort';

    return null;
};

export const isUnlawfulActivityCategory = (categoryName: string): boolean => categoryName === UNLAWFUL_ACTIVITY_CATEGORY;

/**
 * Room / group / event reports (official `populateRoomReportButton`): the
 * reason list collapses to the single topic 34, whose text carries the name
 * of the reported room / group / event.
 */
export const ROOM_REPORT_TOPIC_ID = 34;

export const getRoomReportTopicKey = (): string => `help.cfh.topic.${ROOM_REPORT_TOPIC_ID}`;

export type UnlawfulReportError = 'confirm' | 'name' | 'email';

/**
 * Official verifyMessage for the unlawful-activity category: the confirmation
 * box must be ticked and both the name and the e-mail filled, otherwise the
 * step is refused with the "tell us what happened" alert.
 */
export const getUnlawfulReportError = (confirmed: boolean, name: string, email: string): UnlawfulReportError | null => {
    if (!confirmed) return 'confirm';

    if (!(name || '').trim().length) return 'name';

    if (!(email || '').trim().length) return 'email';

    return null;
};
