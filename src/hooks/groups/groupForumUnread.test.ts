import { describe, expect, it } from 'vitest';
import {
    applyForumReadProgress,
    resolveFirstUnreadMessageIndex,
    resolveForumPollPeriodMs,
    resolveLastReadMessageIndex,
    resolveMessagePageStart
} from './groupForumUnread';

describe('resolveForumPollPeriodMs', () => {
    it('uses the configured period in seconds and falls back to 300s', () => {
        expect(resolveForumPollPeriodMs(60)).toBe(60000);
        expect(resolveForumPollPeriodMs('120')).toBe(120000);
        expect(resolveForumPollPeriodMs(undefined)).toBe(300000);
        expect(resolveForumPollPeriodMs(0)).toBe(300000);
    });
});

describe('resolveLastReadMessageIndex', () => {
    it('prefers the local marker and otherwise derives it from the counters', () => {
        expect(resolveLastReadMessageIndex(10, 3, 8)).toBe(8);
        expect(resolveLastReadMessageIndex(10, 3, null)).toBe(6);
        expect(resolveLastReadMessageIndex(10, 0, undefined)).toBe(9);
        expect(resolveLastReadMessageIndex(5, 5, undefined)).toBe(-1);
        expect(resolveLastReadMessageIndex(0, 0, undefined)).toBe(-1);
    });
});

describe('resolveFirstUnreadMessageIndex', () => {
    it('lands on the message after the last read one, clamped to the thread', () => {
        expect(resolveFirstUnreadMessageIndex(10, 6)).toBe(7);
        expect(resolveFirstUnreadMessageIndex(10, -1)).toBe(0);
        expect(resolveFirstUnreadMessageIndex(10, 9)).toBe(9);
        expect(resolveFirstUnreadMessageIndex(0, -1)).toBe(0);
    });
});

describe('resolveMessagePageStart', () => {
    it('returns the start of the page holding the message', () => {
        expect(resolveMessagePageStart(0, 20)).toBe(0);
        expect(resolveMessagePageStart(19, 20)).toBe(0);
        expect(resolveMessagePageStart(20, 20)).toBe(20);
        expect(resolveMessagePageStart(47, 20)).toBe(40);
        expect(resolveMessagePageStart(5, 0)).toBe(0);
    });
});

describe('applyForumReadProgress', () => {
    it('drops the forum unread count by the newly read messages, never below zero', () => {
        expect(applyForumReadProgress(5, 2, 4)).toBe(3);
        expect(applyForumReadProgress(1, 2, 9)).toBe(0);
        expect(applyForumReadProgress(5, 4, 4)).toBe(5);
        expect(applyForumReadProgress(5, 6, 4)).toBe(5);
    });
});
