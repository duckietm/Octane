import { describe, expect, it } from 'vitest';
import { normalizeWiredStyle, resolveWiredStyle, WIRED_STYLE_OPTIONS, WIRED_STYLE_TOKENS, wiredStyleClassName, wiredStyleTitle, wiredStyleVariables } from './WiredStyle';

describe('wired window styles', () => {
    it('offers the official picker: illumina and volter, with "" as the default', () => {
        expect([...WIRED_STYLE_OPTIONS]).toEqual(['illumina', 'volter']);
        expect(normalizeWiredStyle('volter')).toBe('volter');
        expect(normalizeWiredStyle('illumina')).toBe('illumina');
        // Our old values and the styles the picker does not offer fall back to the default.
        expect(normalizeWiredStyle('default')).toBe('');
        expect(normalizeWiredStyle('volter_blue')).toBe('');
        expect(normalizeWiredStyle('ubuntu')).toBe('');
        expect(normalizeWiredStyle(undefined)).toBe('');
        expect(normalizeWiredStyle(3)).toBe('');
    });

    it('opens the default as illumina and forces the three proto furni into their own colours', () => {
        expect(resolveWiredStyle('', 'wf_act_toggle_state')).toBe('illumina');
        expect(resolveWiredStyle('volter', 'wf_act_toggle_state')).toBe('volter');
        expect(resolveWiredStyle('volter', 'wf_ltdproto_act_toggle_state')).toBe('volter_yellow');
        expect(resolveWiredStyle('illumina', 'wf_proto_trg_at_given_time')).toBe('volter_blue');
        expect(resolveWiredStyle('', 'wf_proto_cnd_trggrer_on_frn')).toBe('volter_green');
        expect(resolveWiredStyle('nope', null)).toBe('illumina');
    });

    it('keeps the AIR colours and widths', () => {
        expect(WIRED_STYLE_TOKENS.illumina).toMatchObject({ frameColor: '#e2e2e2', advancedBackgroundColor: '#cccccc', frameWidth: 240, isVolter: false });
        expect(WIRED_STYLE_TOKENS.volter).toMatchObject({ frameColor: '#3d3d3d', advancedBackgroundColor: '#303030', headerNameFontSize: 9, isVolter: true });
        expect(WIRED_STYLE_TOKENS.volter_blue).toMatchObject({ frameColor: '#7da9b5', backgroundColor: '#c7d0d4', frameWidth: 256, useInnerBorder: true });
        expect(WIRED_STYLE_TOKENS.volter_green).toMatchObject({ frameColor: '#78b090', backgroundColor: '#bfd6c9', advancedBackgroundColor: '#acc7b7' });
        expect(WIRED_STYLE_TOKENS.volter_yellow).toMatchObject({ frameColor: '#fac200', backgroundColor: '#faea7c', advancedBackgroundColor: '#f4d25f' });
    });

    it('names the classes and variables the stylesheet keys on', () => {
        expect(wiredStyleClassName('illumina')).toBe('octane-wired--style-illumina');
        expect(wiredStyleClassName('volter')).toBe('octane-wired--style-volter octane-wired--volter');
        expect(wiredStyleClassName('volter_blue')).toBe('octane-wired--style-volter_blue octane-wired--volter octane-wired--inner-border');
        expect(wiredStyleVariables('volter_green')).toMatchObject({ '--wired-frame': '#78b090', '--wired-background': '#bfd6c9', '--wired-header-name-size': '9px' });
    });

    it('shows a style name the way the official picker does', () => {
        expect(wiredStyleTitle('volter_blue')).toBe('Volter Blue');
        expect(wiredStyleTitle('illumina')).toBe('Illumina');
    });
});
