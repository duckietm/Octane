import { describe, expect, it } from 'vitest';
import { translateWiredMenuLink, wiredMenuTabKey } from './WiredMenuLinks';

describe('WiredMenuLinks', () => {
    it('opens the tools and their tabs', () => {
        expect(translateWiredMenuLink('wiredmenu/open')).toBe('wired-tools/open');
        expect(translateWiredMenuLink('wiredmenu/open/settings')).toBe('wired-tools/tab/settings');
        expect(translateWiredMenuLink('wiredmenu/open/variable_overview')).toBe('wired-tools/tab/variables');
        expect(translateWiredMenuLink('wiredmenu/open/variable_overview/@score')).toBe('wired-tools/tab/variables/@score');
        expect(translateWiredMenuLink('wiredmenu/open/variable_overview/@event.transaction_failed.reason')).toBe(
            'wired-tools/tab/variables/@event.transaction_failed.reason'
        );
    });

    it('inspects furni and users and opens the logs', () => {
        expect(translateWiredMenuLink('wiredmenu/open/inspection/0/55')).toBe('wired-tools/inspection/furni/55/10');
        expect(translateWiredMenuLink('wiredmenu/open/inspection/1/3')).toBe('wired-tools/inspection/user/3');
        expect(translateWiredMenuLink('wiredmenu/logs')).toBe('wired-tools/logs');
    });

    it('ignores what is not a wired menu link', () => {
        expect(translateWiredMenuLink('navigator/goto/1')).toBeNull();
        expect(translateWiredMenuLink('wiredmenu/unknown')).toBeNull();
    });

    it('names the official tab keys', () => {
        expect(wiredMenuTabKey('variables')).toBe('wiredmenu.variable_overview.tab');
        expect(wiredMenuTabKey('monitor')).toBe('wiredmenu.monitor.tab');
    });
});
