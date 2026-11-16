import { GetConfiguration } from '@octane/renderer';

export function GetConfigurationValue<T = string>(key: string, value: T = null): T {
    return GetConfiguration().getValue(key, value);
}

export function GetOptionalConfigurationValue<T = string>(key: string, value: T = null): T {
    return GetConfiguration().definitions.has(key) ? GetConfiguration().getValue(key, value) : value;
}

/**
 * A key that replaced an older name: the new name wins, the old one is still read for a hotel that only set that one.
 * configuration-keys.json lists the old name under the new key's `replaces`, and `yarn config:sync` reports it.
 */
export function GetRenamedConfigurationValue<T = string>(key: string, oldKey: string, value: T = null): T {
    const definitions = GetConfiguration().definitions;

    if (!definitions.has(key) && definitions.has(oldKey)) return GetConfiguration().getValue(oldKey, value);

    return GetConfiguration().getValue(key, value);
}

/**
 * A configuration value that is an object of settings (`hc.center`, `catalog.links`, ...), or an empty one when the
 * key is missing or holds something else, so reading one field of it never throws on a partial or older config.
 */
export function GetConfigurationRecord(key: string): Record<string, any> {
    const value = GetConfiguration().getValue<unknown>(key, null);

    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};
}
