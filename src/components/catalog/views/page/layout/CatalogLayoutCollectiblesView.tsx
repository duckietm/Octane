import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { GetConfigurationValue, localizeWithFallback, OpenUrl } from '../../../../../api';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { isCollectiblesEnabled } from '../../../../../hooks/collectibles/useCollectibles';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { CatalogLayoutInformationView } from './CatalogLayoutInformationView';

/**
 * The official `collectibles` page: an information page whose `ctlg_collectibles_link` opens
 * `link.format.collectibles`. With collectibles on, the link opens the hotel's own Collectors Guild hub.
 */
export const CatalogLayoutCollectiblesView: FC<CatalogLayoutProps> = (props) => {
    const enabled = isCollectiblesEnabled();
    const externalLink = GetConfigurationValue<string>('link.format.collectibles', '');

    return (
        <NativeTextTree>
            <div className="octane-catalog-collectibles-layout">
                <CatalogLayoutInformationView {...props} />
                {(enabled || !!externalLink) && (
                    <BaseButton
                        className="octane-collectibles-button is-green octane-catalog-collectibles-link"
                        data-testid="catalog-collectibles-link"
                        onClick={() => (enabled ? CreateLinkEvent('collectibles/open/shop') : OpenUrl(externalLink))}
                    >
                        {localizeWithFallback('catalog.collectibles.link', localizeWithFallback('collectibles.title', 'Collectibles'))}
                    </BaseButton>
                )}
            </div>
        </NativeTextTree>
    );
};
