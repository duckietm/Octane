import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/achievements/AchievementsView.css'), 'utf8');

describe('achievements text (quest_main_window)', () => {
    it('is regular Ubuntu, never the condensed `Ubuntu` face', () => {
        expect(css).toMatch(/\.octane-achievements-air :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu, UbuntuRegular/);
        expect(css).not.toMatch(/HabboAirUbuntu, Ubuntu,/);
    });

    it('keeps the AIR sizes: 20 px category name, 13 px score in 0x444444, 12 px bold progress text', () => {
        expect(css).toMatch(/\.air-achievements-category-name \{[^}]*font-size: 20px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.air-achievements-score \{[^}]*color: #444444;[^}]*font-size: 13px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.air-achievement-progress__text \{[^}]*color: #ffffff;[^}]*font-size: 12px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.air-achievement-details-description \{[^}]*font-size: 12px;[^}]*font-weight: 400/);
    });
});
