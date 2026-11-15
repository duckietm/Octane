import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('GroupMembersView member entry (AIR member_entry.xml)', () => {
    const source = read('src/components/groups/views/GroupMembersView.tsx');
    const css = read('src/css/groups/GroupView.css');

    it('keeps the window button skin off the head, the name and the icons of an entry', () => {
        expect(css).toMatch(
            /\.octane-groups-window \.octane-group-member-row button:not\(\.octane-card-header-close\)[^{]*\{[^}]*border-image-source:\s*none !important;[^}]*background:\s*transparent !important;/s
        );
    });

    // GroupView.css styles the entry twice; the later block, all !important, is the one that applies.
    const lastRule = (selector: string) => [...css.matchAll(new RegExp(`${selector}\\s*\\{[^}]*\\}`, 'gs'))].pop()?.[0] ?? '';

    it('lets the member-since date grow with its text', () => {
        const since = lastRule('\\.octane-group-member-row__since');

        expect(since).toContain('width: auto !important;');
        expect(since).not.toMatch(/\bwidth:\s*\d+px/);
        // The earlier block gives the copy box 94 px; a width wins over right, so the later one resets it.
        const copy = lastRule('\\.octane-group-member-row__copy');

        expect(copy).toContain('width: auto !important;');
        expect(copy).not.toMatch(/\bwidth:\s*\d+px/);
    });

    it('shows the admin icon only for an admin or the owner, or to a viewer who manages the group', () => {
        expect(source).toContain(
            'member.rank === GroupRank.OWNER || member.rank === GroupRank.ADMIN || (membersData.admin && member.rank === GroupRank.MEMBER)'
        );
        expect(source).toContain('{showRankIcon && (');
    });

    it('puts block and remove on the name line, so the date keeps its whole line', () => {
        expect(lastRule('\\.octane-group-member-row__actions')).toContain('top: 1px !important;');
        expect(source).not.toContain('has-actions');
    });
});
