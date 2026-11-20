/**
 * Help pages (habbopages): how a link's page name becomes the files to look for.
 *
 * Pages are kept per language, one `.html` file each: `<language>/<page>.html` (`nl/chat/commands.html`). Older
 * links and older folders keep working: a link may still carry `.html`, name a page by its former (Dutch) name, or
 * point at a folder with an `index.html`.
 */

/** Former page names (lower case) and the page they are now. */
const PAGE_ALIASES: Readonly<Record<string, string>> = {
    // The former Dutch names: an "actie" is what starts a wired (a trigger), a "reactie" what it then does (an effect).
    wired_actie: 'wired_triggers',
    wired_reactie: 'wired_effects',
    wired_voorwaarden: 'wired_conditions',
    wired_addon: 'wired_addons',
    wired_scorebord: 'wired_leaderboards',
    'chat/chatting': 'chat/commands',
    chat: 'chat/commands',
    commands: 'chat/commands'
};

/** The page a link means: no slashes around it, no `.html` / `.txt` / `/index`, a former name replaced. */
export const normalizeHabboPagePath = (path: string): string => {
    let page = (path ?? '').trim().replace(/^\/+|\/+$/g, '');

    page = page.replace(/\.(html?|txt)$/i, '').replace(/\/index$/i, '');

    return PAGE_ALIASES[page.toLowerCase()] ?? page;
};

const cleanLocale = (locale: string | null | undefined): string => {
    const value = (locale ?? '').trim().toLowerCase().split(/[-_]/)[0];

    return /^[a-z]{2,3}$/.test(value) ? value : '';
};

/**
 * The files to try for a page, best first, relative to the pages folder: the player's language, the hotel's own
 * language, English, and then the places pages were kept before they had a language.
 */
export const habboPageCandidates = (path: string, locale: string, baseLocale: string = 'en'): string[] => {
    const page = normalizeHabboPagePath(path);

    if (!page) return [];

    const candidates: string[] = [];

    for (const language of [cleanLocale(locale), cleanLocale(baseLocale), 'en']) {
        if (language) candidates.push(`${language}/${page}.html`);
    }

    candidates.push(`${page}.html`, `${page}/index.html`, page);

    return candidates.filter((candidate, index) => candidates.indexOf(candidate) === index);
};

let activeTextLocale = '';

/** The language the player reads the client in ('' while it is the hotel's own). Set where the UI texts are applied. */
export const setActiveTextLocale = (locale: string | null | undefined): void => {
    activeTextLocale = cleanLocale(locale);
};

export const getActiveTextLocale = (): string => activeTextLocale;
