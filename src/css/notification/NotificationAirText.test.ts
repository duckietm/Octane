import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), 'src/css/notification', file), 'utf8');

const centerCss = read('NotificationCenterView.css');
const captionCss = read('CaptionNotification.css');
const alertCss = read('AlertActions.css');

describe('notification and alert text (habbo-notifications, habbo_window_alert / confirm)', () => {
    it('draws the Ubuntu bubbles in regular Ubuntu, not the condensed `Ubuntu` face', () => {
        expect(centerCss).toMatch(/\.octane-swf-notification-bubble\.octane-club-gift-notification \{[^}]*font-family: HabboAirUbuntu, UbuntuRegular, sans-serif/);
        expect(centerCss).toMatch(/\.octane-new-feature-notification \{[^}]*font-family: HabboAirUbuntu, UbuntuRegular, sans-serif/);
        expect(centerCss).toMatch(/\.octane-friendonline-notification__message \{[^}]*HabboAirUbuntu[^}]*font-size: 12px/);
        expect(captionCss).toMatch(/\.octane-caption-notification \{[^}]*font-family: HabboAirUbuntu, UbuntuRegular, sans-serif/);
        // layout_notification stays Volter Bold 9 px.
        expect(centerCss).toMatch(/\.octane-notification-item \{[^}]*font-family: Volter[^}]*font-size: 9px !important;[^}]*font-weight: 700/);
    });

    it('draws the alert and confirm windows as AIR: u_regular 12 px black, a grey button_thick, no rule', () => {
        expect(alertCss).toMatch(/\.octane-motd-alert\) \.octane-card-content-shell \{[^}]*HabboAirUbuntu[^}]*color: #000000;[^}]*font-size: 12px/);
        expect(alertCss).toMatch(/:where\(\*\):not\(svg, svg \*, \.notification-command-name, \.notification-command-args\) \{[^}]*HabboAirUbuntu, UbuntuRegular, sans-serif !important/);
        expect(alertCss).toMatch(/:where\(\.habbo-btn-primary, \.habbo-btn-secondary, \.habbo-btn-danger\) \{[^}]*font-size: 12px !important;[^}]*font-weight: 400 !important/);
        expect(alertCss).toMatch(/\.octane-card-content-shell hr \{[^}]*visibility: hidden/);
        expect(alertCss).toMatch(/\.habbo-btn-primary \{[^}]*min-height: 30px !important;[^}]*--habbo-skin-shiny-thick\) !important;[^}]*color: #000000 !important/);
    });

    it('draws the confirm as habbo_window_confirm: 300 px, text top left 253 px wide, a 28 px OK', () => {
        expect(alertCss).toMatch(/\.octane-alert\.octane-alert-alert\.octane-confirm-window \{[^}]*width: 300px/);
        expect(alertCss).toMatch(/\.octane-confirm-window \.octane-confirm-window__text \{[^}]*max-width: 253px;[^}]*text-align: left/);
        expect(alertCss).toMatch(/\.octane-confirm-window \.octane-card-content-shell \.habbo-btn-primary \{[^}]*min-height: 28px !important/);
        expect(alertCss).toMatch(/\.octane-confirm-window\[style\*="--octane-confirm-title-bar"\] > \.octane-card-header-shell \{[^}]*background: var\(--octane-confirm-title-bar\)/);
    });

    it('draws the link alert as habbo_window_alert_link: "ok" link left, a 24 px link button right', () => {
        expect(alertCss).toMatch(/\.octane-card-content-shell \.octane-alert-link-actions \.habbo-btn-primary \{[^}]*min-height: 24px !important/);
    });

    it('draws the MOTD in Volter 9 px like the style 0 motd_notification', () => {
        expect(alertCss).toMatch(/\.octane-alert\.octane-motd-alert \.octane-card-content-shell \{[^}]*font-family: Volter[^}]*font-size: 9px/);
        expect(alertCss).toMatch(/\.octane-motd-item \{[^}]*font-size: 9px/);
    });
});
