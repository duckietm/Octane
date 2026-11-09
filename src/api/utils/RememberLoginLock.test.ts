/* @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClearRememberLoginIfStill, GetRememberLogin, SetRememberLogin, withRememberLock } from './RememberLogin';

/** A one-name Web Locks stand-in: requests run one after the other, as the browser does across tabs. */
const installLocks = () => {
    let tail: Promise<unknown> = Promise.resolve();
    const request = vi.fn((_name: string, task: () => Promise<unknown>) => {
        const run = tail.then(task);
        tail = run.catch(() => undefined);
        return run;
    });
    vi.stubGlobal('navigator', { ...navigator, locks: { request } });
    return request;
};

describe('remember token rotation across tabs', () => {
    beforeEach(() => window.localStorage.clear());
    afterEach(() => vi.unstubAllGlobals());

    it('lets the second tab rotate the token the first one stored, not the one both started with', async () => {
        installLocks();
        SetRememberLogin({ token: 'v1', expiresAt: 4102444800 });
        const sent: string[] = [];
        const rotate = () =>
            withRememberLock(async () => {
                const token = GetRememberLogin()?.token ?? '';
                sent.push(token);
                await Promise.resolve();
                SetRememberLogin({ token: `v${Number(token.slice(1)) + 1}`, expiresAt: 4102444800 });
            });

        await Promise.all([rotate(), rotate()]);

        expect(sent).toEqual(['v1', 'v2']);
        expect(GetRememberLogin()?.token).toBe('v3');
    });

    it('runs the task directly where the browser has no Web Locks', async () => {
        vi.stubGlobal('navigator', { ...navigator, locks: undefined });

        await expect(withRememberLock(async () => 'done')).resolves.toBe('done');
    });

    it('keeps a token another tab rotated in when an older one is refused', () => {
        SetRememberLogin({ token: 'v2', expiresAt: 4102444800 });

        ClearRememberLoginIfStill('v1');
        expect(GetRememberLogin()?.token).toBe('v2');

        ClearRememberLoginIfStill('v2');
        expect(GetRememberLogin()).toBeNull();
    });

    it('takes the lock for remember and refresh in the client', () => {
        const source = readFileSync('src/App.tsx', 'utf8');

        expect(source).toContain('withRememberLock(tryRememberLoginUnlocked)');
        expect(source).toContain('withRememberLock(rotateRememberLoginUnlocked)');
        expect(source).not.toMatch(/\) ClearRememberLogin\(\);\n\s+\} catch \(error\) \{\n\s+OctaneLogger.error\('\[LoginScreen\] Remember rotation failed'/);
    });
});
