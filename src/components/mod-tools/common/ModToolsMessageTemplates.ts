import { GetConfigurationValue } from '../../../api';

/**
 * The official client fills both template selects from the moderator init message
 * (`messageTemplates` for users, `roomMessageTemplates` for rooms). A hotel whose server
 * sends none can still provide a list through these configuration keys; entries are
 * separated by `|` or by line breaks so a template may contain commas.
 */
export const CONFIG_USER_MESSAGE_TEMPLATES = 'modtools.message.templates';
export const CONFIG_ROOM_MESSAGE_TEMPLATES = 'modtools.room.message.templates';

/** Splits a configured template list; blank entries are dropped so a trailing separator is harmless. */
export const parseTemplateList = (value: string): string[] =>
    (value || '')
        .split(/\r?\n|\|/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

/**
 * Templates from the packet win because they are what the server wants moderators to
 * send; the configuration only fills the gap when the packet carried none.
 */
export const resolveMessageTemplates = (packetTemplates: string[] | null | undefined, configKey: string): string[] => {
    const fromPacket = (packetTemplates || []).map((entry) => (entry || '').trim()).filter((entry) => entry.length > 0);

    if (fromPacket.length) return fromPacket;

    return parseTemplateList(GetConfigurationValue<string>(configKey, ''));
};
