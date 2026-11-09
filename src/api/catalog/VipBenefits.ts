import { CreateLinkEvent } from '@octane/renderer';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { OpenUrl } from '../octane/OpenUrl';

/** Link the VIP benefits window listens to (`VipBenefitsView`). */
export const VIP_BENEFITS_LINK = 'vip-benefits/show';

/**
 * AIR `CatalogUtils.showVipBenefits`: opens the vip_benefits window when `catalog.vip.benefits.enabled`
 * is set, otherwise the hotel's club page (`link.format.club`). AIR's flag defaults to off; here it
 * defaults to on, since Octane ships the window.
 */
export const ShowVipBenefits = (): void => {
    if (GetConfigurationValue<boolean>('catalog.vip.benefits.enabled', true) !== false) {
        CreateLinkEvent(VIP_BENEFITS_LINK);

        return;
    }

    OpenUrl(GetConfigurationValue<string>('link.format.club', ''));
};

/**
 * The vip.benefits texts are Flash html: `<font size="24">` sets a pixel size. The client's sanitizer drops
 * `font`, so the size moves to a span first.
 */
export const flashFontTagsToSpans = (html: string): string =>
    (html ?? '')
        .replace(/<font\b[^>]*?\bsize\s*=\s*["']?(\d{1,3})["']?[^>]*>/gi, '<span style="font-size: $1px">')
        .replace(/<font\b[^>]*>/gi, '<span>')
        .replace(/<\/font\s*>/gi, '</span>');
