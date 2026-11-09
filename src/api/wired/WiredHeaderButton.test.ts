import { describe, expect, it } from 'vitest';
import { resolveWiredHeaderButton, splitWiredName } from './WiredHeaderButton';

describe('WiredHeaderButton', () => {
    it('gives the snapshot boxes the apply-snapshot button', () => {
        expect(resolveWiredHeaderButton('condition', 0)).toBe('apply_snapshot');
        expect(resolveWiredHeaderButton('condition', 13)).toBe('apply_snapshot');
        expect(resolveWiredHeaderButton('action', 3)).toBe('apply_snapshot');
        expect(resolveWiredHeaderButton('trigger', 20)).toBe('apply_snapshot');
        expect(resolveWiredHeaderButton('action', 55)).toBe('apply_snapshot');
    });

    it('links the log action, the web API add-on and variables', () => {
        expect(resolveWiredHeaderButton('action', 49)).toBe('view_logs');
        expect(resolveWiredHeaderButton('addon', 2002)).toBe('web_api_docs');
        expect(resolveWiredHeaderButton('variable', 3)).toBe('view_in_menu');
    });

    it('leaves the rest without a button', () => {
        expect(resolveWiredHeaderButton('action', 7)).toBeNull();
        expect(resolveWiredHeaderButton('selector', 0)).toBeNull();
        expect(resolveWiredHeaderButton('trigger', 4)).toBeNull();
    });

    it('splits the title at the first colon and upper-cases the kind', () => {
        expect(splitWiredName('Effect: Toggle furni: state')).toEqual({ kind: 'EFFECT', title: 'Toggle furni: state' });
        expect(splitWiredName('Plain name')).toEqual({ kind: '', title: 'Plain name' });
    });
});
