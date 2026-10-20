import { loadEmojiMartData } from './emojiData';

type ShortcodeSource = {
    emojis: Record<string, { id: string; skins: { native: string }[] }>;
    aliases?: Record<string, string>;
};

/**
 * `:sob:` and `:)` in chat become the emoji they stand for, the way the old
 * emoji-toolkit conversion did. The names come from the emoji data, the same
 * set the chat bar picker shows, and that data is fetched on demand the first
 * time a room needs it, so nothing lands in the initial payload. Until it
 * arrives, text passes through untouched.
 */

/**
 * The smileys that turn into an emoji. They are listed here and not read from
 * the emoji data: datasets disagree on which emoji a smiley means and on which
 * smileys exist, and an update of the data must not change what chat says.
 */
const EMOTICONS = new Map<string, string>([
    [ ':)', '🙂' ],
    [ ':-)', '🙂' ],
    [ '(:', '🙂' ],
    [ '=)', '😃' ],
    [ '=-)', '😃' ],
    [ ':D', '😄' ],
    [ ':-D', '😄' ],
    [ 'C:', '😄' ],
    [ 'c:', '😄' ],
    [ ':(', '😞' ],
    [ ':-(', '😞' ],
    [ '):', '😞' ],
    [ ":'(", '😭' ],
    [ ':>', '😆' ],
    [ ':->', '😆' ],
    [ ';)', '😉' ],
    [ ';-)', '😉' ],
    [ ':P', '😛' ],
    [ ':p', '😛' ],
    [ ':b', '😛' ],
    [ ':-P', '😛' ],
    [ ':-p', '😛' ],
    [ ':-b', '😛' ],
    [ ';P', '😜' ],
    [ ';p', '😜' ],
    [ ';b', '😜' ],
    [ ';-P', '😜' ],
    [ ';-p', '😜' ],
    [ ';-b', '😜' ],
    [ ':*', '😘' ],
    [ ':-*', '😘' ],
    [ ':/', '😕' ],
    [ ':\\', '😕' ],
    [ ':-/', '😕' ],
    [ ':-\\', '😕' ],
    [ ':|', '😐' ],
    [ ':-|', '😐' ],
    [ '-_-', '😑' ],
    [ ':O', '😮' ],
    [ ':o', '😮' ],
    [ ':-O', '😮' ],
    [ ':-o', '😮' ],
    [ 'D:', '😧' ],
    [ '>:(', '😠' ],
    [ '>:-(', '😠' ],
    [ '8)', '😎' ],
    [ ':o)', '🐵' ],
    [ '<3', '❤️' ],
    [ '</3', '💔' ]
]);

const SHORTCODE_PATTERN = /:([a-z0-9_+-]+):/gi;
const TOKEN_PATTERN = /(^|\s)(\S+)(?=\s|$)/g;

let shortcodes: Map<string, string> = null;
let loading: Promise<void> = null;

export const registerEmojiShortcodes = (data: ShortcodeSource): void => {
    const nextShortcodes = new Map<string, string>();

    for (const emoji of Object.values(data.emojis ?? {})) {
        const native = emoji.skins?.[0]?.native;

        if (!native) continue;

        nextShortcodes.set(emoji.id.toLowerCase(), native);
    }

    for (const [alias, id] of Object.entries(data.aliases ?? {})) {
        const native = nextShortcodes.get(id.toLowerCase());

        if (native && !nextShortcodes.has(alias.toLowerCase())) nextShortcodes.set(alias.toLowerCase(), native);
    }

    shortcodes = nextShortcodes;
};

export const resetEmojiShortcodes = (): void => {
    shortcodes = null;
    loading = null;
};

export const emojiShortcodesReady = (): boolean => shortcodes !== null;

export const loadEmojiShortcodes = (): Promise<void> => {
    if (shortcodes) return Promise.resolve();

    if (!loading) {
        loading = loadEmojiMartData()
            .then(registerEmojiShortcodes)
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
        const native = EMOTICONS.get(token);

        return native ? `${lead}${native}` : match;
    });

    return result;
};
