import { describe, expect, it } from 'vitest';
import { explorerHolderDescription, holderInfoLines, lookupTarget, resolvedEntityId, toVariableDefinition, variableProperties } from './VariablesExplorer.helpers';

describe('VariablesExplorer helpers', () => {
    it('reads the lookup field by kind', () => {
        expect(lookupTarget('username', ' Bob ')).toEqual({ scope: 'user', kind: 'users', username: 'Bob' });
        expect(lookupTarget('pets', '12')).toEqual({ scope: 'user', kind: 'pets', entityId: 12 });
        expect(lookupTarget('wall-items', '9')).toEqual({ scope: 'furni', kind: 'wall-items', entityId: 9 });
        expect(lookupTarget('furni-bc', '3')).toEqual({ scope: 'furni', kind: 'furni-bc', entityId: 3 });
        expect(lookupTarget('furni', 'abc')).toBeNull();
        expect(lookupTarget('users', '0')).toBeNull();
        expect(lookupTarget('username', '')).toBeNull();
    });

    it('names holders with the name the API sent, also users who are not in the room', () => {
        expect(explorerHolderDescription('users', 77, 'dave')).toEqual({ categoryLabel: 'Habbo', entityName: 'dave' });
        expect(explorerHolderDescription('users', 78, 'Habbo #78')).toEqual({ categoryLabel: 'Habbo', entityName: '#78' });
        expect(explorerHolderDescription('furni', 9, '')).toEqual({ categoryLabel: 'Floor furni', entityName: '#9' });
    });

    it('writes to the id a name lookup resolved to', () => {
        const target = { scope: 'user' as const, kind: 'users' as const, username: 'Bob' };

        expect(resolvedEntityId(target, null)).toBeNull();
        expect(resolvedEntityId(target, { entityId: 44, variables: {} })).toBe(44);
        expect(holderInfoLines(target, { entityId: 44, name: 'Bob', variables: {} }, 1)).toEqual(['User type: Habbo', 'Name: Bob', 'User id: 44']);
        expect(holderInfoLines({ scope: 'global' }, null, 5)).toEqual(['Scope: Room', 'Room id: 5']);
        expect(holderInfoLines({ scope: 'user', kind: 'pets', entityId: 6399 }, null, 5, 'DragonDog', 'DuckieTM')).toEqual([
            'User type: Pet',
            'Name: DragonDog',
            'Owner: DuckieTM',
            'Pet id: 6399'
        ]);
        expect(holderInfoLines({ scope: 'furni', kind: 'furni', entityId: 9 }, null, 5, 'Highscore', 'DuckieTM')).toEqual([
            'Furni type: Floor furni',
            'Name: Highscore',
            'Owner: DuckieTM',
            'Furni id: 9'
        ]);
        expect(holderInfoLines({ scope: 'furni', kind: 'furni', entityId: 9 }, null, 5)).toEqual(['Furni type: Floor furni', 'Furni id: 9']);
        expect(holderInfoLines({ scope: 'furni', kind: 'wall-items-bc', entityId: 2 }, null, 5)).toEqual([
            'Furni type: Builders Club wall furni',
            'Furni id: 2'
        ]);
    });

    it('shows api variables in the creator tools picker as permanent custom variables', () => {
        const definition = toVariableDefinition({ name: 'score', scope: 'global', hasValue: true, textConnected: true }, false);

        expect(definition).toMatchObject({
            key: 'score',
            target: 'Global',
            type: 'Custom',
            availability: 'Permanent',
            canWriteTo: false,
            canCreateDelete: false
        });
        expect(variableProperties(definition)).toContainEqual({ key: 'Is text connected', value: 'Yes' });
        expect(variableProperties(null)).toEqual([]);
    });
});
