/**
 * The timezones the room (and the time / date conditions) can pick: the hotel's own list from `wired.timezones` (a list, or the older comma separated string)
 * when it has one, otherwise everything the browser knows, with the room's current zone and the
 * hotel's server zone always present.
 */
export const buildTimezoneOptions = (current: string, hotelZone: string, configured: string | string[]): string[] => {
    const zones: string[] = [];
    const add = (zone: string) => {
        const trimmed = (zone || '').trim();

        if (trimmed && !zones.includes(trimmed)) zones.push(trimmed);
    };

    add(current);
    add(hotelZone);

    const fromConfig = (Array.isArray(configured) ? configured : (configured || '').split(','))
        .map((zone) => String(zone).trim())
        .filter(Boolean);

    if (fromConfig.length) {
        fromConfig.forEach(add);
    } else {
        try {
            const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];

            supported.forEach(add);
        } catch {
            // An older browser without the list still offers the zones it was given.
        }
    }

    add('UTC');

    return zones;
};
