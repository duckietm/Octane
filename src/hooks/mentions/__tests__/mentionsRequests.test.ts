import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IMentionEntry } from '../../../api/mentions';

const sent: unknown[] = [];

vi.mock('../../../api', () => ({
    SendMessageComposer: (composer: unknown) => sent.push(composer)
}));

const { deleteMention, markAllMentionsRead, markMentionRead, MENTIONS_REQUEST_TIMEOUT_MS, requestMentions, requestMoreMentions } = await import('../mentionsRequests');
const { getMentionsSnapshot, getMentionsStatus, getUnreadCount, isLoadingMoreMentions, resetMentions, setMentions } = await import('../mentionsStore');

const make = (id: number, read = false): IMentionEntry => ({
    mentionId: id,
    senderId: 1,
    senderUsername: 'Bob',
    senderFigure: '',
    roomId: 9,
    roomName: 'R',
    message: 'hi',
    mentionType: 0,
    timestamp: id,
    read
});

describe('mentions requests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        sent.length = 0;
        resetMentions();
    });

    afterEach(() => vi.useRealTimers());

    it('asks for the list once while the answer is on its way', () => {
        requestMentions();
        requestMentions();

        expect(sent).toHaveLength(1);
        expect(getMentionsStatus()).toBe('loading');
    });

    it('turns a list that never comes into an error, and allows asking again', () => {
        requestMentions();
        vi.advanceTimersByTime(MENTIONS_REQUEST_TIMEOUT_MS);

        expect(getMentionsStatus()).toBe('error');

        requestMentions();

        expect(sent).toHaveLength(2);
    });

    it('marks one mention read here and on the server, once', () => {
        setMentions([make(1), make(2)]);

        markMentionRead(getMentionsSnapshot().find((mention) => mention.mentionId === 1)!);
        markMentionRead(getMentionsSnapshot().find((mention) => mention.mentionId === 1)!);

        expect(sent).toHaveLength(1);
        expect(getUnreadCount()).toBe(1);
    });

    it('marks everything read only when something is unread', () => {
        setMentions([make(1, true)]);
        markAllMentionsRead();

        expect(sent).toHaveLength(0);

        setMentions([make(1), make(2, true)]);
        markAllMentionsRead();

        expect(sent).toHaveLength(1);
        expect(getUnreadCount()).toBe(0);
    });

    it('deletes on the server and drops it from the list', () => {
        setMentions([make(1), make(2)]);
        deleteMention(make(1));

        expect(sent).toHaveLength(1);
        expect(getMentionsSnapshot().map((mention) => mention.mentionId)).toEqual([2]);
    });
});

describe('mentions paging request', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        sent.length = 0;
        resetMentions();
    });

    afterEach(() => vi.useRealTimers());

    it('does nothing when no older mention remains', () => {
        setMentions([make(5)], false);

        requestMoreMentions();

        expect(sent).toHaveLength(0);
    });

    it('asks once while the page is on its way', () => {
        setMentions([make(5), make(4)], true);

        requestMoreMentions();
        requestMoreMentions();

        expect(sent).toHaveLength(1);
        expect(isLoadingMoreMentions()).toBe(true);
    });

    it('frees the request when the page never comes', () => {
        setMentions([make(5)], true);

        requestMoreMentions();
        vi.advanceTimersByTime(MENTIONS_REQUEST_TIMEOUT_MS);

        expect(isLoadingMoreMentions()).toBe(false);

        requestMoreMentions();

        expect(sent).toHaveLength(2);
    });
});
