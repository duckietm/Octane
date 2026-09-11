import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isAbsentRefFailure, resolveRenderer } from './resolve-renderer.mjs';

const baseInput = {
    eventName: 'pull_request',
    baseRef: 'Dev',
    refName: '384/merge',
    repositoryOwner: 'duckietm',
    upstreamRepository: 'duckietm/Octane-Renderer',
    headOwner: 'simoleo89',
    headRef: 'codex/global-classic-scrollbars',
    inputRepository: '',
    inputRef: '',
    variableRepository: '',
    variableRef: '',
};

const refLookup = (availableRefs) => async (repository, ref) => availableRefs.has(`${repository}@${ref}`);

describe('renderer resolution', () => {
    it('uses upstream Dev when a fork only has a stale generic Dev branch', async () => {
        const hasRef = refLookup(
            new Set(['simoleo89/Octane-Renderer@Dev', 'duckietm/Octane-Renderer@Dev'])
        );

        assert.deepEqual(await resolveRenderer(baseInput, hasRef), {
            repository: 'duckietm/Octane-Renderer',
            ref: 'Dev',
        });
    });

    it('uses the fork when it provides the exact companion branch', async () => {
        const hasRef = refLookup(
            new Set([
                'simoleo89/Octane-Renderer@codex/global-classic-scrollbars',
                'simoleo89/Octane-Renderer@Dev',
                'duckietm/Octane-Renderer@Dev',
            ])
        );

        assert.deepEqual(await resolveRenderer(baseInput, hasRef), {
            repository: 'simoleo89/Octane-Renderer',
            ref: 'codex/global-classic-scrollbars',
        });
    });

    it('preserves explicit workflow dispatch pairing', async () => {
        const hasRef = refLookup(new Set(['custom/renderer@release-candidate']));

        assert.deepEqual(
            await resolveRenderer(
                {
                    ...baseInput,
                    inputRepository: 'custom/renderer',
                    inputRef: 'release-candidate',
                },
                hasRef
            ),
            {
                repository: 'custom/renderer',
                ref: 'release-candidate',
            }
        );
    });
});

describe('remote ref lookup failures', () => {
    // Every case above injects a healthy lookup, which is exactly why a lookup that answered `false`
    // to everything went unnoticed: the resolver then silently paired every build with the fallback
    // branch instead of the companion one. These pin which failures are an answer and which are a
    // fault that has to surface.

    it('treats a non-zero git exit status as "the branch is not there"', () => {
        const missing = Object.assign(new Error('Command failed: git ls-remote'), { code: 2 });

        assert.equal(isAbsentRefFailure(missing), true);
    });

    it('refuses to read a missing git binary as an absent branch', () => {
        const noGit = Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' });

        assert.equal(isAbsentRefFailure(noGit), false);
    });

    it('refuses to read a programming error as an absent branch', () => {
        const bug = new ReferenceError("Cannot access 'execFileAsync' before initialization");

        assert.equal(isAbsentRefFailure(bug), false);
    });
});

describe('array companion branch resolution', () => {
    it('pairs a client suffix with its protocol branch in the PR owner repository', async () => {
        const hasRef = refLookup(new Set([
            'duckietm/Octane-Renderer@Dev',
            'duckietm/Octane-Renderer@feature/wired-arrays-protocol',
        ]));
        assert.deepEqual(await resolveRenderer({ ...baseInput, headOwner: 'duckietm', headRef: 'feature/wired-arrays-client' }, hasRef), {
            repository: 'duckietm/Octane-Renderer', ref: 'feature/wired-arrays-protocol',
        });
    });

    it('keeps a missing client companion on current upstream Dev', async () => {
        const hasRef = refLookup(new Set(['duckietm/Octane-Renderer@Dev']));
        assert.deepEqual(await resolveRenderer({ ...baseInput, headRef: 'feature/missing-client' }, hasRef), {
            repository: 'duckietm/Octane-Renderer', ref: 'Dev',
        });
    });
});
