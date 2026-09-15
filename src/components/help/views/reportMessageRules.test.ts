import { describe, expect, it } from 'vitest';
import { getRoomReportTopicKey, getUnlawfulReportError, ROOM_REPORT_TOPIC_ID } from './reportMessageRules';

describe('room / group / event report topic', () => {
    it('is the single official topic 34', () => {
        expect(ROOM_REPORT_TOPIC_ID).toBe(34);
        expect(getRoomReportTopicKey()).toBe('help.cfh.topic.34');
    });
});

describe('getUnlawfulReportError', () => {
    it('requires the confirmation, then a name, then an e-mail', () => {
        expect(getUnlawfulReportError(false, 'Frank', 'frank@habbo.com')).toBe('confirm');
        expect(getUnlawfulReportError(true, '   ', 'frank@habbo.com')).toBe('name');
        expect(getUnlawfulReportError(true, 'Frank', '')).toBe('email');
        expect(getUnlawfulReportError(true, 'Frank', 'frank@habbo.com')).toBeNull();
    });
});
