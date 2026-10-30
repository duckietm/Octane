/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTurnstileScript, resetTurnstileScriptForTests, TURNSTILE_SCRIPT_URL } from './loadTurnstileScript';

const scriptTag = () => document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT_URL}"]`);

describe('loadTurnstileScript', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetTurnstileScriptForTests();
        document.head.innerHTML = '';
        delete window.turnstile;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not touch the page until something asks for it', () => {
        expect(scriptTag()).toBeNull();
    });

    it('resolves once Cloudflare has answered', async () => {
        const loading = loadTurnstileScript();

        const script = scriptTag();
        expect(script).not.toBeNull();

        window.turnstile = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };
        script.dispatchEvent(new Event('load'));

        await expect(loading).resolves.toBe(true);
    });

    it('gives up when the script is blocked instead of waiting forever', async () => {
        const loading = loadTurnstileScript(10000);

        vi.advanceTimersByTime(10000);

        await expect(loading).resolves.toBe(false);
    });

    it('reports a failed load', async () => {
        const loading = loadTurnstileScript();

        scriptTag().dispatchEvent(new Event('error'));

        await expect(loading).resolves.toBe(false);
    });

    it('fetches the script once however many widgets ask', async () => {
        const first = loadTurnstileScript();
        const second = loadTurnstileScript();

        expect(document.querySelectorAll(`script[src="${TURNSTILE_SCRIPT_URL}"]`)).toHaveLength(1);

        window.turnstile = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };
        scriptTag().dispatchEvent(new Event('load'));

        await expect(first).resolves.toBe(true);
        await expect(second).resolves.toBe(true);
    });

    it('answers at once when Turnstile is already there', async () => {
        window.turnstile = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };

        await expect(loadTurnstileScript()).resolves.toBe(true);
        expect(scriptTag()).toBeNull();
    });

    it('retries with a fresh script after a failed load', async () => {
        const first = loadTurnstileScript();
        const failed = scriptTag();
        failed.dispatchEvent(new Event('error'));
        await expect(first).resolves.toBe(false);
        expect(scriptTag()).toBeNull();

        const retry = loadTurnstileScript();
        const fresh = scriptTag();
        expect(fresh).not.toBe(failed);

        window.turnstile = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };
        fresh.dispatchEvent(new Event('load'));

        await expect(retry).resolves.toBe(true);
    });
});
