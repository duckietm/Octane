import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', () => ({ OpenUrl: () => {} }));
vi.mock('../../../../common', () => ({ Flex: () => null }));
vi.mock('../../../../layout', () => ({ OctaneInput: () => null }));

import { parseSearchResults } from './NotificationSearchAlertView';

describe('parseSearchResults', () => {
    it('keeps the strings of a JSON array', () => {
        expect(parseSearchResults('["a", 1, "b"]')).toEqual(['a', 'b']);
    });

    it.each(['not json', '{"a":1}', 'null'])('gives no results for %s instead of throwing in render', (message) => {
        expect(parseSearchResults(message)).toEqual([]);
    });
});
