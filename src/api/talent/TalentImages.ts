/** The file name (without `.png`) of a talent picture, from its image library URL. */
export const talentImageName = (url: string): string => {
    const match = /talent\/([^/?#]+)\.png(?:[?#].*)?$/.exec(url ?? '');

    return match ? match[1] : '';
};

/** The furni icon of a reward product whose own picture is missing: the product code is the furni's class name. */
export const talentProductIconUrl = (iconUrlTemplate: string, productCode: string): string => {
    const className = (productCode ?? '').trim();

    if (!iconUrlTemplate || !className) return '';

    return iconUrlTemplate.replace('%libname%', className).replace('%param%', '');
};

/**
 * Where a talent picture is looked for, in order: the hotel's image library (its own pictures win), the copy that
 * ships with the client, then any further source (a reward product's furni icon). Empty and repeated sources drop out.
 */
export const talentImageSources = (libraryUrl: string, bundled: Readonly<Record<string, string>>, ...further: string[]): string[] => {
    const sources = [libraryUrl, bundled?.[talentImageName(libraryUrl)] ?? '', ...further];

    return sources.filter((source, index) => !!source && sources.indexOf(source) === index);
};
