import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A state updater must be pure: React may run it twice (StrictMode in development) or later than the call. Packets
 * sent from inside one went out twice, and a value copied out of one could be stale. This scans the client for an
 * updater (`setX((prev) => { ... })`) whose body sends a packet.
 */
const SOURCE = join(process.cwd(), 'src');
const UPDATER = /\bset[A-Z]\w*\(\s*\(?\s*\w+\s*(?::[^)=]*)?\)?\s*=>\s*\{/g;
const SENDS = /SendMessageComposer\(|\.connection\.send\(|\bsendActiveBadges\(/;

const sourceFiles = (directory: string): string[] =>
    readdirSync(directory).flatMap((name) => {
        const path = join(directory, name);
        if (statSync(path).isDirectory()) return sourceFiles(path);
        return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });

const updaterBody = (source: string, start: number): string => {
    let depth = 1;
    let index = start;
    while (depth > 0 && index < source.length) {
        if (source[index] === '{') depth++;
        else if (source[index] === '}') depth--;
        index++;
    }
    return source.slice(start, index);
};

describe('state updaters', () => {
    it('never send a packet', () => {
        const offenders: string[] = [];

        for (const file of sourceFiles(SOURCE)) {
            const source = readFileSync(file, 'utf8');

            for (const match of source.matchAll(UPDATER)) {
                if (SENDS.test(updaterBody(source, match.index + match[0].length))) {
                    const line = source.slice(0, match.index).split('\n').length;
                    offenders.push(`${relative(process.cwd(), file).replace(/\\/g, '/')}:${line}`);
                }
            }
        }

        expect(offenders).toEqual([]);
    });
});
