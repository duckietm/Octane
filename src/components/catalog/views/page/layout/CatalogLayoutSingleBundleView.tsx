import { FC } from 'react';
import { GetConfigurationValue, GetProductIconUrl, handleInternalLinkClick, SanitizeHtmlWithInternalLinks } from '../../../../../api';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { useCatalogData } from '../../../../../hooks';
import { CatalogAddOnBadgeWidgetView } from '../widgets/CatalogAddOnBadgeWidgetView';
import { CatalogAddOnChatStyleWidgetView } from '../widgets/CatalogAddOnChatStyleWidgetView';
import { CatalogBundleGridWidgetView } from '../widgets/CatalogBundleGridWidgetView';
import { CatalogFirstProductSelectorWidgetView } from '../widgets/CatalogFirstProductSelectorWidgetView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogSimplePriceWidgetView } from '../widgets/CatalogSimplePriceWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

const PageHtml: FC<{ html: string; className: string }> = ({ html, className }) =>
    html ? <div className={className} onClick={handleInternalLinkClick} dangerouslySetInnerHTML={{ __html: SanitizeHtmlWithInternalLinks(html) }} /> : null;

/**
 * AIR layout_single_bundle_xml, in AIR's arrangement but stretched over the whole catalog page: the description
 * (`ctlg_description`, text 1) on top, the teaser image (`ctlg_teaserimg_1`, image 1, else small_movie_roomteaser.gif)
 * on the left with the add-on badge and the main product with its price on it, the special text (`ctlg_special_txt`,
 * text 2) over the bundle grid on the right, the box with the special image (image 2) and `ctlg_text_1` (text 3), and
 * the purchase row. Text 0 is the header description.
 */
export const CatalogLayoutSingleBundleView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null } = useCatalogData();
    const localization = page?.localization;
    const mainProduct = currentOffer?.product ?? null;
    const mainIconUrl = mainProduct ? GetProductIconUrl(mainProduct, currentOffer) : null;
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const teaser = localization?.getImage(1) || (imageLibraryUrl ? `${imageLibraryUrl}catalogue/small_movie_roomteaser.gif` : '');
    const specialImage = localization?.getImage(2);
    const footerText = localization?.getText(3) ?? '';

    return (
        <NativeTextTree>
            <div className="octane-catalog-air-bundle">
                <CatalogFirstProductSelectorWidgetView />
                <PageHtml className="octane-catalog-air-bundle__description" html={localization?.getText(1) ?? ''} />
                <PageHtml className="octane-catalog-air-bundle__special" html={localization?.getText(2) ?? ''} />
                {!!teaser && <img alt="" draggable={false} className="octane-catalog-air-bundle__teaser" src={teaser} />}
                <div className="octane-catalog-air-bundle__addon">
                    <CatalogAddOnBadgeWidgetView />
                    <CatalogAddOnChatStyleWidgetView />
                </div>
                {!!currentOffer && (
                    <div className="octane-catalog-air-bundle__price">
                        {mainIconUrl && <img alt="" draggable={false} src={mainIconUrl} />}
                        <CatalogSimplePriceWidgetView />
                    </div>
                )}
                <div className="octane-catalog-air-bundle__grid">
                    <CatalogBundleGridWidgetView hideBadges fullWidth className="octane-catalog-air-bundle__items" columnCount={4} />
                </div>
                {(!!specialImage || !!footerText) && (
                    <div className="octane-catalog-air-bundle__footer">
                        {!!specialImage && <img alt="" draggable={false} src={specialImage} />}
                        <PageHtml className="octane-catalog-air-bundle__footer-text" html={footerText} />
                    </div>
                )}
                <div className="octane-catalog-air-bundle__purchase">
                    <CatalogPurchaseWidgetView />
                </div>
            </div>
        </NativeTextTree>
    );
};
