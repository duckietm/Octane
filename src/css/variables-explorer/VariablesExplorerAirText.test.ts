import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const css = read('src/css/variables-explorer/VariablesExplorer.css');

describe('variables explorer text (AIR conventions)', () => {
    it('puts the window class on the connect, explorer and bulk delete cards', () => {
        for (const view of ['VariablesExplorerConnectView', 'VariablesExplorerMainView', 'VariablesExplorerBulkDeleteView']) {
            expect(read(`src/components/variables-explorer/${view}.tsx`)).toContain('octane-variables-explorer-window');
        }

        expect(read('src/components/variables-explorer/VariablesExplorerView.tsx')).toContain("import '../../css/variables-explorer/VariablesExplorer.css';");
    });

    it('is regular Ubuntu 12 px with grey buttons', () => {
        expect(css).toMatch(/\.octane-variables-explorer-window \.octane-card-content-shell :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu/);
        expect(css).toMatch(/\.habbo-btn-secondary \{[^}]*var\(--habbo-skin-shiny\) !important;[^}]*font-weight: 400 !important;/);
        expect(css).toMatch(/\.habbo-btn-primary \{[^}]*var\(--habbo-skin-shiny-thick\) !important;[^}]*color: #000 !important;/);
    });
});
