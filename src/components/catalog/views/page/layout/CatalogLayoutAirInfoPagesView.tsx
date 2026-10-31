import { FC } from 'react';
import { GetConfigurationValue, handleInternalLinkClick, LocalizeText, OpenUrl, SanitizeHtmlWithInternalLinks } from '../../../../../api';
import duckatIcon from '../../../../../assets/images/purse-swf/icons/2381_duckat_icon_0_png$7c0915a94ebd1a1746053f94976b8ba1-1879246012.png';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { useNotificationActions } from '../../../../../hooks';
import { CatalogLayoutProps } from './CatalogLayout.types';

/**
 * An image element of an AIR catalog layout: the page's own image (`getImage(index)`, the element AIR's
 * PageLocalization maps that index to) when the page sets one, otherwise the layout's static asset_uri.
 */
const pageImage = (page: CatalogLayoutProps['page'], index: number, libraryPath: string): string => {
    const own = page?.localization?.getImage(index);

    if (own) return own;

    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');

    return imageLibraryUrl ? `${imageLibraryUrl}${libraryPath}` : '';
};

const PageText: FC<{ html: string; className: string }> = ({ html, className }) => (
    <NativeTextTree>
        <div className={className} onClick={handleInternalLinkClick} dangerouslySetInnerHTML={{ __html: SanitizeHtmlWithInternalLinks(html ?? '') }} />
    </NativeTextTree>
);

const RENTABLE_RULES = [1, 2, 3, 4, 5];

/**
 * AIR layout_info_rentables_xml (360 x 460): a bordered list (17, 20, 328 x 425) of the five rules; each row
 * (306 x 47, every 50 px) has the duckat icon, the rule text (`ctlg_text_1`..`ctlg_text_5`, texts 1-5; text 0 is
 * the header description) and the rule's picture `rentables_rulepic<n>.gif`.
 */
export const CatalogLayoutInfoRentablesView: FC<CatalogLayoutProps> = ({ page }) => {
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const rules = RENTABLE_RULES.map((rule) => ({ rule, text: page?.localization?.getText(rule) ?? '' })).filter((rule) => !!rule.text);

    return (
        <NativeTextTree>
            <div className="octane-catalog-air-info is-rentables">
                <div className="octane-catalog-air-info__border">
                    <div className="octane-catalog-air-info__rules">
                        {rules.map(({ rule, text }) => (
                            <div key={rule} className="octane-catalog-air-info__rule">
                                <img alt="" draggable={false} className="octane-catalog-air-info__rule-icon" src={duckatIcon} />
                                <PageText className="octane-catalog-air-info__rule-text" html={text} />
                                {!!imageLibraryUrl && (
                                    <img
                                        alt=""
                                        draggable={false}
                                        className="octane-catalog-air-info__rule-pic"
                                        src={`${imageLibraryUrl}catalogue/rentables_rulepic${rule}.gif`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </NativeTextTree>
    );
};

/**
 * AIR layout_info_recycler_xml (360 x 460): in a bordered panel (10, 10, 340 x 440) the teaser image
 * (`ctlg_teaserimg_1`, image 1, else ctlg_ecotron_box.gif) at 20, 10, the headline (`ctlg_description`, text 1,
 * u_headline_medium) at 83, 26 and the text (`ctlg_special_txt`, text 2) at 15, 72.
 */
export const CatalogLayoutRecyclerInfoView: FC<CatalogLayoutProps> = ({ page }) => {
    const teaser = pageImage(page, 1, 'catalogue/ctlg_ecotron_box.gif');

    return (
        <NativeTextTree>
            <div className="octane-catalog-air-info is-recycler">
                <div className="octane-catalog-air-info__border">
                    {!!teaser && <img alt="" draggable={false} className="octane-catalog-air-info__recycler-teaser" src={teaser} />}
                    <PageText className="octane-catalog-air-info__recycler-title" html={page?.localization?.getText(1)} />
                    <PageText className="octane-catalog-air-info__recycler-text" html={page?.localization?.getText(2)} />
                </div>
            </div>
        </NativeTextTree>
    );
};

/**
 * AIR layout_monkey_xml (360 x 460): the teaser (`ctlg_teaserimg_1`, image 1) at 10, 20 (339 x 344) and the store
 * banner (`ctlg_special_img`, image 2) at 10, 375 (339 x 80). Both are links (AIR LAYOUT_LINKS): they open
 * `link.format.monkey` with the external link notice.
 */
export const CatalogLayoutMonkeyView: FC<CatalogLayoutProps> = ({ page }) => {
    const { simpleAlert } = useNotificationActions();
    const teaser = pageImage(page, 1, 'catalogue/catalog_monkey_teaser.gif');
    const special = pageImage(page, 2, 'catalogue/catalog_monkey_store2_en.gif');

    const openStore = () => {
        const link = LocalizeText('link.format.monkey');

        if (!link || link === 'link.format.monkey') return;

        simpleAlert(LocalizeText('catalog.alert.external.link.desc'), null, null, null, LocalizeText('catalog.alert.external.link.title'));
        OpenUrl(link);
    };

    return (
        <NativeTextTree>
            <div className="octane-catalog-air-info is-monkey">
                {!!teaser && (
                    <BaseButton className="octane-catalog-air-info__monkey-teaser" onClick={openStore}>
                        <img alt="" draggable={false} src={teaser} />
                    </BaseButton>
                )}
                {!!special && (
                    <BaseButton className="octane-catalog-air-info__monkey-special" onClick={openStore}>
                        <img alt="" draggable={false} src={special} />
                    </BaseButton>
                )}
            </div>
        </NativeTextTree>
    );
};
