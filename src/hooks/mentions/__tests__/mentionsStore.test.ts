import { beforeEach, describe, expect, it } from 'vitest';
import { IMentionEntry } from '../../../api/mentions';
import { addMention, appendMentions, getHasMoreMentions, getMentionsSnapshot, getOldestMentionId, isLoadingMoreMentions, setLoadingMoreMentions, getMentionsStatus, getUnreadCount, isMentionsPanelOpen, markAllRead, markRead, MAX_MENTIONS, resetMentions, setMentions, setMentionsPanelOpen, setMentionsStatus } from '../mentionsStore';

const make = (id: number, read = false): IMentionEntry => ({
    mentionId: id,
    senderId: 1,
    senderUsername: 'Bob',
    senderFigure: '',
    roomId: 9,
    roomName: 'R',
    message: '@me hi',
    mentionType: 0,
    timestamp: 0,
    read
});

describe('mentionsStore', () => {
    beforeEach(() => resetMentions());

    it('adds newest-first and counts unread', () => {
        addMention(make(1));
        addMention(make(2));
        expect(getMentionsSnapshot()[0].mentionId).toBe(2);
        expect(getUnreadCount()).toBe(2);
    });

    it('setMentions replaces and recomputes unread', () => {
        setMentions([make(1, true), make(2, false)]);
        expect(getMentionsSnapshot()).toHaveLength(2);
        expect(getUnreadCount()).toBe(1);
    });

    it('markAllRead zeroes unread', () => {
        setMentions([make(1), make(2)]);
        markAllRead();
        expect(getUnreadCount()).toBe(0);
    });

    it('markRead clears a single entry', () => {
        setMentions([make(1), make(2)]);
        markRead(1);
        expect(getUnreadCount()).toBe(1);
        expect(getMentionsSnapshot().find((m) => m.mentionId === 1)!.read).toBe(true);
    });
});

describe('mentionsStore status, cap and duplicates', () => {
    beforeEach(() => resetMentions());

    it('keeps the status apart from the list and ends the waiting when the list arrives', () => {
        expect(getMentionsStatus()).toBe('idle');
        setMentionsStatus('loading');
        expect(getMentionsStatus()).toBe('loading');
        setMentions([make(1)]);
        expect(getMentionsStatus()).toBe('ready');
    });

    it('sorts newest first by time and keeps the arrival order inside one second', () => {
        setMentions([{ ...make(1), timestamp: 10 }, { ...make(3), timestamp: 20 }, { ...make(2), timestamp: 20 }]);
        expect(getMentionsSnapshot().map((m) => m.mentionId)).toEqual([3, 2, 1]);
    });

    it('never keeps more than the cap, dropping the oldest', () => {
        setMentions(Array.from({ length: MAX_MENTIONS + 20 }, (_, index) => ({ ...make(index + 1), timestamp: index + 1 })));
        expect(getMentionsSnapshot()).toHaveLength(MAX_MENTIONS);
        expect(getMentionsSnapshot()[0].mentionId).toBe(MAX_MENTIONS + 20);
    });

    it('does not add the same mention twice, including those without an id', () => {
        addMention(make(5));
        addMention(make(5));
        addMention({ ...make(0), message: 'again' });
        addMention({ ...make(0), message: 'again' });
        expect(getMentionsSnapshot()).toHaveLength(2);
    });

    it('does nothing when there is nothing to mark', () => {
        setMentions([make(1, true)]);
        const before = getMentionsSnapshot();
        markAllRead();
        markRead(99);
        expect(getMentionsSnapshot()).toBe(before);
    });

    it('remembers whether the panel is open', () => {
        expect(isMentionsPanelOpen()).toBe(false);
        setMentionsPanelOpen(true);
        expect(isMentionsPanelOpen()).toBe(true);
        resetMentions();
        expect(isMentionsPanelOpen()).toBe(false);
    });
});

describe('mentionsStore paging', () => {
    beforeEach(() => resetMentions());

    it('remembers whether older mentions remain and waits for the next page', () => {
        setMentions([make(5), make(4)], true);
        expect(getHasMoreMentions()).toBe(true);
        setLoadingMoreMentions(true);
        expect(isLoadingMoreMentions()).toBe(true);
    });

    it('asks the next page from the oldest id it holds', () => {
        setMentions([make(9), make(4), make(7)], true);
        expect(getOldestMentionId()).toBe(4);
    });

    it('has nothing to ask from when no mention has an id', () => {
        expect(getOldestMentionId()).toBe(0);
        setMentions([make(0)], true);
        expect(getOldestMentionId()).toBe(0);
    });

    it('adds a page below the list, skips what it already holds, and ends the waiting', () => {
        setMentions([{ ...make(5), timestamp: 50 }, { ...make(4), timestamp: 40 }], true);
        setLoadingMoreMentions(true);
        appendMentions([{ ...make(4), timestamp: 40 }, { ...make(3), timestamp: 30 }, { ...make(2), timestamp: 20 }], false);

        expect(getMentionsSnapshot().map((mention) => mention.mentionId)).toEqual([5, 4, 3, 2]);
        expect(getHasMoreMentions()).toBe(false);
        expect(isLoadingMoreMentions()).toBe(false);
    });

    it('a fresh list replaces the paging state', () => {
        setMentions([make(5)], true);
        setLoadingMoreMentions(true);
        setMentions([make(6)], false);

        expect(getHasMoreMentions()).toBe(false);
        expect(isLoadingMoreMentions()).toBe(false);
    });
});
