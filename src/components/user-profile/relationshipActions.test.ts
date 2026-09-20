import { describe, expect, it } from 'vitest';
import { RelationshipActionContext, resolveRelationshipActions } from './relationshipActions';

const base: RelationshipActionContext = {
    targetId: 42,
    selfId: 7,
    friend: null,
    targetInRoom: false,
    viewerInRoom: false,
    isIgnored: false
};

describe('resolveRelationshipActions', () => {
    it('offers nothing for the viewer themself or an empty row', () => {
        expect(resolveRelationshipActions({ ...base, targetId: 7 })).toEqual([]);
        expect(resolveRelationshipActions({ ...base, targetId: 0 })).toEqual([]);
    });

    it('offers only ignore for a stranger who is not in the room', () => {
        expect(resolveRelationshipActions(base)).toEqual(['ignore']);
        expect(resolveRelationshipActions({ ...base, isIgnored: true })).toEqual(['unignore']);
    });

    it('offers whisper when the target is in the same room, and never follow or invite', () => {
        expect(resolveRelationshipActions({ ...base, targetInRoom: true, viewerInRoom: true, friend: { online: true } })).toEqual(['whisper', 'ignore']);
    });

    it('offers follow for an online friend elsewhere', () => {
        expect(resolveRelationshipActions({ ...base, friend: { online: true } })).toEqual(['follow', 'ignore']);
        expect(resolveRelationshipActions({ ...base, friend: { online: false } })).toEqual(['ignore']);
    });

    it('offers invite only when the viewer is in a room and the target is a friend', () => {
        expect(resolveRelationshipActions({ ...base, viewerInRoom: true, friend: { online: false } })).toEqual(['invite', 'ignore']);
        expect(resolveRelationshipActions({ ...base, viewerInRoom: true, friend: { online: true } })).toEqual(['follow', 'invite', 'ignore']);
        expect(resolveRelationshipActions({ ...base, viewerInRoom: true })).toEqual(['ignore']);
    });
});
