/* @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';
import postcssNested from 'postcss-nested';
import { beforeAll, describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/css/friends/FriendsView.css'), 'utf8');

beforeAll(async () => {
    const result = await postcss([postcssNested]).process(source, { from: undefined });
    const relevantRules: string[] = [];

    result.root.walkRules((rule) => {
        if (rule.selector.includes('.swf-messenger-window')) relevantRules.push(rule.toString());
    });

    const style = document.createElement('style');

    style.textContent = relevantRules.join('\n');
    document.head.appendChild(style);
});

const computedAvatarStyle = (containerClass: string, size: number) => {
    const messenger = document.createElement('div');
    const container = document.createElement('div');
    const avatar = document.createElement('div');

    messenger.className = 'swf-messenger-window';
    container.className = containerClass;
    avatar.className = 'avatar-image compact-head';
    avatar.style.backgroundSize = `${size}px ${size}px`;
    avatar.style.backgroundPosition = 'center';
    container.appendChild(avatar);
    messenger.appendChild(container);
    document.body.appendChild(messenger);

    return getComputedStyle(avatar);
};

describe('SWF messenger compact avatar cascade', () => {
    it('keeps conversation-tab heads centered at their cropped size', () => {
        const style = computedAvatarStyle('messenger-avatar-tab', 35);

        expect(style.width).toBe('35px');
        expect(style.height).toBe('35px');
        expect(style.backgroundSize).toBe('35px 35px');
        expect(style.backgroundPosition).toBe('center center');
    });

    it('keeps message heads centered at their cropped size', () => {
        const style = computedAvatarStyle('message-avatar', 40);

        expect(style.width).toBe('40px');
        expect(style.height).toBe('40px');
        expect(style.backgroundSize).toBe('40px 40px');
        expect(style.backgroundPosition).toBe('center center');
    });
});
