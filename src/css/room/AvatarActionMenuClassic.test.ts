import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const roomWidgetsCss = readFileSync(resolve(process.cwd(), 'src/css/room/RoomWidgets.css'), 'utf8');
const avatarMenuCss = roomWidgetsCss.slice(roomWidgetsCss.indexOf('.octane-avatar-action-menu {'), roomWidgetsCss.indexOf('.octane-context-menu.name-only'));

afterEach(() => {
    document.body.replaceChildren();
    document.head.replaceChildren();
});

describe('AIR own_avatar_menu bubble', () => {
    it('matches the 115px shell, header, 26px rows, and 18px footer from the XML', () => {
        const stylesheet = document.createElement('style');
        const menu = document.createElement('div');
        const header = document.createElement('div');
        const buttons = document.createElement('div');
        const item = document.createElement('div');
        const footer = document.createElement('div');

        stylesheet.textContent = avatarMenuCss;
        menu.className = 'octane-context-menu octane-avatar-action-menu octane-avatar-action-menu--own';
        header.className = 'octane-context-menu-header';
        buttons.className = 'air-avatar-menu-buttons';
        item.className = 'octane-context-menu-item';
        footer.className = 'octane-context-menu-footer';
        buttons.append(item);
        menu.append(header, buttons, footer);
        document.head.append(stylesheet);
        document.body.append(menu);

        const menuStyle = getComputedStyle(menu);
        const headerStyle = getComputedStyle(header);
        const buttonsStyle = getComputedStyle(buttons);
        const itemStyle = getComputedStyle(item);
        const footerStyle = getComputedStyle(footer);

        expect(menuStyle.width).toBe('115px');
        expect(menuStyle.minWidth).toBe('115px');
        expect(menuStyle.maxWidth).toBe('115px');
        expect(menuStyle.padding).toBe('11px 0px 10px');
        expect(menuStyle.borderWidth).toBe('0px');
        expect(menuStyle.textShadow).toBe('rgba(0, 0, 0, 0)');
        expect(headerStyle.width).toBe('107px');
        expect(headerStyle.height).toBe('16px');
        expect(headerStyle.marginLeft).toBe('4px');
        expect(headerStyle.marginBottom).toBe('5px');
        expect(headerStyle.fontWeight).toBe('700');
        expect(buttonsStyle.width).toBe('105px');
        expect(buttonsStyle.marginLeft).toBe('5px');
        expect(buttonsStyle.gap).toBe('1px');
        expect(itemStyle.width).toBe('103px');
        expect(itemStyle.height).toBe('26px');
        expect(itemStyle.marginLeft).toBe('1px');
        expect(itemStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(itemStyle.borderWidth).toBe('0px');
        expect(footerStyle.width).toBe('100px');
        expect(footerStyle.height).toBe('18px');
        expect(footerStyle.marginLeft).toBe('8px');
    });

    it('matches the 45 by 35 minimized bubble and 38 by 30 expand region', () => {
        const stylesheet = document.createElement('style');
        const menu = document.createElement('div');
        const footer = document.createElement('div');

        stylesheet.textContent = avatarMenuCss;
        menu.className = 'octane-context-menu octane-avatar-action-menu octane-avatar-action-menu--own menu-hidden';
        footer.className = 'octane-context-menu-footer';
        menu.append(footer);
        document.head.append(stylesheet);
        document.body.append(menu);

        const menuStyle = getComputedStyle(menu);
        const footerStyle = getComputedStyle(footer);

        expect(menuStyle.width).toBe('45px');
        expect(menuStyle.minWidth).toBe('45px');
        expect(menuStyle.height).toBe('35px');
        expect(menuStyle.minHeight).toBe('35px');
        expect(menuStyle.padding).toBe('0px');
        expect(footerStyle.width).toBe('38px');
        expect(footerStyle.height).toBe('30px');
        expect(footerStyle.marginTop).toBe('4px');
        expect(footerStyle.marginLeft).toBe('4px');
    });

});
