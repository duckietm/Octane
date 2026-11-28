/**
 * The page stack of the mod tools on a phone. On the desktop every moderator tool is a window of its own (the window
 * tracker's list); on a phone the same list is the set of open pages of one sheet, and only one of them (or the start
 * page) is in front. `focus` is the order the moderator went to them in, the last one being in front; a page that is
 * opened, or shown again, comes to the front, and a page that is closed simply drops out.
 */

export interface ModPageWindow {
    type: string;
    key: string;
    revision: number;
    hidden?: boolean;
}

/** The start page: the tool tiles, the selected user and the search. */
export const MOD_START_PAGE = 'start';

export const modPageId = (type: string, key: string): string => `${type}:${key}`;

const isOpen = (windows: readonly ModPageWindow[], id: string) => windows.some((entry) => !entry.hidden && modPageId(entry.type, entry.key) === id);

/** The pages opened, or shown again (a new revision, or no longer hidden), between two versions of the window list, in list order. */
export const openedModPages = (previous: readonly ModPageWindow[], windows: readonly ModPageWindow[]): string[] => {
    const before = new Map(previous.map((entry) => [modPageId(entry.type, entry.key), entry]));

    return windows
        .filter((entry) => {
            if (entry.hidden) return false;

            const old = before.get(modPageId(entry.type, entry.key));

            return !old || !!old.hidden || old.revision !== entry.revision;
        })
        .map((entry) => modPageId(entry.type, entry.key));
};

/** Brings a page (or the start page) to the front. */
export const focusModPage = (focus: readonly string[], id: string): string[] => [...focus.filter((entry) => entry !== id), id];

/** The page in front: the last one gone to that is still open, else the start page. */
export const activeModPage = (focus: readonly string[], windows: readonly ModPageWindow[]): string => {
    for (let index = focus.length - 1; index >= 0; index--) {
        const id = focus[index];

        if (id === MOD_START_PAGE || isOpen(windows, id)) return id;
    }

    return MOD_START_PAGE;
};

/** Back: the page in front steps aside (it stays open) and the one gone to before it comes back. */
export const backModPage = (focus: readonly string[], windows: readonly ModPageWindow[]): string[] => {
    const active = activeModPage(focus, windows);

    return focus.filter((id) => id !== active && (id === MOD_START_PAGE || isOpen(windows, id)));
};
