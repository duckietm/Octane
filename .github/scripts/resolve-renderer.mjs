import { execFile } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);

const companionRefsFor = (headRef) => {
    if (!headRef) return [];

    const refs = [];

    if (headRef.endsWith('-ui')) {
        const baseRef = headRef.slice(0, -3);
        refs.push(`${baseRef}-renderer`, baseRef);
    }

    if (headRef.endsWith('-client')) {
        const baseRef = headRef.slice(0, -7);
        refs.push(`${baseRef}-protocol`, `${baseRef}-renderer`, baseRef);
    }

    refs.push(headRef);

    return refs;
};

export const resolveRenderer = async (input, hasRef) => {
    const contextRef = input.eventName === 'pull_request' ? input.baseRef : input.refName;
    const automaticRef = contextRef === 'main' ? 'main' : 'Dev';
    const explicitRef = input.inputRef || input.variableRef;
    let ref = explicitRef || automaticRef;
    let repository = input.inputRepository || input.variableRepository;

    if (!repository && input.headOwner && input.headOwner !== input.repositoryOwner) {
        const headRepository = `${input.headOwner}/Octane-Renderer`;
        const forkRefs = explicitRef ? [explicitRef] : companionRefsFor(input.headRef);

        for (const companionRef of forkRefs) {
            if (await hasRef(headRepository, companionRef)) {
                repository = headRepository;
                ref = companionRef;
                break;
            }
        }
    }

    if (!repository) {
        const ownerRepository = `${input.repositoryOwner}/Octane-Renderer`;
        repository = (await hasRef(ownerRepository, ref)) ? ownerRepository : input.upstreamRepository;
    }

    if (!explicitRef && input.headRef) {
        const candidates = [...companionRefsFor(input.headRef), automaticRef, 'integration'];

        for (const candidate of candidates) {
            if (await hasRef(repository, candidate)) {
                ref = candidate;
                break;
            }
        }
    }

    if (!(await hasRef(repository, ref))) {
        repository = input.upstreamRepository;

        if (!(await hasRef(repository, ref))) ref = 'Dev';
    }

    return { repository, ref };
};

/**
 * `git ls-remote --exit-code` leaves the process with a non-zero status when the ref is absent, and
 * that status is an answer: the branch is not there. Anything else -- git missing from PATH, a
 * programming error inside this file -- is a fault, and swallowing it would answer "no such ref" to
 * every question and quietly pair every build with the fallback branch.
 */
export const isAbsentRefFailure = (error) => typeof error?.code === 'number';

const hasRemoteRef = async (repository, ref) => {
    try {
        await execFileAsync('git', [
            'ls-remote',
            '--exit-code',
            '--heads',
            `https://github.com/${repository}.git`,
            ref,
        ]);

        return true;
    } catch (error) {
        if (isAbsentRefFailure(error)) return false;

        throw error;
    }
};

const run = async () => {
    const result = await resolveRenderer(
        {
            eventName: process.env.GITHUB_EVENT_NAME ?? '',
            baseRef: process.env.GITHUB_BASE_REF ?? '',
            refName: process.env.GITHUB_REF_NAME ?? '',
            repositoryOwner: process.env.GITHUB_REPOSITORY_OWNER ?? '',
            upstreamRepository: process.env.UPSTREAM_RENDERER_REPO ?? 'duckietm/Octane-Renderer',
            headOwner: process.env.PR_HEAD_OWNER ?? '',
            headRef: process.env.PR_HEAD_REF ?? '',
            inputRepository: process.env.INPUT_RENDERER_REPO ?? '',
            inputRef: process.env.INPUT_RENDERER_REF ?? '',
            variableRepository: process.env.VARIABLE_RENDERER_REPO ?? '',
            variableRef: process.env.VARIABLE_RENDERER_REF ?? '',
        },
        hasRemoteRef
    );

    if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required');

    appendFileSync(process.env.GITHUB_OUTPUT, `repo=${result.repository}\nref=${result.ref}\n`);
    console.log(
        `Resolved renderer pairing: ${result.repository} @ ${result.ref} ` +
            `(client ctx: ${process.env.GITHUB_BASE_REF || process.env.GITHUB_REF_NAME}, ` +
            `event: ${process.env.GITHUB_EVENT_NAME})`
    );
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run();
