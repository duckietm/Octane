/* @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { LOCK_KEY, readLock } from './lockState';

afterEach(() => sessionStorage.clear());

describe('readLock', () => {
    it('reads a stored lock', () => {
        sessionStorage.setItem(LOCK_KEY, JSON.stringify({ attempts: 2, firstAt: 10, lockedUntil: 20 }));

        expect(readLock()).toEqual({ attempts: 2, firstAt: 10, lockedUntil: 20 });
    });

    it.each(['null', '"locked"', '7', '{"attempts":"2"}'])('treats %s as no lock instead of breaking the login screen', (stored) => {
        sessionStorage.setItem(LOCK_KEY, stored);

        expect(readLock()).toEqual({ attempts: 0, firstAt: 0, lockedUntil: 0 });
    });
});
