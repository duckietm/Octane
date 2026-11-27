import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDistIndexHtml, DIST_VIEWPORT } from '../../scripts/dist-index-html.mjs';

describe('production index.html', () => {
    const html = buildDistIndexHtml({ contentSecurityPolicy: "script-src 'self'; object-src 'none'", buildVersion: 'abc' });

    it('links the web app manifest and the home screen icon with paths relative to the page', () => {
        expect(html).toContain('<link rel="manifest" href="site.webmanifest">');
        expect(html).toContain('<link rel="apple-touch-icon" href="apple-touch-icon.png">');
        expect(html).toContain('<meta name="mobile-web-app-capable" content="yes">');
    });

    it('uses the phone viewport of the dev page', () => {
        expect(DIST_VIEWPORT).toContain('viewport-fit=cover');
        expect(DIST_VIEWPORT).toContain('maximum-scale=1');
        expect(html).toContain(`<meta name="viewport" content="${DIST_VIEWPORT}">`);
        expect(readFileSync(join(process.cwd(), 'index.html'), 'utf8')).toContain(`<meta name="viewport" content="${DIST_VIEWPORT}" />`);
    });

    it('keeps the loader and the content security policy as before', () => {
        expect(html).toContain(`<meta http-equiv="Content-Security-Policy" content="script-src 'self'; object-src 'none'">`);
        expect(html).toContain('<script src="configuration/bootstrap.js?v=abc"></script>');
        expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('rel="manifest"'));
    });

    it('leaves the policy out when it is turned off', () => {
        expect(buildDistIndexHtml({ contentSecurityPolicy: '', buildVersion: '1' })).not.toContain('Content-Security-Policy');
    });
});
