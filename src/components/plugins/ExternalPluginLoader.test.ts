/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { appendPluginScript } from './ExternalPluginLoader';

describe('external plugin scripts', () => {
    afterEach(() => {
        document.head.querySelectorAll('script[data-octane-plugin]').forEach((element) => element.remove());
    });

    it('adds a real script element to the head, so the browser runs it', () => {
        const element = appendPluginScript({ src: 'https://hotel.test/client/plugins/rp.js' });

        expect(element).not.toBeNull();
        expect(element.parentNode).toBe(document.head);
        expect(element.src).toBe('https://hotel.test/client/plugins/rp.js');
        expect(element.async).toBe(true);
        expect(element.hasAttribute('integrity')).toBe(false);
    });

    it('adds a script only once per URL', () => {
        appendPluginScript({ src: 'https://hotel.test/client/plugins/rp.js' });

        expect(appendPluginScript({ src: 'https://hotel.test/client/plugins/rp.js' })).toBeNull();
        expect(document.head.querySelectorAll('script[data-octane-plugin]')).toHaveLength(1);
    });

    it('pins the content when the entry has an integrity hash', () => {
        const element = appendPluginScript({ src: 'https://cdn.test/rp.js', integrity: 'sha384-abc' });

        expect(element.getAttribute('integrity')).toBe('sha384-abc');
        expect(element.getAttribute('crossorigin')).toBe('anonymous');
    });

    it('says whether the script loaded', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        appendPluginScript({ src: 'https://hotel.test/a.js' }).dispatchEvent(new Event('load'));
        appendPluginScript({ src: 'https://hotel.test/b.js' }).dispatchEvent(new Event('error'));

        expect(log).toHaveBeenCalledWith('[OctanePlugins] Loaded: https://hotel.test/a.js');
        expect(warn).toHaveBeenCalledWith('[OctanePlugins] Failed to load: https://hotel.test/b.js');
        log.mockRestore();
        warn.mockRestore();
    });
});
