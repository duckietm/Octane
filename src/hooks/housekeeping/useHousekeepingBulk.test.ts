/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

/**
 * Pure aggregation logic of the bulk path — modelled after the
 * `runBulk` reducer inside `useHousekeepingActions.ts`. The hook
 * itself is hard to drive cleanly in jsdom because it pulls
 * the shared state bridge, `useNotification`, and the renderer-SDK mock through
 * a long transitive import chain. The actual aggregation is the
 * interesting bit and isolating it keeps the test fast + readable.
 *
 * Mirror of the production logic — if the hook's reducer changes,
 * this test should change with it.
 */

type Outcome = PromiseSettledResult<{ ok: boolean } | null>;

const aggregate = (settled: Outcome[]): { ok: number; failed: number } => {
    let ok = 0;
    let failed = 0;

    for (const outcome of settled) {
        if (outcome.status === 'fulfilled' && outcome.value && outcome.value.ok !== false) ok++;
        else failed++;
    }

    return { ok, failed };
};

const ok = (): Outcome => ({ status: 'fulfilled', value: { ok: true } });
const fail = (): Outcome => ({ status: 'fulfilled', value: { ok: false } });
const rejected = (): Outcome => ({ status: 'rejected', reason: new Error('net') });
const nullValue = (): Outcome => ({ status: 'fulfilled', value: null });

describe('bulk aggregation (mirrors useHousekeepingActions.runBulk)', () => {
    it('counts only `ok: true` results as success', () => {
        expect(aggregate([ok(), ok(), ok()])).toEqual({ ok: 3, failed: 0 });
    });

    it('counts `ok: false` results as failures', () => {
        expect(aggregate([ok(), fail(), ok()])).toEqual({ ok: 2, failed: 1 });
    });

    it('counts rejected promises as failures (not crashes)', () => {
        expect(aggregate([ok(), rejected(), ok()])).toEqual({ ok: 2, failed: 1 });
    });

    it('counts null-result responses as failures (server returned nothing meaningful)', () => {
        expect(aggregate([ok(), nullValue(), ok()])).toEqual({ ok: 2, failed: 1 });
    });

    it('returns 0/0 for an empty input — no division-by-zero', () => {
        expect(aggregate([])).toEqual({ ok: 0, failed: 0 });
    });
});
