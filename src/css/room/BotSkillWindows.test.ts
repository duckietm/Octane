/* @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const roomWidgetsCss = readFileSync(resolve(process.cwd(), 'src/css/room/RoomWidgets.css'), 'utf8');
const avatarMenuCss = roomWidgetsCss.slice(roomWidgetsCss.indexOf('.octane-avatar-action-menu {'), roomWidgetsCss.indexOf('.octane-context-menu.name-only'));
const botSkillWindowCss = roomWidgetsCss.slice(roomWidgetsCss.indexOf('/* chatter_configuration_xml'));

const mount = (html: string) => {
    const stylesheet = document.createElement('style');

    stylesheet.textContent = avatarMenuCss + botSkillWindowCss;
    document.head.append(stylesheet);
    document.body.innerHTML = html;
};

afterEach(() => {
    document.body.replaceChildren();
    document.head.replaceChildren();
});

describe('AIR avatar_menu_widget bot menu', () => {
    it('is 151px wide with 137px button rows', () => {
        mount(`
            <div class="octane-context-menu octane-avatar-action-menu octane-avatar-action-menu--own octane-avatar-action-menu--widget">
                <div class="octane-context-menu-header"></div>
                <div class="air-avatar-menu-buttons"><div class="octane-context-menu-item"></div></div>
                <div class="octane-context-menu-footer"></div>
            </div>`);

        expect(getComputedStyle(document.querySelector('.octane-avatar-action-menu')).width).toBe('151px');
        expect(getComputedStyle(document.querySelector('.octane-context-menu-header')).width).toBe('143px');
        expect(getComputedStyle(document.querySelector('.air-avatar-menu-buttons')).width).toBe('139px');
        expect(getComputedStyle(document.querySelector('.octane-context-menu-item')).width).toBe('137px');
        expect(getComputedStyle(document.querySelector('.octane-context-menu-footer')).width).toBe('136px');
    });

    it('keeps the 45px minimized bubble', () => {
        mount(`
            <div class="octane-context-menu octane-avatar-action-menu octane-avatar-action-menu--own octane-avatar-action-menu--widget menu-hidden">
                <div class="octane-context-menu-footer"></div>
            </div>`);

        expect(getComputedStyle(document.querySelector('.octane-avatar-action-menu')).width).toBe('45px');
        expect(getComputedStyle(document.querySelector('.octane-context-menu-footer')).width).toBe('38px');
    });
});

describe('AIR bot skill configuration windows', () => {
    it('match the chatter_configuration and name_configuration layout sizes', () => {
        mount(`
            <div class="air-bot-skill-window air-bot-skill-window--chatter" id="chatter"><div class="air-bot-skill-window-items"></div></div>
            <div class="air-bot-skill-window air-bot-skill-window--name" id="name"><div class="air-bot-skill-window-items"></div></div>`);

        const chatter = getComputedStyle(document.getElementById('chatter'));
        const name = getComputedStyle(document.getElementById('name'));

        expect(chatter.width).toBe('278px');
        expect(chatter.minHeight).toBe('369px');
        expect(name.width).toBe('209px');
        expect(name.minHeight).toBe('119px');
        expect(getComputedStyle(document.querySelector('#chatter .air-bot-skill-window-items')).width).toBe('247px');
        expect(getComputedStyle(document.querySelector('#name .air-bot-skill-window-items')).width).toBe('183px');
    });

    it('lets the 60-120px button pair shrink inside the window instead of overflowing', () => {
        mount(`
            <div class="air-bot-skill-buttons">
                <button class="air-bot-skill-button"><span>Annuleren</span></button>
                <button class="air-bot-skill-button air-bot-skill-button--save"><span>Opslaan</span></button>
            </div>`);

        const row = getComputedStyle(document.querySelector('.air-bot-skill-buttons'));
        const button = getComputedStyle(document.querySelector('.air-bot-skill-button'));
        const label = getComputedStyle(document.querySelector('.air-bot-skill-button > span'));

        expect(row.maxWidth).toBe('100%');
        expect(row.justifyContent).toBe('flex-end');
        expect(row.gap).toBe('4px');
        expect(button.minWidth).toBe('60px');
        expect(button.maxWidth).toBe('120px');
        expect(button.height).toBe('28px');
        expect(button.flexShrink).toBe('1');
        expect(label.textOverflow).toBe('ellipsis');
        expect(label.whiteSpace).toBe('nowrap');
    });
});
