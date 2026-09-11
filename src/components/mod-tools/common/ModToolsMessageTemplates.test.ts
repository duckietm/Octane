import { describe, expect, it, vi } from 'vitest';

const config: Record<string, string> = {};

vi.mock('../../../api', () => ({
    GetConfigurationValue: (key: string, fallback: string) => config[key] ?? fallback
}));

import { parseTemplateList, resolveMessageTemplates } from './ModToolsMessageTemplates';

describe('mod tools message templates', () => {
    it('prefers the templates the init packet carried', () => {
        config['modtools.message.templates'] = 'from config';

        expect(resolveMessageTemplates(['Please stop.', ' Be nice. '], 'modtools.message.templates')).toEqual(['Please stop.', 'Be nice.']);
    });

    it('falls back to the configured list when the packet carried none', () => {
        config['modtools.message.templates'] = 'Please stop.|Be nice.';

        expect(resolveMessageTemplates([], 'modtools.message.templates')).toEqual(['Please stop.', 'Be nice.']);
        expect(resolveMessageTemplates(null, 'modtools.message.templates')).toEqual(['Please stop.', 'Be nice.']);
    });

    it('is empty when neither the packet nor the hotel provides templates', () => {
        delete config['modtools.room.message.templates'];

        expect(resolveMessageTemplates(undefined, 'modtools.room.message.templates')).toEqual([]);
    });

    it('splits a configured list on pipes or line breaks and drops blanks', () => {
        expect(parseTemplateList('one|two\nthree, with a comma|\n')).toEqual(['one', 'two', 'three, with a comma']);
    });
});
