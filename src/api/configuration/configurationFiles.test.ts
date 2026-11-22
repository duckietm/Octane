import { describe, expect, it } from 'vitest';
import { LEGACY_CONFIGURATION_FILES, resolveConfigurationFiles } from './configurationFiles';

const parse = (text: string) => JSON.parse(text.replace(/^\s*\/\/.*$/gm, ''));

describe('resolveConfigurationFiles', () => {
    it('loads the files config.jsonc lists, in its order', async () => {
        const base = '{\n    // the files to load\n    "config.files": ["config/server.jsonc", "config/data.jsonc"]\n}';

        expect(await resolveConfigurationFiles(async () => base, parse)).toEqual(['config/server.jsonc', 'config/data.jsonc']);
    });

    it('keeps the two old files when a hotel has no config.jsonc', async () => {
        expect(await resolveConfigurationFiles(async () => null, parse)).toEqual(LEGACY_CONFIGURATION_FILES);
        expect(
            await resolveConfigurationFiles(async () => {
                throw new Error('offline');
            }, parse)
        ).toEqual(LEGACY_CONFIGURATION_FILES);
    });

    it('keeps the two old files when config.jsonc cannot be read or lists nothing usable', async () => {
        expect(await resolveConfigurationFiles(async () => '{ not json', parse)).toEqual(LEGACY_CONFIGURATION_FILES);
        expect(await resolveConfigurationFiles(async () => '{ "config.files": [] }', parse)).toEqual(LEGACY_CONFIGURATION_FILES);
    });

    it('drops entries that are not a relative .json path inside the configuration folder', async () => {
        const base = JSON.stringify({ 'config.files': ['config/server.jsonc', '../secret.json', '/etc/passwd.json', 'config/notes.txt', 42] });

        expect(await resolveConfigurationFiles(async () => base, parse)).toEqual(['config/server.jsonc']);
    });
});
