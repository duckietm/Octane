import { describe, expect, it } from 'vitest';
import { withoutTabs } from './WiredActionSetRoomAdView';

describe('WiredActionSetRoomAdView', () => {
    it('turns a pasted TAB into a space, so the caption and the description stay two fields', () => {
        expect(withoutTabs('Party\tnow')).toBe('Party now');
        expect(`${withoutTabs('a\tb')}\t${withoutTabs('c')}`.split('\t')).toEqual(['a b', 'c']);
    });
});
