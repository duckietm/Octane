import { describe, expect, it } from 'vitest';
import { CatalogLayoutPetCustomizationView } from './CatalogLayoutPetCustomizationView';
import { CatalogLayoutUnavailableView } from './CatalogLayoutUnavailableView';
import { CatalogLayoutVipBuyView } from './CatalogLayoutVipBuyView';
import { GetCatalogLayout } from './GetCatalogLayout';
import { CatalogLayoutRecyclerView } from './recycler/CatalogLayoutRecyclerView';

const page = (layoutCode: string) =>
    ({
        pageId: 10,
        layoutCode,
        offers: [],
        localization: { getImage: () => '', getText: () => '' }
    }) as any;

describe('catalog layout resolution', () => {
    it('renders a usable layout for the featured front page', () => {
        expect(GetCatalogLayout(page('frontpage_featured'), () => undefined)).not.toBeNull();
    });

    it('shows an explicit unavailable state for an unknown server layout', () => {
        expect(GetCatalogLayout(page('future_layout'), () => undefined)?.type).toBe(CatalogLayoutUnavailableView);
    });

    it('uses the standard pet customization renderer instead of the generic furniture layout', () => {
        expect(GetCatalogLayout(page('petcustomization'), () => undefined)?.type).toBe(CatalogLayoutPetCustomizationView);
    });

    it('routes membership pages through the dedicated purchase renderer', () => {
        expect(GetCatalogLayout(page('club_buy'), () => undefined)?.type).toBe(CatalogLayoutVipBuyView);
    });

    it('routes the recycler through its dedicated functional layout', () => {
        expect(GetCatalogLayout(page('recycler'), () => undefined)?.type).toBe(CatalogLayoutRecyclerView);
    });
});
