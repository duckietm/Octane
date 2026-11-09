import { FC } from 'react';
import { GetConfigurationValue, handleInternalLinkClick, SanitizeHtmlWithInternalLinks } from '../../../../../api';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { CatalogLayoutProps } from './CatalogLayout.types';

/**
 * AIR layout_info_loyalty_xml (360 x 460): the page description (`ctlg_description`) as html at 24, 19 (226 x 322)
 * whose `event:` links open in the client (link_target internal), and the diamond illustration at 237, 39. The
 * page header image is drawn above the page, as AIR's catalog header does.
 */
export const CatalogLayoutInfoLoyaltyView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');

    return (
        <NativeTextTree>
            <div className="octane-catalog-layout-info-loyalty">
                <div
                    className="octane-catalog-layout-info-loyalty__description"
                    onClick={handleInternalLinkClick}
                    dangerouslySetInnerHTML={{ __html: SanitizeHtmlWithInternalLinks(page?.localization?.getText(0) ?? '') }}
                />
                {!!imageLibraryUrl && (
                    <img
                        alt=""
                        draggable={false}
                        className="octane-catalog-layout-info-loyalty__illustration"
                        src={`${imageLibraryUrl}catalogue/diamond_info_illustration.gif`}
                    />
                )}
            </div>
        </NativeTextTree>
    );
};
