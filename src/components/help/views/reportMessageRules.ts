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
