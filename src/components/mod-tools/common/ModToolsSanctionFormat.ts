/** The slice of `CfhSanctionTypeData` the label needs. */
export interface DefaultSanctionInfo {
    name: string;
    sanctionLengthInHours: number;
    avatarOnly: boolean;
    tradeLockInfo?: string;
    machineBanInfo?: string;
}

/** The slice of a CFH category / topic the dropdown needs (`CallForHelpCategoryData` satisfies it). */
export interface CfhTopicEntry {
    id: number;
}

export interface CfhCategoryEntry {
    topics: CfhTopicEntry[];
}

/** `IssueHandler.initializeTopicDropdown`: a report in this category cannot be re-topiced. */
export const REPORTED_CATEGORY_TOPIC_LOCKED = 27;
/** `IssueHandler.onCloseSanction`: a report in this category needs a topic before the default sanction. */
export const REPORTED_CATEGORY_TOPIC_REQUIRED = 28;
/** The topic the official handler preselects for a category-3 / topic-28 issue. */
export const FALLBACK_TOPIC_ID = 1;

/**
 * `IssueManager.updateSanctionData`: "<name> [(avatar)] <length> [& trade lock] [& machine ban]",
 * the length in days past 24 hours and in hours otherwise.
 */
export const formatDefaultSanctionLabel = (sanction: DefaultSanctionInfo | null): string => {
    if (!sanction) return '';

    let label = (sanction.name ?? '') + (sanction.avatarOnly ? ' (avatar) ' : ' ');

    if (sanction.sanctionLengthInHours > 24) label += `${sanction.sanctionLengthInHours / 24} days`;
    else label += `${sanction.sanctionLengthInHours}h`;

    if (sanction.tradeLockInfo && sanction.tradeLockInfo.length) label += ` & ${sanction.tradeLockInfo}`;

    if (sanction.machineBanInfo && sanction.machineBanInfo.length) label += ` & ${sanction.machineBanInfo}`;

    return label;
};

/** The dropdown lists every topic of every category, in packet order. */
export const flattenCfhTopicIds = (categories: CfhCategoryEntry[] | null | undefined): number[] => {
    const ids: number[] = [];

    for (const category of categories || []) for (const topic of category?.topics || []) ids.push(topic.id);

    return ids;
};

/**
 * The topic preselected when the handler opens: the issue's own reported category when it is a
 * topic, the fallback topic for a category-3 / topic-28 issue, otherwise nothing (-1).
 */
export const getInitialTopicId = (topicIds: number[], categoryId: number, reportedCategoryId: number): number => {
    if (topicIds.includes(reportedCategoryId)) return reportedCategoryId;

    if (categoryId === 3 && reportedCategoryId === REPORTED_CATEGORY_TOPIC_REQUIRED && topicIds.includes(FALLBACK_TOPIC_ID)) return FALLBACK_TOPIC_ID;

    return -1;
};

/** `IssueHandler.onCloseSanction`: a topic-28 report without a chosen topic is refused. */
export const canCloseWithDefaultSanction = (topicId: number, reportedCategoryId: number): boolean =>
    !(topicId <= 0 && reportedCategoryId === REPORTED_CATEGORY_TOPIC_REQUIRED);
