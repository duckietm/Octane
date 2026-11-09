import { describe, expect, it } from 'vitest';
import { segmentMentionText } from './mentionSegments';

describe('segmentMentionText', () => {
    it('leaves a line without mentions as one plain segment', () => {
        expect(segmentMentionText('hello there', 'Bob')).toEqual([{ text: 'hello there', kind: '' }]);
    });

    it('tags a mention and keeps the spacing around it', () => {
        expect(segmentMentionText('hi @Alice  and bye', 'Bob')).toEqual([
            { text: 'hi ', kind: '' },
            { text: '@Alice', kind: 'tag' },
            { text: '  and bye', kind: '' }
        ]);
    });

    it('stops the tag before the punctuation that follows it', () => {
        expect(segmentMentionText('thanks @Bob, @all!', 'Bob')).toEqual([
            { text: 'thanks ', kind: '' },
            { text: '@Bob', kind: 'self' },
            { text: ', ', kind: '' },
            { text: '@all', kind: 'self' },
            { text: '!', kind: '' }
        ]);
    });

    it('treats a lone at sign and an at sign inside a word as plain text', () => {
        expect(segmentMentionText('mail @ me, a@b', 'Bob')).toEqual([{ text: 'mail @ me, a@b', kind: '' }]);
    });

    it('reads every alias as addressed to the viewer', () => {
        expect(segmentMentionText('@stanza', 'Bob')[0].kind).toBe('self');
    });
});
