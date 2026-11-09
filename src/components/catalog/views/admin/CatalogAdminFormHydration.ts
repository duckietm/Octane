export interface ICatalogAdminHydrationClaim {
    current: string | null;
}

export const claimCatalogAdminHydration = (claim: ICatalogAdminHydrationClaim, key: string | null): boolean => {
    if (!key) {
        claim.current = null;
        return false;
    }

    if (claim.current === key) return false;

    claim.current = key;
    return true;
};
