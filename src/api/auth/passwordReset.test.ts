import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPendingPasswordResetToken, getPendingPasswordResetToken, takePasswordResetTokenFromUrl } from './passwordReset';

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345_-abcdefghi';

const take = (href: string) => {
    const history = { state: null, replaceState: vi.fn() } as unknown as History;
    const token = takePasswordResetTokenFromUrl({ href } as Location, history);
    const replaced = (history.replaceState as ReturnType<typeof vi.fn>).mock.calls[0]?.[2] as string | undefined;

    return { token, replaced };
};

describe('takePasswordResetTokenFromUrl', () => {
    beforeEach(clearPendingPasswordResetToken);

    it('takes ?reset_token= and removes it from the address', () => {
        const { token, replaced } = take(`https://hotel.example/?reset_token=${TOKEN}&room=5`);

        expect(token).toBe(TOKEN);
        expect(getPendingPasswordResetToken()).toBe(TOKEN);
        expect(replaced).toBe('https://hotel.example/?room=5');
    });

    it('takes ?token= on a /reset-password address, before it can be read as a login token', () => {
        const { token, replaced } = take(`https://hotel.example/client/reset-password?token=${TOKEN}`);

        expect(token).toBe(TOKEN);
        expect(replaced).toBe('https://hotel.example/client/');
    });

    it('leaves a login ?token= on any other address alone', () => {
        const { token, replaced } = take(`https://hotel.example/?token=${TOKEN}`);

        expect(token).toBeNull();
        expect(replaced).toBeUndefined();
        expect(getPendingPasswordResetToken()).toBeNull();
    });

    it('removes a malformed token from the address but does not keep it', () => {
        const { token, replaced } = take('https://hotel.example/?reset_token=%3Cscript%3E');

        expect(token).toBeNull();
        expect(replaced).toBe('https://hotel.example/');
        expect(getPendingPasswordResetToken()).toBeNull();
    });

    it('forgets the token once the reset is over', () => {
        take(`https://hotel.example/?reset_token=${TOKEN}`);
        clearPendingPasswordResetToken();

        expect(getPendingPasswordResetToken()).toBeNull();
    });
});
