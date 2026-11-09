/**
 * `:sob:` and `:)` in chat become the emoji they stand for, the way the old
 * emoji-toolkit conversion did. The names and smileys come from emoji-mart's
 * data, the same set the chat bar picker shows, and that bundle is fetched on
 * demand the first time a room needs it, so nothing lands in the initial
 * payload. Until it arrives, text passes through untouched.
 */

type EmojiMartEmoji = { id: string; emoticons?: string[]; skins: { native: string }[] };
type EmojiMartData = { emojis: Record<string, EmojiMartEmoji>; aliases?: Record<string, string> };

/**
 * Several emoji claim the same smiley in the data; pick the one people mean.
 */
const PREFERRED_EMOTICONS: Record<string, string> = {
    ':)': 'slightly_smiling_face',
    ':-)': 'slightly_smiling_face',
    '(:': 'slightly_smiling_face',
    ':D': 'smile',
    ':-D': 'smile',
    ':(': 'disappointed',
    ':-(': 'disappointed',
    '):': 'disappointed',
    ":'(": 'sob',
    '<3': 'heart'
};

const SHORTCODE_PATTERN = /:([a-z0-9_+-]+):/gi;
const TOKEN_PATTERN = /(^|\s)(\S+)(?=\s|$)/g;

let shortcodes: Map<string, string> = null;
let emoticons: Map<string, string> = null;
let loading: Promise<void> = null;

export const registerEmojiShortcodes = (data: EmojiMartData): void => {
    const nextShortcodes = new Map<string, string>();
    const nextEmoticons = new Map<string, string>();

    for (const emoji of Object.values(data.emojis ?? {})) {
        const native = emoji.skins?.[0]?.native;

        if (!native) continue;

        nextShortcodes.set(emoji.id.toLowerCase(), native);

        for (const emoticon of emoji.emoticons ?? []) {
            const preferred = PREFERRED_EMOTICONS[emoticon];

            if (preferred ? preferred === emoji.id : !nextEmoticons.has(emoticon)) nextEmoticons.set(emoticon, native);
        }
    }

    for (const [alias, id] of Object.entries(data.aliases ?? {})) {
        const native = nextShortcodes.get(id.toLowerCase());

        if (native && !nextShortcodes.has(alias.toLowerCase())) nextShortcodes.set(alias.toLowerCase(), native);
    }

    shortcodes = nextShortcodes;
    emoticons = nextEmoticons;
};

export const resetEmojiShortcodes = (): void => {
    shortcodes = null;
    emoticons = null;
    loading = null;
};

export const emojiShortcodesReady = (): boolean => shortcodes !== null;

export const loadEmojiShortcodes = (): Promise<void> => {
    if (shortcodes) return Promise.resolve();

    if (!loading) {
        loading = import('@emoji-mart/data')
            .then((module) => registerEmojiShortcodes(((module as { default?: EmojiMartData }).default ?? module) as EmojiMartData))
            .catch(() => {
                loading = null;
            });
    }

    return loading;
};

export const convertEmojiShortcodes = (text: string): string => {
    if (!shortcodes || !text) return text;

    let result = text.replace(SHORTCODE_PATTERN, (match, id: string) => shortcodes.get(id.toLowerCase()) ?? match);

    result = result.replace(TOKEN_PATTERN, (match, lead: string, token: string) => {
        const native = emoticons.get(token);

        return native ? `${lead}${native}` : match;
    });

    return result;
};
