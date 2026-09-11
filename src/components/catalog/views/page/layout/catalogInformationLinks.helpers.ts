/**
 * Clickable teaser regions of the official information layouts.
 *
 * PageLocalization.LAYOUT_LINKS maps `monkey` and `niko` to the regions wrapping
 * `ctlg_teaserimg_1` and `ctlg_special_img`, which are image slots 1 and 2 of
 * PageLocalization.DEFAULT_IMAGE_FIELDS. LocalizationCatalogWidget.onClickLink opens
 * the store link of the app (`link.format.<layout>`) with a hard-coded fallback.
 */
export interface ICatalogInformationLink {
    localizationKey: string;
    fallbackUrl: string;
}

const TEASER_IMAGE_INDEXES: readonly number[] = [1, 2];

const LAYOUT_LINKS: Record<string, ICatalogInformationLink> = {
    monkey: { localizationKey: 'link.format.monkey', fallbackUrl: 'http://store.apple.com/' },
    niko: { localizationKey: 'link.format.niko', fallbackUrl: 'http://itunes.apple.com/us/app/niko/id481670205?mt=8' }
};

export const getCatalogInformationImageLink = (layoutCode: string, imageIndex: number): ICatalogInformationLink | null => {
    if (!layoutCode || !TEASER_IMAGE_INDEXES.includes(imageIndex)) return null;

    return LAYOUT_LINKS[layoutCode] ?? null;
};
