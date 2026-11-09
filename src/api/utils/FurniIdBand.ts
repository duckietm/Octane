/** Official furni id bands (habbo/utils FurniId): temporary (Wired) copies, then Builders Club up to the int maximum. */
export const TEMPORARY_FURNI_ID_MIN = 2147401728;
export const TEMPORARY_FURNI_ID_MAX = 2147418111;
export const BUILDERS_CLUB_FURNI_ID_MIN = 2147418112;

export const IsTemporaryFurniId = (id: number): boolean => id >= TEMPORARY_FURNI_ID_MIN && id <= TEMPORARY_FURNI_ID_MAX;

export const IsBuildersClubFurniId = (id: number): boolean => id >= BUILDERS_CLUB_FURNI_ID_MIN;
