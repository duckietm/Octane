import { describe, expect, it, vi } from 'vitest';

vi.mock('@octane/renderer', () => ({ ExtendedForumData: class {}, UpdateForumSettingsMessageComposer: class {} }));
vi.mock('../../../../api', () => ({ CreateLinkEvent: vi.fn(), LocalizeText: (key: string) => key, SendMessageComposer: vi.fn() }));
vi.mock('../../../../common', () => ({ LayoutBadgeImageView: () => null }));
vi.mock('../../../../common/BaseButton', () => ({ BaseButton: 'button' }));
vi.mock('../GroupNativeLayout', () => ({ flatText: () => ({}), GroupText: () => null }));
vi.mock('./GroupForumLayout', () => ({ FORUM_HEADER: 0, ForumButton: () => null, ForumFrame: () => null }));

import { forumPermissionMinimums, normalizeForumPermissions } from './GroupForumSettingsView';

// Levels: 0 everybody, 1 group members, 2 group administrators, 3 the owner.
describe('forum permission rules (AIR ForumSettingsView.setSelectorState)', () => {
    it('never lets posting be more open than reading, or starting threads more open than posting', () => {
        expect(normalizeForumPermissions([1, 0, 0, 2])).toEqual([1, 1, 1, 2]);
        expect(normalizeForumPermissions([2, 1, 3, 2])).toEqual([2, 2, 3, 2]);
        expect(normalizeForumPermissions([0, 2, 1, 3])).toEqual([0, 2, 2, 3]);
    });

    it('keeps moderating with the administrators at least', () => {
        expect(normalizeForumPermissions([0, 0, 0, 0])).toEqual([0, 0, 0, 2]);
        expect(normalizeForumPermissions([0, 0, 0, 3])).toEqual([0, 0, 0, 3]);
    });

    it('greys the options below the section above', () => {
        expect(forumPermissionMinimums([1, 2, 3, 2])).toEqual([0, 1, 2, 2]);
        expect(forumPermissionMinimums([0, 0, 0, 3])).toEqual([0, 0, 0, 2]);
    });
});
