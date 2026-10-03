import { LocalizeText } from '../utils/LocalizeText';

/** "user.ban" -> the localized "housekeeping.audit.action.user.ban", or the raw key when untranslated. */
export const localizeHousekeepingAction = (action: string): string => {
    const key = `housekeeping.audit.action.${action}`;
    const text = LocalizeText(key);

    return text && text !== key ? text : action;
};

/**
 * Name and reason of a sanction template in the operator's language: the text
 * files translate "housekeeping.template.<id>.name" / ".reason", and a template
 * without a translation keeps its own text.
 */
export const localizeSanctionTemplate = (template: { id: string; name: string; defaultReason: string }): { name: string; reason: string } => {
    const nameKey = `housekeeping.template.${template.id}.name`;
    const reasonKey = `housekeeping.template.${template.id}.reason`;
    const name = LocalizeText(nameKey);
    const reason = LocalizeText(reasonKey);

    return { name: name && name !== nameKey ? name : template.name, reason: reason && reason !== reasonKey ? reason : template.defaultReason };
};
