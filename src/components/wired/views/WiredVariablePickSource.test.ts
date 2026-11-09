import { describe, expect, it } from 'vitest';
import { toEditorPickSource, toWirePickSource } from './WiredVariablePickSource';

const withConf = (furniAllowed: number[][]) => ({ inputSourcesConf: { furniAllowed, userAllowed: [], furniDefaults: [], userDefaults: [] } }) as never;

describe('variable reference pick source', () => {
    it('reads a stored 101 as the picks', () => {
        expect(toEditorPickSource(101)).toBe(100);
        expect(toEditorPickSource(100)).toBe(100);
        expect(toEditorPickSource(200)).toBe(200);
    });

    it('sends the picks as 100 once the server lists it', () => {
        expect(toWirePickSource(withConf([[0, 100, 101, 200, 201]]), 100)).toBe(100);
    });

    it('keeps 101 for a server without the row', () => {
        expect(toWirePickSource(withConf([]), 100)).toBe(101);
        expect(toWirePickSource(null, 100)).toBe(101);
    });

    it('leaves other sources alone', () => {
        expect(toWirePickSource(null, 0)).toBe(0);
        expect(toWirePickSource(null, 201)).toBe(201);
    });
});
