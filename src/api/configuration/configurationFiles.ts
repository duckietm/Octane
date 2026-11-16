/** The two files of the layout before config.jsonc: a hotel that has not split them still loads them. */
export const LEGACY_CONFIGURATION_FILES = ['renderer-config.json', 'ui-config.json'];

/** The base file: it lists the configuration files to load, in order (later files win). */
export const CONFIGURATION_BASE_FILE = 'config.jsonc';

/** A file the base may list: a relative path to a .json file, no way out of the configuration folder. */
const isConfigurationFile = (value: unknown): value is string =>
    typeof value === 'string' && /^[\w./-]+\.jsonc?$/.test(value) && !value.includes('..') && !value.startsWith('/');

/**
 * The configuration files to load. With config.jsonc present they are its "config.files"; without it (or when it
 * cannot be read or lists nothing usable) they are the two files of the old layout, so no hotel breaks on update.
 */
export const resolveConfigurationFiles = async (readBase: () => Promise<string | null>, parse: (text: string) => unknown): Promise<string[]> => {
    let text: string | null = null;

    try {
        text = await readBase();
    } catch {
        text = null;
    }

    if (!text) return LEGACY_CONFIGURATION_FILES;

    try {
        const base = parse(text) as { 'config.files'?: unknown };
        const files = Array.isArray(base?.['config.files']) ? base['config.files'].filter(isConfigurationFile) : [];

        return files.length ? files : LEGACY_CONFIGURATION_FILES;
    } catch {
        return LEGACY_CONFIGURATION_FILES;
    }
};
