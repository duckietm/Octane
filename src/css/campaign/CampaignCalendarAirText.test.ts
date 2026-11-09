import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/campaign/CampaignCalendarView.css'), 'utf8');
const rules = (selector: string) =>
    [...css.matchAll(new RegExp(`(?:^|[{},]|\\*/)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`, 'g'))].map((m) => m[1]).join('\n');

describe('campaign calendar text (AIR layout calendar: info_heading, info_body)', () => {
    it('uses the regular Ubuntu cut for the window', () => {
        expect(rules('.octane-campaign-calendar')).toContain('font-family: HabboAirUbuntu, UbuntuRegular, sans-serif');
        expect(rules('.octane-campaign-calendar :where(*):not(svg, svg *)')).toContain('font-family: HabboAirUbuntu, UbuntuRegular, sans-serif !important');
    });

    it('draws the heading as AIR info_heading: condensed, 20 px, 0x7ecaed', () => {
        const heading = rules('.octane-campaign-calendar .octane-campaign-calendar__heading');

        expect(heading).toContain('font-size: 20px');
        expect(heading).toContain('color: #7ecaed');
        expect(heading).toContain('font-family: Ubuntu, UbuntuCondensed, sans-serif !important');
    });

    it('draws the body as AIR info_body (u_regular 12, white) on the navy window', () => {
        const body = rules('.octane-campaign-calendar .octane-campaign-calendar__body');

        expect(body).toContain('font-size: 12px');
        expect(body).toContain('color: #ffffff');
        expect(rules('.octane-campaign-calendar .octane-card-content-shell')).toContain('background: #0e0f1f');
    });
});

describe('campaign calendar spinner (AIR layout calendar: btn_slot, btn_present, bitmap_lock, btn_back / btn_forward)', () => {
    it('draws each day as a 202x447 column on day_generic_bg with the present at (7, 115), 192x192', () => {
        expect(rules('.octane-calendar-day')).toMatch(/width: 202px;[\s\S]*height: 447px;[\s\S]*day_generic_bg\.png/);
        expect(rules('.octane-calendar-day .octane-calendar-day__present')).toMatch(/top: 115px;[\s\S]*left: 7px;[\s\S]*width: 192px;[\s\S]*height: 192px/);
    });

    it('switches the present from day_generic_button to day_generic_activated with the opened box', () => {
        expect(rules('.octane-calendar-day__bg')).toContain('day_generic_button.png');
        expect(rules('.octane-calendar-day__bg.is-opened')).toContain('day_generic_activated.png');
        expect(rules('.octane-calendar-day__opened')).toContain('opened.png');
        expect(rules('.octane-calendar-day__lock')).toMatch(/width: 47px;[\s\S]*height: 51px;[\s\S]*generic_lock\.png/);
    });

    it('puts the 33x34 arrows at y 325 and shades the days around the selected one with the window navy', () => {
        expect(rules('.octane-campaign-calendar .octane-campaign-calendar__arrow')).toMatch(/top: 325px;[\s\S]*width: 33px;[\s\S]*height: 34px/);
        expect(rules('.octane-campaign-calendar__arrow.is-back')).toContain('back.png');
        expect(rules('.octane-campaign-calendar__arrow.is-forward')).toContain('forward.png');
        expect(rules('.octane-campaign-calendar__shade.is-left')).toContain('rgb(15 16 32 / 0.6), rgb(15 16 32 / 0.2)');
        expect(rules('.octane-campaign-calendar__shade.is-right')).toContain('rgb(15 16 32 / 0.2), rgb(15 16 32 / 0.6)');
    });
});
