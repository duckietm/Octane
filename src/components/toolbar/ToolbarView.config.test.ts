import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseJsonDocument } from '../../json/JsonDocumentParser';

const root = process.cwd();

describe('Toolbar feature config', () => {
    it('keeps optional custom toolbar buttons behind global config flags', () => {
        // The examples are JSONC, read the way the client reads them.
        const example = (file: string) =>
            parseJsonDocument<Record<string, unknown>>(readFileSync(join(root, 'public/configuration/config.example', file), 'utf8'), 'jsonc');
        const config = { ...example('hotel.jsonc'), ...example('features.jsonc') };
        const source = readFileSync(join(root, 'src/components/toolbar/ToolbarView.tsx'), 'utf8');

        expect(config['buildersclub.enabled']).toBe(true);
        expect(config['toolbar.fortunewheel.enabled']).toBe(true);
        expect(source).toContain('isBuildersClubEnabled()');
        expect(source).toContain("GetConfigurationValue<boolean>('toolbar.fortunewheel.enabled', true)");
        expect((source.match(/buildersClubEnabled/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect(source.match(/fortuneWheelEnabled\s*&&/g)).toHaveLength(2);
        expect(source.match(/icon=\"buildersclub\"/g)).toHaveLength(2);
        expect(source.match(/icon=\"fortune-wheel\"/g)).toHaveLength(2);
        expect(source).not.toContain('rare-values/toggle');
    });

    it('does not mount the fortune wheel at all when toolbar.fortunewheel.enabled is false', () => {
        const mainView = readFileSync(join(root, 'src/components/MainView.tsx'), 'utf8');

        // Not only the button: without the view, no link or plugin can open the wheel either.
        // The view sits inside its error boundary, so the flag is asserted on its own.
        expect(mainView).toContain("{GetConfigurationValue<boolean>('toolbar.fortunewheel.enabled', true) && (");
        expect(mainView).toContain('<FortuneWheelView />');
    });
});
