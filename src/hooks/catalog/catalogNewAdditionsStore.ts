import { createOctaneStore } from '../../state/createOctaneStore';

/** AIR `CatalogPageName.CATALOG_PAGE_NEW_ADDITIONS`. */
export const CATALOG_PAGE_NEW_ADDITIONS = 'new_additions';

export interface CatalogNewAdditionsState {
    /** The normal catalogue index flagged new additions (`newAdditionsAvailable`) and the catalogue has not opened since. */
    available: boolean;
    setAvailable: (available: boolean) => void;
}

export const useCatalogNewAdditionsStore = createOctaneStore<CatalogNewAdditionsState>((set) => ({
    available: false,
    setAvailable: (available) => set({ available })
}));

export interface NewAdditionsOpenContext {
    /** The index flag is set. */
    available: boolean;
    /** The catalogue opens on a page of its own (deep link, offer, the page it showed last). */
    hasTarget: boolean;
    /** `toolbar.new_additions.notification.enabled`. */
    notificationEnabled: boolean;
    /** `catalog.new.additions.page.open.disabled`. */
    openDisabled: boolean;
}

export interface NewAdditionsOpenResult {
    /** Send MarkCatalogNewAdditionsPageOpened, clear the flag and hide the toolbar label (CATALOG_NEW_ITEMS_HIDE). */
    mark: boolean;
    /** Open the new_additions page instead of the front page. */
    openNewAdditions: boolean;
}

/**
 * AIR `HabboCatalog`: with the flag set, a catalogue that opens without a page of its own opens the new_additions page
 * (only while the toolbar notification is on and the page open is not disabled), and opening the catalogue marks the
 * page as seen, which hides the label.
 */
export const resolveNewAdditionsOnOpen = (context: NewAdditionsOpenContext): NewAdditionsOpenResult => ({
    mark: context.available,
    openNewAdditions: context.available && !context.hasTarget && context.notificationEnabled && !context.openDisabled
});
