import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/talent/TalentTrack.css'), 'utf8');

describe('talent windows text (talent_track, task_progress_dialog, level_up)', () => {
    it('is regular Ubuntu outside the shared card header, il_regular 11 by default', () => {
        expect(css).toMatch(/\.octane-talent-track :where\(\*\):not\(svg, svg \*, \.octane-card-header-shell, \.octane-card-header-shell \*\)/);
        expect(css).toMatch(/\.octane-talent-levelup \.octane-card-content-shell \{[^}]*font-size: 11px;/);
        expect(css).toMatch(/\.octane-talent-track \.octane-air-modal__subtitle \{[^}]*color: #cccccc;[^}]*font-size: 11px;/);
    });

    it('sizes the headings like the illumina text styles', () => {
        expect(css).toMatch(/\.octane-talent-level__title \{[^}]*font-size: 14px;/);
        expect(css).toMatch(/\.octane-talent-task__title \{[^}]*font-size: 10px;/);
        expect(css).toMatch(/\.octane-talent-task__description \{[^}]*font-size: 11px;/);
        expect(css).toMatch(/\.octane-talent-reward__perk-title \{[^}]*font-size: 10px;/);
        expect(css).toMatch(/\.octane-talent-levelup__rewards-title \{[^}]*font-size: 10px;/);
        expect(css).toMatch(/\.octane-talent-levelup__reward \{[^}]*color: #222222;[^}]*font-size: 12px;/);
    });
});
