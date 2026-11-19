import { describe, expect, it } from 'vitest';
import { resolvePluginScripts, serverPluginEntries } from './resolvePluginScripts';

const CLIENT = 'https://hotel.example';
const HASH = 'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC';

describe('resolvePluginScripts', () => {
    it('loads plugins from this origin or over https, never from another scheme', () => {
        const scripts = resolvePluginScripts(
            ['/plugins/radio.js', 'https://cdn.example/chat.js', 'http://cdn.example/old.js', 'javascript:alert(1)', 'data:text/javascript,1'],
            [],
            CLIENT
        );

        expect(scripts.map((script) => script.src)).toEqual(['https://hotel.example/plugins/radio.js', 'https://cdn.example/chat.js']);
    });

    it('keeps to the hosts the hotel lists, when it lists any; its own origin is always allowed', () => {
        const scripts = resolvePluginScripts(['https://cdn.example/chat.js', 'https://elsewhere.example/x.js', '/plugins/radio.js'], ['CDN.example'], CLIENT);

        expect(scripts.map((script) => script.src)).toEqual(['https://cdn.example/chat.js', 'https://hotel.example/plugins/radio.js']);
    });

    it('carries the integrity hash of an entry that gives one, and refuses a malformed one', () => {
        const warnings: string[] = [];
        const scripts = resolvePluginScripts(
            [
                { url: 'https://cdn.example/chat.js', integrity: HASH },
                { url: 'https://cdn.example/bad.js', integrity: 'md5-abc' },
                'https://cdn.example/plain.js'
            ],
            [],
            CLIENT,
            (message) => warnings.push(message)
        );

        expect(scripts).toEqual([{ src: 'https://cdn.example/chat.js', integrity: HASH }, { src: 'https://cdn.example/plain.js' }]);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('bad.js');
    });

    it('loads a plugin listed twice once', () => {
        expect(resolvePluginScripts(['https://cdn.example/a.js', 'https://cdn.example/a.js'], [], CLIENT)).toHaveLength(1);
    });

    it('trusts an origin it is given like its own, so the emulator may serve its plugins over http in development', () => {
        const scripts = resolvePluginScripts(
            [{ url: 'http://localhost:2096/api/client-plugins/rp.js', integrity: HASH }, 'http://elsewhere.example/x.js'],
            ['cdn.example'],
            CLIENT,
            () => {},
            ['http://localhost:2096']
        );

        expect(scripts).toEqual([{ src: 'http://localhost:2096/api/client-plugins/rp.js', integrity: HASH }]);
    });
});

describe('serverPluginEntries', () => {
    const ENDPOINT = 'http://localhost:2096/api/client-plugins';

    it('resolves each listed URL against the endpoint and keeps its integrity', () => {
        expect(serverPluginEntries({ plugins: [{ name: 'RP', url: '/api/client-plugins/rp.js', integrity: HASH }] }, ENDPOINT)).toEqual([
            { url: 'http://localhost:2096/api/client-plugins/rp.js', integrity: HASH }
        ]);
    });

    it('skips an entry without a URL or a well-formed integrity, and an answer that is not a list', () => {
        const warnings: string[] = [];
        const entries = serverPluginEntries(
            { plugins: [{ url: '/a.js' }, { url: '/b.js', integrity: 'md5-x' }, { integrity: HASH }, null] },
            ENDPOINT,
            (message) => warnings.push(message)
        );

        expect(entries).toEqual([]);
        expect(warnings).toHaveLength(4);
        expect(serverPluginEntries('<html>', ENDPOINT)).toEqual([]);
        expect(serverPluginEntries(null, ENDPOINT)).toEqual([]);
    });
});
