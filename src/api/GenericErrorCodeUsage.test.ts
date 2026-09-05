import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GenericErrorCode } from './octane/session/GenericErrorCode';

const readSource = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('generic error protocol usage', () => {
    it('uses the renderer catalog instead of protocol number literals', () => {
        const doorState = readSource('src/hooks/rooms/widgets/useDoorState.ts');
        const navigator = readSource('src/hooks/navigator/useNavigatorStore.ts');
        const sources = doorState + navigator;

        expect(doorState).toContain('GenericErrorCode.WRONG_ROOM_PASSWORD');
        expect(navigator).toContain('GenericErrorCode.VIP_REQUIRED');
        expect(navigator).toContain('GenericErrorCode.ROOM_NAME_UNACCEPTABLE');
        expect(sources).not.toMatch(/parser\.errorCode\s*!==\s*-100002/);
        expect(sources).not.toMatch(/case\s+4009:/);
        expect(sources).not.toMatch(/case\s+4010:/);
    });

    it('matches the complete generic error protocol catalog', () => {
        expect(GenericErrorCode).toEqual({
            AUTHENTICATION_FAILED: -3,
            CONNECTING_TO_SERVER_FAILED: -400,
            KICKED_OUT_OF_ROOM: 4008,
            VIP_REQUIRED: 4009,
            ROOM_NAME_UNACCEPTABLE: 4010,
            CANNOT_BAN_GROUP_MEMBER: 4011,
            WRONG_ROOM_PASSWORD: -100002,
            TRADE_STRIP_LOCKED: -13001
        });
        expect(new Set(Object.values(GenericErrorCode)).size).toBe(Object.keys(GenericErrorCode).length);
    });
});
