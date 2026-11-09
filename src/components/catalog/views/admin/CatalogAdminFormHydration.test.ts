import { describe, expect, it } from 'vitest';
import { claimCatalogAdminHydration } from './CatalogAdminFormHydration';

describe('catalog admin form hydration', () => {
    it('hydrates a form only once while the same editor target stays open', () => {
        const claim = { current: null as string | null };

        expect(claimCatalogAdminHydration(claim, 'page:NORMAL:42')).toBe(true);
        expect(claimCatalogAdminHydration(claim, 'page:NORMAL:42')).toBe(false);
    });

    it('allows hydration again after switching targets or closing the editor', () => {
        const claim = { current: 'offer:NORMAL:42' as string | null };

        expect(claimCatalogAdminHydration(claim, 'offer:NORMAL:84')).toBe(true);
        expect(claimCatalogAdminHydration(claim, null)).toBe(false);
        expect(claimCatalogAdminHydration(claim, 'offer:NORMAL:84')).toBe(true);
    });
});
