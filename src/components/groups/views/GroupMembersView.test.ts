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

    it('lets the member-since date grow with its text', () => {
        const since = css.match(/\.octane-group-member-row__since\s*\{[^}]*\}/s)?.[0] ?? '';

        expect(since).toContain('width: auto;');
        expect(since).not.toContain('width: 61px;');
    });

    it('shows the admin icon only for an admin or the owner, or to a viewer who manages the group', () => {
        expect(source).toContain(
            'member.rank === GroupRank.OWNER || member.rank === GroupRank.ADMIN || (membersData.admin && member.rank === GroupRank.MEMBER)'
        );
        expect(source).toContain('{showRankIcon && (');
    });

    it('keeps the text clear of block and remove only when the viewer can use them', () => {
        expect(source).toContain("className={classNames('octane-group-member-row', hasActions && 'has-actions')}");
        expect(css).toMatch(/\.octane-group-member-row\.has-actions \.octane-group-member-row__copy\s*\{[^}]*right:\s*36px;/s);
    });
});
