import { describe, expect, it } from 'vitest';
import { getGroupHcRequiredInfoKey, resolveGroupEditFailure, resolveGroupJoinFailure } from './groupHcRequired';

describe('resolveGroupJoinFailure', () => {
    it('opens the HC popup for the subscription reason only', () => {
        expect(resolveGroupJoinFailure(4)).toEqual({ hcRequired: 'join', messageKey: 'group.joinfail.4', titleKey: 'group.joinfail.title' });
        expect(resolveGroupJoinFailure(0)).toEqual({ hcRequired: null, messageKey: 'group.joinfail.0', titleKey: 'group.joinfail.title' });
        expect(resolveGroupJoinFailure(2).hcRequired).toBeNull();
    });
});

describe('resolveGroupEditFailure', () => {
    it('opens the HC popup in manage mode for reason 2 and alerts otherwise', () => {
        expect(resolveGroupEditFailure(2)).toEqual({ hcRequired: 'manage', messageKey: 'group.edit.fail.2', titleKey: 'group.edit.fail.title' });
        expect(resolveGroupEditFailure(4)).toEqual({ hcRequired: null, messageKey: 'group.edit.fail.4', titleKey: 'group.edit.fail.title' });
    });
});

describe('getGroupHcRequiredInfoKey', () => {
    it('swaps the info line between join and manage', () => {
        expect(getGroupHcRequiredInfoKey('join')).toBe('group.hcrequired.info.join');
        expect(getGroupHcRequiredInfoKey('manage')).toBe('group.hcrequired.info.manage');
    });
});
