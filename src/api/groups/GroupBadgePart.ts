export class GroupBadgePart {
    public static BASE: string = 'b';
    public static SYMBOL: string = 's';

    public type: string;
    public key: number;
    public color: number;
    public position: number;

    constructor(type: string, key?: number, color?: number, position?: number) {
        this.type = type;
        this.key = key ?? 0;
        this.color = color ?? 0;
        // Position 0 is the top left cell; only a missing position falls back to the centre.
        this.position = position ?? 4;
    }

    public get code(): string {
        if (this.key === 0 && this.type !== GroupBadgePart.BASE) return null;

        return GroupBadgePart.getCode(this.type, this.key, this.color, this.position);
    }

    /** The code to draw: a layer without a part (key 0, including an unset base) draws nothing. */
    public get previewCode(): string {
        if (this.key === 0) return null;

        return GroupBadgePart.getCode(this.type, this.key, this.color, this.position);
    }

    /** The badge editor's layers: the base, then four symbols. */
    public static LAYER_COUNT: number = 5;

    /**
     * AIR `GuildManagementWindowCtrl.onGuildCreationInfo`: the creator opens on the badge the server sends with the
     * group buy data (`key, colour, position` per layer). The first layer is the base, the rest symbols; a short list
     * is padded with empty symbol layers. No parts means the server sent no default.
     */
    public static fromBadgeSettings(parts: ReadonlyArray<{ key: number; color: number; position: number }>): GroupBadgePart[] {
        if (!parts || !parts.length) return [];

        const layers: GroupBadgePart[] = [];

        for (let index = 0; index < GroupBadgePart.LAYER_COUNT; index++) {
            const part = parts[index];

            layers.push(new GroupBadgePart(index === 0 ? GroupBadgePart.BASE : GroupBadgePart.SYMBOL, part?.key ?? 0, part?.color ?? 0, part?.position ?? 0));
        }

        return layers;
    }

    /**
     * AIR `BadgeEditorCtrl.createLayerOption`: a layer whose colour is not in the palette (the empty layers of the
     * default badge carry colour 0) shows, and is saved with, the palette's first colour.
     */
    public static withPaletteColors(parts: GroupBadgePart[], colorIds: ReadonlyArray<number>): GroupBadgePart[] {
        if (!parts || !colorIds || !colorIds.length) return parts;

        return parts.map((part) => (colorIds.includes(part.color) ? part : new GroupBadgePart(part.type, part.key, colorIds[0], part.position)));
    }

    public static getCode(type: string, key: number, color: number, position: number): string {
        return type + (key < 10 ? '0' : '') + key + (color < 10 ? '0' : '') + color + position;
    }

    /**
     * The wire list (key, color, position per layer) the official client sends: only layers that hold a part. The server reads the first
     * triple as the base, so a badge without a base (a symbol would move into the base slot) is refused with null.
     */
    public static serialize(parts: GroupBadgePart[]): number[] | null {
        if (!parts || !parts.length || parts[0].type !== GroupBadgePart.BASE || !parts[0].previewCode) return null;

        const badge: number[] = [];

        parts.forEach((part) => {
            if (!part.previewCode) return;

            badge.push(part.key, part.color, part.position);
        });

        return badge;
    }
}
