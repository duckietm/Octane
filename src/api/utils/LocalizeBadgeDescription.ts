import { GetLocalizationManager } from '@octane/renderer';

export const LocalizeBadgeDescription = (key: string) => {
    let badgeDesc = GetLocalizationManager().getBadgeDesc(key);

    if (!badgeDesc || !badgeDesc.length) badgeDesc = `badge_desc_${key}`;

    return badgeDesc;
};
