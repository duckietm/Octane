import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { handleInternalLinkClick, LocalizeText, SanitizeHtmlWithInternalLinks } from '../../../../../api';
import { Button } from '../../../../../common/Button';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { CatalogLayoutProps } from './CatalogLayout.types';

/**
 * AIR layout_guild_frontpage_xml, in AIR's order but stretched over the whole catalog page: the title
 * (`ctlg_special_txt`, text 2, u_headline_medium), the description (`ctlg_description`, text 1), the start-a-guild button
 * (BuyGuildWidget, 213 x 28) and the teaser image (`ctlg_teaserimg_1`, image 1) at the bottom. Text 0 is the header
 * description.
 */
export const CatalogLayouGuildFrontpageView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const teaser = page?.localization?.getImage(1);

    return (
        <NativeTextTree>
            <div className="octane-catalog-air-info is-guild-frontpage">
                <div
                    className="octane-catalog-air-info__guild-title"
                    onClick={handleInternalLinkClick}
                    dangerouslySetInnerHTML={{ __html: SanitizeHtmlWithInternalLinks(page?.localization?.getText(2) ?? '') }}
                />
                <div
                    className="octane-catalog-air-info__guild-text"
                    onClick={handleInternalLinkClick}
                    dangerouslySetInnerHTML={{ __html: SanitizeHtmlWithInternalLinks(page?.localization?.getText(1) ?? '') }}
                />
                <Button classNames={['octane-catalog-air-info__guild-buy']} onClick={() => CreateLinkEvent('groups/create')}>
                    {LocalizeText('catalog.start.guild.purchase.button')}
                </Button>
                {!!teaser && <img alt="" draggable={false} className="octane-catalog-air-info__guild-teaser" src={teaser} />}
            </div>
        </NativeTextTree>
    );
};
