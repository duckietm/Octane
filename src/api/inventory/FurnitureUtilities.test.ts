import { StringDataType } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import { FurniCategory } from './FurniCategory';
import { getGroupItemKey } from './FurnitureUtilities';
import { GroupItem } from './GroupItem';

class FakeStringData extends StringDataType {
    constructor(private readonly values: string[]) {
        super();
    }

    public getValue(index: number): string {
        return this.values[index] || '';
    }

    public getLegacyString(): string {
        return this.values[0] ?? '';
    }
}

const makeGroup = (overrides: {
    type: number;
    category: number;
    stuffData: unknown;
    isGroupable: boolean;
    isWallItem?: boolean;
    lastItemId?: number;
}): GroupItem =>
    ({
        type: overrides.type,
        category: overrides.category,
        stuffData: overrides.stuffData,
        isGroupable: overrides.isGroupable,
        isWallItem: overrides.isWallItem ?? false,
        getLastItem: () => (overrides.lastItemId == null ? null : { id: overrides.lastItemId })
    }) as unknown as GroupItem;

const guildData = (guildId: string) => new FakeStringData(['0', guildId, 'badge', 'ffffff', '000000']);

describe('getGroupItemKey', () => {
    it('gives guild furni of the same type but different guilds distinct keys', () => {
        const a = makeGroup({ type: 5426, category: FurniCategory.GUILD_FURNI, stuffData: guildData('11'), isGroupable: true });
        const b = makeGroup({ type: 5426, category: FurniCategory.GUILD_FURNI, stuffData: guildData('22'), isGroupable: true });

        expect(getGroupItemKey(a)).not.toBe(getGroupItemKey(b));
        expect(getGroupItemKey(a)).toContain('5426:0:0');
        expect(getGroupItemKey(b)).toContain('5426:0:0');
    });

    it('keeps the key stable for the same guild furni group', () => {
        const a = makeGroup({ type: 5426, category: FurniCategory.GUILD_FURNI, stuffData: guildData('11'), isGroupable: true });
        const b = makeGroup({ type: 5426, category: FurniCategory.GUILD_FURNI, stuffData: guildData('11'), isGroupable: true });

        expect(getGroupItemKey(a)).toBe(getGroupItemKey(b));
    });

    it('leaves ordinary groupable furni on the plain type:wall:legacy key', () => {
        const group = makeGroup({ type: 5426, category: FurniCategory.DEFAULT, stuffData: new FakeStringData(['0']), isGroupable: true });

        expect(getGroupItemKey(group)).toBe('5426:0:0');
    });

    it('appends the item id for non-groupable furni', () => {
        const group = makeGroup({ type: 5426, category: FurniCategory.DEFAULT, stuffData: new FakeStringData(['0']), isGroupable: false, lastItemId: 77 });

        expect(getGroupItemKey(group)).toBe('5426:0:0:77');
    });

    it('applies both the guild discriminator and the item id for non-groupable guild furni', () => {
        const a = makeGroup({ type: 5426, category: FurniCategory.GUILD_FURNI, stuffData: guildData('11'), isGroupable: false, lastItemId: 1 });
        const b = makeGroup({ type: 5426, category: FurniCategory.GUILD_FURNI, stuffData: guildData('11'), isGroupable: false, lastItemId: 2 });

        expect(getGroupItemKey(a)).not.toBe(getGroupItemKey(b));
        expect(getGroupItemKey(a)).toContain(',11,');
    });
});
