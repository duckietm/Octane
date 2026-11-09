import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const guideCss = readFileSync(join(process.cwd(), 'src/css/guide-tool/GuideTool.css'), 'utf8');
const reviewCss = readFileSync(join(process.cwd(), 'src/css/guide-tool/GuardianChatReview.css'), 'utf8');
const rule = (css: string, selector: string) =>
    css.match(new RegExp(`(?:^|\\}|\\*/)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

describe('guide tool text (guide_tool_threeway, guide_*, user_*, request_report_user)', () => {
    it('is regular Ubuntu at il_regular 11 px with il_button 10 px buttons', () => {
        expect(rule(guideCss, '.octane-guide-tool .octane-card-content-shell')).toContain('font-size: 11px');
        expect(guideCss).toMatch(/@layer base \{[\s\S]*\.octane-guide-tool \.octane-card-content-shell :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu, UbuntuRegular/);
        expect(guideCss).toMatch(/button\.font-bold \* \{[^}]*font-size: 10px !important/);
    });

    it('uses the AIR heading styles and colours', () => {
        expect(rule(guideCss, '.octane-guide-tool__status-caption')).toContain('color: #666666');
        expect(rule(guideCss, '.octane-guide-tool__status-caption')).toContain('font-size: 10px');
        expect(rule(guideCss, '.octane-guide-tool__heading-1')).toContain('font-size: 14px');
        expect(rule(guideCss, '.octane-guide-tool__heading-2')).toContain('font-size: 12px');
        expect(rule(guideCss, '.octane-guide-tool__heading-3')).toContain('font-size: 10px');
        expect(rule(guideCss, '.octane-guide-tool__typing')).toContain('color: #555555');
        expect(rule(guideCss, '.octane-guide-tool__error')).toContain('color: #ff0000');
    });
});

describe('guardian chat review text (guardian_chat_review_*, chat_review_reporter_feedback, pending_bully_request)', () => {
    it('uses the AIR text styles', () => {
        expect(rule(reviewCss, '.octane-guardian-accept__title')).toContain('font-size: 12px');
        expect(rule(reviewCss, '.octane-guardian-vote__subtitle')).toContain('font-size: 10px');
        expect(rule(reviewCss, '.octane-guardian-vote__time')).toContain('font-size: 9px');
        expect(rule(reviewCss, '.octane-guardian-vote__question')).toContain('font-size: 10px');
        expect(rule(reviewCss, '.octane-guardian-vote__label')).toContain('font-weight: 400');
        expect(rule(reviewCss, '.octane-guardian-results__waiting-title')).toContain('font-size: 14px');
        expect(rule(reviewCss, '.octane-guardian-results__row')).toContain('font-size: 10px');
        expect(rule(reviewCss, '.octane-guardian-feedback__caption')).toContain('font-size: 18px');
        expect(rule(reviewCss, '.octane-guardian-pending .octane-guardian-feedback__caption')).toContain('color: #c30000');
        expect(rule(reviewCss, '.octane-guardian-countdown')).not.toContain('monospace');
    });

    it('gives the reporter windows the regular Ubuntu', () => {
        expect(reviewCss).toMatch(/@layer base \{[\s\S]*\.octane-guardian-pending \.octane-card-content-shell :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu, UbuntuRegular/);
    });
});
