import { CSSProperties, FC } from 'react';
import { GetConfigurationValue, handleInternalLinkClick, SanitizeHtmlWithInternalLinks } from '../../../../../api';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { CatalogLayoutProps } from './CatalogLayout.types';

/** Where AIR places the description html and the illustration of an info page (pixels in the 360 x 460 page). */
interface InfoIllustrationLayout {
    name: string;
    illustration: string;
    description: { x: number; y: number; width: number; height: number };
    image: { x: number; y: number; width: number; height: number };
}

/** AIR layout_info_loyalty_xml. */
const INFO_LOYALTY: InfoIllustrationLayout = {
    name: 'loyalty',
    illustration: 'catalogue/diamond_info_illustration.gif',
    description: { x: 24, y: 19, width: 226, height: 322 },
    image: { x: 237, y: 39, width: 123, height: 350 }
};

/** AIR layout_info_duckets_xml. */
const INFO_DUCKETS: InfoIllustrationLayout = {
    name: 'duckets',
    illustration: 'catalogue/duckets_info_illustration.gif',
    description: { x: 24, y: 19, width: 226, height: 420 },
    image: { x: 236, y: 10, width: 123, height: 360 }
};

/**
 * An AIR info page (360 x 460): the page description (`ctlg_description`) as html whose `event:` links open in the
 * client (link_target internal), and the layout's illustration from the image library, at their AIR positions. The
 * page header image is drawn above the page, as AIR's catalog header does.
 */
const CatalogLayoutInfoIllustrationView: FC<CatalogLayoutProps & { layout: InfoIllustrationLayout }> = (props) => {
    const { page = null, layout } = props;
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const { description, image } = layout;

    return (
        <NativeTextTree>
            <div className={`octane-catalog-layout-info-illustration is-${layout.name}`}>
                <div
                    className="octane-catalog-layout-info-illustration__description"
                    style={{ left: description.x, top: description.y, width: description.width, maxHeight: description.height } as CSSProperties}
                    onClick={handleInternalLinkClick}
                    dangerouslySetInnerHTML={{ __html: SanitizeHtmlWithInternalLinks(page?.localization?.getText(0) ?? '') }}
                />
                {!!imageLibraryUrl && (
                    <img
                        alt=""
                        draggable={false}
                        className="octane-catalog-layout-info-illustration__image"
                        style={{ left: image.x, top: image.y, maxWidth: image.width, maxHeight: image.height }}
                        src={`${imageLibraryUrl}${layout.illustration}`}
                    />
                )}
            </div>
        </NativeTextTree>
    );
};

export const CatalogLayoutInfoLoyaltyView: FC<CatalogLayoutProps> = (props) => <CatalogLayoutInfoIllustrationView {...props} layout={INFO_LOYALTY} />;

export const CatalogLayoutInfoDucketsView: FC<CatalogLayoutProps> = (props) => <CatalogLayoutInfoIllustrationView {...props} layout={INFO_DUCKETS} />;
