import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('Toolbar feature config', () => {
    it('keeps optional custom toolbar buttons behind global config flags', () => {
        const config = JSON.parse(readFileSync(join(root, 'public/configuration/ui-config.example'), 'utf8'));
        const source = readFileSync(join(root, 'src/components/toolbar/ToolbarView.tsx'), 'utf8');

        expect(config['buildersclub.enabled']).toBe(true);
        expect(config['toolbar.buildersclub.enabled']).toBe(true);
        expect(source).toContain(
            "GetConfigurationValue<boolean>('buildersclub.enabled', GetConfigurationValue<boolean>('toolbar.buildersclub.enabled', true))"
        );
        expect((source.match(/buildersClubEnabled/g) ?? []).length).toBeGreaterThanOrEqual(2);
        expect(source.match(/icon=\"buildersclub\"/g)).toHaveLength(2);
        expect(source).not.toContain('rare-values/toggle');
    });
});
