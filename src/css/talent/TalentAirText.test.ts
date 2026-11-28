import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/talent/TalentTrack.css'), 'utf8');

describe('talent windows text (talent_track, task_progress_dialog, level_up)', () => {
    it('is regular Ubuntu outside the shared card header, il_regular 11 by default', () => {
        expect(css).toMatch(/\.octane-talent-track :where\(\*\):not\(svg, svg \*, \.octane-card-header-shell, \.octane-card-header-shell \*\)/);
        expect(css).toMatch(/\.octane-talent-levelup \.octane-card-content-shell \{[^}]*font-size: 11px;/);
    });

    it('uses the reward track text sizes: titles 17/18 bold, rows 12 bold over 11, headings 13 bold blue', () => {
        expect(css).toMatch(/\.octane-talent-profile__title \{[^}]*font-size: 18px;[^}]*font-weight: bold;[^}]*line-height: 20px;/);
        expect(css).toMatch(/\.octane-talent-detail__title \{[^}]*font-size: 17px;[^}]*font-weight: bold;[^}]*line-height: 22px;/);
        expect(css).toMatch(/\.octane-talent-detail__description \{[^}]*font-size: 13px;[^}]*line-height: 14\.5px;/);
        expect(css).toMatch(/\.octane-talent-level__name \{[^}]*font-size: 12px;[^}]*font-weight: bold;[^}]*line-height: 17px;/);
        expect(css).toMatch(/\.octane-talent-task__title \{[^}]*font-size: 12px;[^}]*font-weight: bold;[^}]*line-height: 17px;/);
        expect(css).toMatch(/\.octane-talent-task__description \{[^}]*font-size: 11px;[^}]*line-height: 16px;/);
        expect(css).toMatch(/\.octane-talent-detail__heading \{[^}]*color: #124b8b;[^}]*font-size: 13px;[^}]*font-weight: bold;/);
        expect(css).toMatch(/\.octane-talent-levelup__reward \{[^}]*color: #222222;[^}]*font-size: 12px;/);
    });

    it('cuts the one-line row texts with an ellipsis', () => {
        expect(css).toMatch(/\.octane-talent-task__title,\s*\.octane-talent-task__description \{[^}]*overflow: hidden;[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/);
        expect(css).toMatch(/\.octane-talent-level__name \{[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/);
    });
});
