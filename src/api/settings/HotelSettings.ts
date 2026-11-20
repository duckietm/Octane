import { GetCommunication, HotelSettingsEvent } from '@octane/renderer';
import { HotelSettings, useHotelSettingsStore } from '../../state/hotelSettingsStore';

const listening = { registered: false };

/**
 * Keeps the hotel settings the server sends with each login state. It has to be listening before the connection
 * opens: the packet comes in the login burst, before any component mounts.
 */
export const ListenForHotelSettings = (): void => {
    if (listening.registered) return;

    listening.registered = true;

    GetCommunication().registerMessageEvent(
        new HotelSettingsEvent((event: HotelSettingsEvent) => {
            const parser = event.getParser();

            useHotelSettingsStore.getState().setSettings({
                cameraUrl: parser.cameraUrl,
                chatMaxLength: parser.chatMaxLength,
                mottoMaxLength: parser.mottoMaxLength,
                botNameMaxLength: parser.botNameMaxLength,
                petNameMaxLength: parser.petNameMaxLength,
                mentionAliases: { everyone: parser.everyoneAliases, friends: parser.friendsAliases, room: parser.roomAliases }
            });
        })
    );
};

export const GetHotelSettings = (): HotelSettings | null => useHotelSettingsStore.getState().settings;

type ServerLength = 'chatMaxLength' | 'mottoMaxLength' | 'botNameMaxLength' | 'petNameMaxLength';

/** A length limit: the one the server enforces when it sent one, else the hotel's configured value. */
export const resolveServerLength = (settings: HotelSettings | null, field: ServerLength, configured: number): number => {
    const server = settings?.[field] ?? 0;

    return server > 0 ? server : configured;
};

/** The words after @ the server treats as mentions for one scope, else the hotel's configured ones. */
export const resolveMentionAliases = (settings: HotelSettings | null, scope: keyof HotelSettings['mentionAliases'], configured: string[]): string[] => {
    const server = settings?.mentionAliases[scope] ?? [];

    return server.length ? server : configured;
};

/** Every word after @ the server treats as a mention, for highlighting; null until the server sent them. */
export const GetServerMentionAliases = (): string[] | null => {
    const aliases = GetHotelSettings()?.mentionAliases;

    if (!aliases) return null;

    const all = [...aliases.everyone, ...aliases.friends, ...aliases.room];

    return all.length ? all : null;
};

