/**
 * The official wired menu links (`wiredmenu/...`, WiredMenuController.linkReceived) as our creator
 * tools links (`wired-tools/...`). Null when the link names nothing we have.
 *
 * - `wiredmenu/open` shows the menu on its current tab (`wired-tools/open`);
 * - `wiredmenu/open/<tab>` also selects that tab, with `variable_overview` for our variables tab;
 * - `wiredmenu/open/variable_overview/<name>` opens the variables tab on that variable;
 * - `wiredmenu/open/inspection/<0 furni | 1 user>/<id>`;
 * - `wiredmenu/logs` opens the room logs.
 */
const OFFICIAL_TABS: Record<string, string> = {
    monitor: 'monitor',
    variable_overview: 'variables',
    inspection: 'inspection',
    chests: 'chests',
    settings: 'settings'
};

/** Our floor furni category, as the inspection link of our tools expects it. */
const FLOOR_CATEGORY = 10;

export const translateWiredMenuLink = (url: string): string | null => {
    const parts = (url ?? '').split('/');

    if (parts[0] !== 'wiredmenu' || parts.length < 2) return null;

    if (parts[1] === 'logs') return 'wired-tools/logs';
    if (parts[1] !== 'open') return null;
    if (parts.length < 3 || !parts[2]) return 'wired-tools/open';

    if (parts[2] === 'inspection' && parts.length > 4) {
        const id = parseInt(parts[4], 10);

        if (!Number.isInteger(id)) return 'wired-tools/tab/inspection';

        return parts[3] === '1' ? `wired-tools/inspection/user/${id}` : `wired-tools/inspection/furni/${id}/${FLOOR_CATEGORY}`;
    }

    const tab = OFFICIAL_TABS[parts[2]];
    const variableName = parts[2] === 'variable_overview' ? parts.slice(3).join('/') : '';

    if (variableName) return `wired-tools/tab/variables/${variableName}`;

    return tab ? `wired-tools/tab/${tab}` : 'wired-tools/open';
};

/** The official tab title key of one of our tabs. */
export const wiredMenuTabKey = (tab: string) => `wiredmenu.${tab === 'variables' ? 'variable_overview' : tab}.tab`;
