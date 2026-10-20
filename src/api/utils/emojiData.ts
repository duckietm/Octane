/**
 * The emoji the chat picker shows and the `:name:` codes chat turns into emoji.
 * The emoji and their names come from emojibase-data, which follows every
 * Unicode emoji release; emoji-mart's picker wants its own data shape, so it
 * is built here. The `:name:` codes are the ones of the iamcal preset, the
 * names emoji-mart used, so every code that worked still means the same emoji.
 * Both files are large and only read the first time a picker or a room needs
 * them, so nothing lands in the initial payload.
 */

type EmojibaseSkin = { hexcode: string; emoji: string; tone?: number | number[] };

type EmojibaseEmoji = {
    label: string;
    hexcode: string;
    emoji: string;
    tags?: string[];
    group?: number;
    order?: number;
    version: number;
    skins?: EmojibaseSkin[];
};

type EmojibaseShortcodes = Record<string, string | string[]>;

export type EmojiMartEmoji = {
    id: string;
    name: string;
    keywords: string[];
    skins: { unified: string; native: string }[];
    version: number;
};

export type EmojiMartData = {
    categories: { id: string; emojis: string[] }[];
    emojis: Record<string, EmojiMartEmoji>;
    aliases: Record<string, string>;
};

/**
 * emojibase groups: 0 smileys, 1 people, 2 skin tone components (not emoji to
 * pick), 3 animals, 4 food, 5 travel, 6 activities, 7 objects, 8 symbols, 9 flags.
 */
const CATEGORY_OF_GROUP: Record<number, string> = {
    0: 'people',
    1: 'people',
    3: 'nature',
    4: 'foods',
    5: 'places',
    6: 'activity',
    7: 'objects',
    8: 'symbols',
    9: 'flags'
};

const CATEGORY_ORDER = [ 'people', 'nature', 'foods', 'activity', 'places', 'objects', 'symbols', 'flags' ];

const titleCase = (label: string): string => label.replace(/(^|[\s:-])([a-z])/g, (_, lead: string, letter: string) => lead + letter.toUpperCase());

const slug = (label: string): string => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const skinsOf = (emoji: EmojibaseEmoji): EmojiMartEmoji['skins'] => {
    const skins: EmojiMartEmoji['skins'] = [ { unified: emoji.hexcode.toLowerCase(), native: emoji.emoji } ];

    // The picker has one skin per tone: leave out the variants made of several tones (couples, handshakes).
    const byTone = (emoji.skins ?? []).filter((skin) => typeof skin.tone === 'number').sort((a, b) => (a.tone as number) - (b.tone as number));

    for (const skin of byTone) skins.push({ unified: skin.hexcode.toLowerCase(), native: skin.emoji });

    return skins.length === 6 ? skins : skins.slice(0, 1);
};

export const buildEmojiMartData = (emojis: EmojibaseEmoji[], shortcodes: EmojibaseShortcodes): EmojiMartData => {
    const result: EmojiMartData = { categories: [], emojis: {}, aliases: {} };
    const ordered = emojis.filter((emoji) => emoji.group !== undefined && CATEGORY_OF_GROUP[emoji.group]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const idsByCategory = new Map<string, string[]>();

    for (const emoji of ordered) {
        const codes = [ shortcodes[emoji.hexcode] ].flat().filter((code): code is string => !!code).map((code) => code.toLowerCase());
        let id = codes[0] ?? slug(emoji.label);

        while (result.emojis[id]) id = `${id}_`;

        result.emojis[id] = {
            id,
            name: titleCase(emoji.label),
            keywords: emoji.tags ?? [],
            skins: skinsOf(emoji),
            // emoji-mart counts the first emoji releases as version 1
            version: Math.max(1, emoji.version)
        };

        for (const alias of codes.slice(1)) if (!result.aliases[alias] && !result.emojis[alias]) result.aliases[alias] = id;

        const category = CATEGORY_OF_GROUP[emoji.group];

        idsByCategory.set(category, [ ...(idsByCategory.get(category) ?? []), id ]);
    }

    result.categories = CATEGORY_ORDER.filter((id) => idsByCategory.has(id)).map((id) => ({ id, emojis: idsByCategory.get(id) }));

    return result;
};

let loading: Promise<EmojiMartData> = null;

export const loadEmojiMartData = (): Promise<EmojiMartData> => {
    if (!loading) {
        loading = Promise.all([ import('emojibase-data/en/data.json'), import('emojibase-data/en/shortcodes/iamcal.json') ])
            .then(([ emojis, shortcodes ]) =>
                buildEmojiMartData(
                    (emojis as unknown as { default: EmojibaseEmoji[] }).default,
                    (shortcodes as unknown as { default: EmojibaseShortcodes }).default
                )
            )
            .catch((error) => {
                loading = null;

                throw error;
            });
    }

    return loading;
};
