/* @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';
import { beforeAll, describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/components/friends/views/friends-list/FriendsListView.css'), 'utf8');

beforeAll(async () => {
    const result = await postcss().process(source, { from: undefined });
    const relevantRules: string[] = [];

    result.root.walkRules((rule) => {
        if (rule.selector.includes('.hfl-friend-avatar')) relevantRules.push(rule.toString());
    });

    const style = document.createElement('style');

    style.textContent = relevantRules.join('\n');
    document.head.appendChild(style);
});

describe('Friends list compact avatar cascade', () => {
    it('keeps the cropped friend head at its smooth 20px output size', () => {
        const container = document.createElement('div');
        const avatar = document.createElement('div');

        container.className = 'hfl-friend-avatar';
        avatar.className = 'avatar-image compact-head';
        avatar.style.backgroundSize = '20px 20px';
        avatar.style.backgroundPosition = 'center';
        avatar.style.imageRendering = 'auto';
        container.appendChild(avatar);
        document.body.appendChild(container);

        const computed = getComputedStyle(avatar);

        expect(computed.top).toBe('0px');
        expect(computed.left).toBe('0px');
        expect(computed.width).toBe('20px');
        expect(computed.height).toBe('20px');
        expect(computed.backgroundSize).toBe('20px 20px');
        expect(computed.backgroundPosition).toBe('center center');
        expect(computed.imageRendering).toBe('auto');
    });
});
