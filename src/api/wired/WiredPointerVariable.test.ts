import { describe, expect, it } from 'vitest';
import {
    isPointerAccessorCandidate,
    normalizePointerSourceType,
    POINTER_SOURCE_CONTEXT,
    POINTER_SOURCE_FURNI,
    POINTER_SOURCE_GLOBAL,
    POINTER_SOURCE_TYPES,
    POINTER_SOURCE_USER,
    readPointerEditor,
    writePointerEditor
} from './WiredPointerVariable';

describe('WiredPointerVariable', () =>
{
    it('offers AIR\'s four header source types, furni first and by default', () =>
    {
        expect([ ...POINTER_SOURCE_TYPES ]).toEqual([ 0, 1, -10, -20 ]);
        expect(normalizePointerSourceType(POINTER_SOURCE_CONTEXT)).toBe(-20);
        expect(normalizePointerSourceType(7)).toBe(POINTER_SOURCE_FURNI);
    });

    it('accepts as accessor only a context variable with a value that needs no running stack', () =>
    {
        expect(isPointerAccessorCandidate({ itemId: 5, hasValue: true })).toBe(true);
        expect(isPointerAccessorCandidate({ itemId: 5, hasValue: false })).toBe(false);
        expect(isPointerAccessorCandidate({ itemId: 5, hasValue: true, requiresExecutionContext: true })).toBe(false);
        expect(isPointerAccessorCandidate({ itemId: 5, hasValue: true, valueShape: 'array' })).toBe(false);
        expect(isPointerAccessorCandidate({ itemId: 5, hasValue: true, unavailable: true })).toBe(false);
        expect(isPointerAccessorCandidate({ itemId: -1, hasValue: true })).toBe(false);
    });

    it('reads and writes AIR\'s layout: ints [sourceType], the name, variable ids [accessor]', () =>
    {
        const state = readPointerEditor([ POINTER_SOURCE_GLOBAL ], 'ptr', [ '5' ]);

        expect(state).toEqual({ sourceType: POINTER_SOURCE_GLOBAL, name: 'ptr', accessorId: 5 });
        expect(writePointerEditor(state)).toEqual({ intParams: [ -10 ], stringParam: 'ptr', variableIds: [ '5' ] });
        expect(readPointerEditor([], '', [])).toEqual({ sourceType: POINTER_SOURCE_FURNI, name: '', accessorId: 0 });
        expect(readPointerEditor([ POINTER_SOURCE_USER ], 'x', [ 'custom:12' ]).accessorId).toBe(12);
        expect(writePointerEditor({ sourceType: 3, name: 'x', accessorId: 0 })).toEqual({ intParams: [ 0 ], stringParam: 'x', variableIds: [] });
    });
});
