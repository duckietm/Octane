import { describe, expect, it, vi } from 'vitest';
import { createBootSteps } from './createBootSteps';

describe('createBootSteps', () => {
    it('runs a step once and shares it', async () => {
        const run = createBootSteps();
        const task = vi.fn(async () => 1);

        await expect(Promise.all([run('a', task), run('a', task)])).resolves.toEqual([1, 1]);
        await run('a', task);

        expect(task).toHaveBeenCalledOnce();
    });

    it('retries a step that failed, and keeps the ones that finished', async () => {
        const run = createBootSteps();
        const done = vi.fn(async () => 'ok');
        const flaky = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('back');

        await run('done', done);
        await expect(run('flaky', flaky)).rejects.toThrow('offline');

        await expect(run('flaky', flaky)).resolves.toBe('back');
        await run('done', done);

        expect(flaky).toHaveBeenCalledTimes(2);
        expect(done).toHaveBeenCalledOnce();
    });
});
