import { describe, expect, it } from 'vitest';
import {
    buildWiredVariableNodes,
    buildWiredVariablePickerEntries,
    flattenWiredVariablePickerEntries,
    isDerivedVariableItemId,
    isSmartVariableKey,
    isWiredVariableNodeDisabled,
    IWiredVariableNode,
    normalizeInternalVariableKey,
    WIRED_VARIABLE_TYPE_DYNAMIC,
    WIRED_VARIABLE_TYPE_INTERNAL,
    WIRED_VARIABLE_TYPE_USER,
    withoutExecutionContextVariables
} from './WiredVariablePickerData';

const variable = (itemId: number, name: string, hasValue = true) => ({ itemId, name, availability: 0, hasValue, isReadOnly: false });
const names = (node: IWiredVariableNode) => [...node.children.values()].map((child) => child.name);
const child = (node: IWiredVariableNode, ...path: string[]) => path.reduce((current, name) => current.children.get(name), node);

describe('Wired variable picker internal furniture variables', () => {
    it('offers gravity as both a reference and destination without changing custom variables', () => {
        const references = flattenWiredVariablePickerEntries(buildWiredVariablePickerEntries('furni', 'change-reference', []));
        const destinations = flattenWiredVariablePickerEntries(buildWiredVariablePickerEntries('furni', 'change-destination', []));

        expect(references.find((entry) => entry.label === '@gravity')?.selectable).toBe(true);
        expect(destinations.find((entry) => entry.label === '@gravity')?.selectable).toBe(true);
    });
});

describe('Wired variable picker types', () => {
    const furni = () => buildWiredVariablePickerEntries('furni', 'change-reference', [variable(7, 'score')]);

    it('files ~ variables as smart, @ variables as internal and room variables as user made', () => {
        const entries = furni();

        expect(isSmartVariableKey('~teleport.target_id')).toBe(true);
        expect(isSmartVariableKey('@id')).toBe(false);
        expect(entries.find((entry) => entry.label === '~teleport.target_id')?.variableType).toBe(WIRED_VARIABLE_TYPE_DYNAMIC);
        expect(entries.find((entry) => entry.label === '@id')?.variableType).toBe(WIRED_VARIABLE_TYPE_INTERNAL);
        expect(entries.find((entry) => entry.label === 'score')?.variableType).toBe(WIRED_VARIABLE_TYPE_USER);
    });

    it('keeps the server type and the invisible flag of a room variable', () => {
        const [entry] = buildWiredVariablePickerEntries('user', 'condition', [{ ...variable(3, 'hidden'), variableType: 2, isInvisible: true }]);

        expect(entry.variableType).toBe(2);
        expect(entry.isInvisible).toBe(true);
    });
});

describe('Wired variable picker tree', () => {
    const catalog = [
        variable(1, 'event.transaction_complete.deposit.furni_count'),
        variable(2, 'event.transaction_complete.deposit.credits'),
        variable(3, 'event.transaction_complete.withdraw.furni_count'),
        variable(4, 'event.variable_update.old_value'),
        variable(5, 'event.variable_update.new_value'),
        variable(6, 'score')
    ];
    const entries = buildWiredVariablePickerEntries('context', 'change-reference', catalog);

    it('keeps one entry per variable in catalogue order, room variables first', () => {
        expect(entries.slice(0, catalog.length).map((entry) => entry.displayLabel)).toEqual(catalog.map((definition) => definition.name));
        expect(entries.every((entry) => !entry.children)).toBe(true);
    });

    it('nests on every dot, to any depth, with segment names', () => {
        const root = buildWiredVariableNodes(entries.slice(0, catalog.length));

        expect(names(root)).toEqual(['event', 'score']);
        expect(names(child(root, 'event'))).toEqual(['transaction_complete', 'variable_update']);
        expect(names(child(root, 'event', 'transaction_complete'))).toEqual(['deposit', 'withdraw']);
        expect(names(child(root, 'event', 'transaction_complete', 'deposit'))).toEqual(['furni_count', 'credits']);
        expect(child(root, 'event', 'transaction_complete', 'deposit', 'furni_count').entry?.token).toBe(entries[0].token);
        expect(child(root, 'event').entry).toBeNull();
    });

    it('flattens single-child chains to a full-name leaf for the search and recent tabs', () => {
        const root = buildWiredVariableNodes([entries[2], entries[5]], true);

        expect(names(root)).toEqual(['event.transaction_complete.withdraw.furni_count', 'score']);
        expect(child(root, 'event').entry?.token).toBe(entries[2].token);
        expect(child(root, 'event').children.size).toBe(0);
    });

    it('does not flatten a branch with several children', () => {
        const root = buildWiredVariableNodes(entries.slice(0, 2), true);

        expect(names(root)).toEqual(['event']);
        expect(names(child(root, 'event', 'transaction_complete', 'deposit'))).toEqual(['furni_count', 'credits']);
    });

    it('reuses an existing branch node without giving it the later variable', () => {
        const root = buildWiredVariableNodes(buildWiredVariablePickerEntries('user', 'condition', [variable(10, 'team.score'), variable(11, 'team')]));

        expect(child(root, 'team').entry).toBeNull();
        expect(names(child(root, 'team'))).toEqual(['score']);
    });

    it('greys a branch only when nothing below it can be selected', () => {
        const references = buildWiredVariablePickerEntries('context', 'change-reference', [variable(20, 'a.b', false), variable(21, 'a.c', true), variable(22, 'd.e', false)]);
        const root = buildWiredVariableNodes(references.slice(0, 3));

        expect(isWiredVariableNodeDisabled(child(root, 'a'))).toBe(false);
        expect(isWiredVariableNodeDisabled(child(root, 'a', 'b'))).toBe(true);
        expect(isWiredVariableNodeDisabled(child(root, 'd'))).toBe(true);
    });
});

describe('Wired variable picker echo filter', () => {
    it('offers any variable that exists outside a running stack', () => {
        const user = buildWiredVariablePickerEntries('user', 'echo', [variable(1, 'score'), variable(2, 'level.xp'), { ...variable(3, 'temp'), requiresExecutionContext: true }]);
        const context = buildWiredVariablePickerEntries('context', 'echo', [variable(4, 'turn')]);

        expect(user.find((entry) => entry.label === 'score')?.selectable).toBe(true);
        expect(user.find((entry) => entry.label === 'level.xp')?.selectable).toBe(true);
        expect(user.find((entry) => entry.label === 'temp')?.selectable).toBe(false);
        expect(user.find((entry) => entry.label === '@index')?.selectable).toBe(true);
        // AIR's echo lists context variables too; a context echo reads its built-in in the running stack.
        expect(context.find((entry) => entry.label === '@selector_furni_count')?.selectable).toBe(true);
        expect(context.find((entry) => entry.label === 'turn')?.selectable).toBe(true);
    });
});

describe('Wired variable picker sub-variables', () => {
    const hourOfDay = { itemId: 1_500_000_000 + 10 * 32 + 4, name: 'joined.value.hour_of_day', availability: 0, hasValue: true, isReadOnly: false };
    const selectable = (usage: Parameters<typeof buildWiredVariablePickerEntries>[1], definition = hourOfDay) =>
        buildWiredVariablePickerEntries('user', usage, [definition]).find((entry) => entry.label === definition.name)?.selectable;

    it('recognises the synthetic sub-variable ids', () => {
        expect(isDerivedVariableItemId(hourOfDay.itemId)).toBe(true);
        expect(isDerivedVariableItemId(700_000_017)).toBe(true);
        expect(isDerivedVariableItemId(123)).toBe(false);
    });

    it('lets a writable Time Utilities part be changed but never given or removed', () => {
        expect(selectable('change-destination')).toBe(true);
        expect(selectable('change-reference')).toBe(true);
        expect(selectable('give')).toBe(false);
        expect(selectable('remove')).toBe(false);
        expect(selectable('give', variable(9, 'score'))).toBe(true);
    });

    it('keeps a timestamp part read-only', () => {
        expect(selectable('change-destination', { ...hourOfDay, name: 'joined.creation_time', isReadOnly: true })).toBe(false);
    });

    it('leaves pointers out where no stack runs and never offers one as an echo source', () => {
        const definitions = [
            { itemId: 1, name: 'hp', hasValue: true, availability: 0 },
            { itemId: 2, name: 'ptr', hasValue: true, availability: 0, requiresExecutionContext: true }
        ];

        expect(withoutExecutionContextVariables(definitions).map((definition) => definition.name)).toEqual([ 'hp' ]);
        expect(withoutExecutionContextVariables(null)).toEqual([]);

        const echo = buildWiredVariablePickerEntries('user', 'echo', definitions).filter((entry) => entry.kind === 'custom');
        expect(echo.map((entry) => [ entry.label, entry.selectable ])).toEqual([ [ 'hp', true ], [ 'ptr', false ] ]);

        // Every box that runs in a stack can pick a pointer like any other variable.
        const give = buildWiredVariablePickerEntries('user', 'give', definitions).filter((entry) => entry.kind === 'custom');
        expect(give.every((entry) => entry.selectable)).toBe(true);
    });
});

describe('Wired variable picker: AIR internal and smart variables', () => {
    const labels = (target: 'furni' | 'user' | 'context', usage: 'change-reference' | 'change-destination') =>
        flattenWiredVariablePickerEntries(buildWiredVariablePickerEntries(target, usage, []))
            .filter((entry) => entry.selectable)
            .map((entry) => entry.label);

    it('offers the packed @position and @occupation as AIR', () => {
        expect(labels('furni', 'change-destination')).toEqual(expect.arrayContaining(['@position', '@occupation']));
        expect(labels('user', 'change-destination')).toContain('@position');
        expect(labels('user', 'change-destination')).not.toContain('@occupation');
    });

    it('lists the smart variables read-only, under AIR names', () => {
        const furni = labels('furni', 'change-reference');

        expect(furni).toEqual(expect.arrayContaining(['~chest.capacity', '~area_hide.width', '~recolorable_furni.color.rgb.red']));
        expect(labels('furni', 'change-destination')).not.toContain('~chest.capacity');
        expect(labels('user', 'change-reference')).toEqual(expect.arrayContaining(['~pet.level', '~horse.is_riding', '~plant.is_dead']));
        expect(normalizeInternalVariableKey('~recolorable_furni.color.rgb.g')).toBe('~recolorable_furni.color.rgb.green');
    });

    it('offers the link source room and the transaction failure reason in the context', () => {
        expect(labels('context', 'change-reference')).toEqual(expect.arrayContaining(['@event.link.source_room_id', '@event.transaction_failed.reason']));
    });

    it('lists the clock parts on furni, only the pulse count writable', () => {
        expect(labels('furni', 'change-reference')).toEqual(expect.arrayContaining(['~clock.state', '~clock.pulse_count', '~clock.is_game_aware']));
        expect(labels('furni', 'change-destination')).toContain('~clock.pulse_count');
        expect(labels('furni', 'change-destination')).not.toContain('~clock.state');
    });

    it('lists the plant shape, colour and harvest flag read-only', () => {
        expect(labels('user', 'change-reference')).toEqual(expect.arrayContaining(['~plant.shape', '~plant.color', '~plant.can_harvest']));
        expect(labels('user', 'change-destination')).not.toContain('~plant.shape');
    });

    it('offers the habbicon to write and the transaction parts to read', () => {
        expect(labels('user', 'change-destination')).toContain('@habbicon');
        expect(labels('user', 'change-reference')).toEqual(expect.arrayContaining(['@transaction.in_trade', '@transaction.state', '@transaction.current_multiplier']));
        expect(labels('user', 'change-destination')).not.toContain('@transaction.state');
    });

    it('offers the event habbicon and what a completed transaction moved in the context', () => {
        expect(labels('context', 'change-reference')).toEqual(
            expect.arrayContaining(['@event.habbicon', '@event.transaction_complete.multiplier', '@event.transaction_complete.withdrawal.coins_count'])
        );
    });
});
