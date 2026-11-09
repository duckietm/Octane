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
        if (rule.selector.includes('.friend-bar-actions')) relevantRules.push(rule.toString());
    });

    const style = document.createElement('style');

    style.textContent = relevantRules.join('\n');
    document.head.appendChild(style);
});

describe('friend bar closing panel', () => {
    it('hides the retained exit frame as soon as the friend tab is deselected', () => {
        const bar = document.createElement('div');
        const friend = document.createElement('div');
        const actions = document.createElement('div');

        bar.className = 'friend-bar';
        friend.className = 'friend-bar-friend';
        actions.className = 'friend-bar-actions';
        friend.appendChild(actions);
        bar.appendChild(friend);
        document.body.appendChild(bar);

        expect(getComputedStyle(actions).display).toBe('none');
    });
});
