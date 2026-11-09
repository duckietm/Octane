import { afterEach, describe, expect, it } from 'vitest';
import { CATALOG_PAGE_NEW_ADDITIONS, resolveNewAdditionsOnOpen, useCatalogNewAdditionsStore } from './catalogNewAdditionsStore';

const base = { available: true, hasTarget: false, notificationEnabled: true, openDisabled: false };

describe('AIR catalogue new additions', () => {
    afterEach(() => useCatalogNewAdditionsStore.setState({ available: false }));

    it('opens the new_additions page and marks it when the catalogue opens without a page of its own', () => {
        expect(CATALOG_PAGE_NEW_ADDITIONS).toBe('new_additions');
        expect(resolveNewAdditionsOnOpen(base)).toEqual({ mark: true, openNewAdditions: true });
    });

    it('marks but keeps a deep link, a disabled page open or a disabled toolbar notification', () => {
        expect(resolveNewAdditionsOnOpen({ ...base, hasTarget: true })).toEqual({ mark: true, openNewAdditions: false });
        expect(resolveNewAdditionsOnOpen({ ...base, openDisabled: true })).toEqual({ mark: true, openNewAdditions: false });
        expect(resolveNewAdditionsOnOpen({ ...base, notificationEnabled: false })).toEqual({ mark: true, openNewAdditions: false });
    });

    it('does nothing without the index flag', () => {
        expect(resolveNewAdditionsOnOpen({ ...base, available: false })).toEqual({ mark: false, openNewAdditions: false });
    });

    it('holds the flag of the last normal index', () => {
        useCatalogNewAdditionsStore.getState().setAvailable(true);
        expect(useCatalogNewAdditionsStore.getState().available).toBe(true);
        useCatalogNewAdditionsStore.getState().setAvailable(false);
        expect(useCatalogNewAdditionsStore.getState().available).toBe(false);
    });
});
