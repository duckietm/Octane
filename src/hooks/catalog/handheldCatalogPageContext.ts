import { createContext, useContext } from 'react';

/** What the phone catalogue hands the open page for its strip (back button and title). */
export interface HandheldCatalogPageContextValue {
    /** The name of the open page (or "search results"). */
    pageTitle: string;
    /** The list "back" goes to. */
    backLabel: string;
    /** Back from the page to its list of pages. */
    onBack: () => void;
}

export const HandheldCatalogPageContext = createContext<HandheldCatalogPageContextValue | null>(null);

/** The phone catalogue's page strip data; null outside the phone catalogue. */
export const useHandheldCatalogPage = (): HandheldCatalogPageContextValue | null => useContext(HandheldCatalogPageContext);
