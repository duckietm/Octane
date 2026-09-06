import { describe, expect, it } from 'vitest';
import { normalizeWiredStyle, WIRED_STYLE_OPTIONS, wiredStyleClassName, wiredStyleTitle } from './WiredStyle';

describe('wired window styles', () => {
    it('knows the three official layouts we have plus the client default', () => {
        expect([...WIRED_STYLE_OPTIONS]).toEqual(['default', 'volter', 'ubuntu', 'volter_blue']);
    });

    it('falls back to the default for anything it does not know', () => {
        expect(normalizeWiredStyle('volter')).toBe('volter');
        expect(normalizeWiredStyle('illumina')).toBe('default');
        expect(normalizeWiredStyle(undefined)).toBe('default');
        expect(normalizeWiredStyle(3)).toBe('default');
    });

    it('names the class the stylesheet keys on', () => {
        expect(wiredStyleClassName('volter_blue')).toBe('octane-wired--style-volter_blue');
        expect(wiredStyleClassName('nope')).toBe('octane-wired--style-default');
    });

    it('shows a style name the way the official picker does', () => {
        expect(wiredStyleTitle('volter_blue')).toBe('Volter Blue');
        expect(wiredStyleTitle('ubuntu')).toBe('Ubuntu');
    });
});
