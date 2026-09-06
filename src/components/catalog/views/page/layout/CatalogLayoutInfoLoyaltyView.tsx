import { FC } from 'react';
import { SanitizeHtml } from '../../../../../api';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutInfoLoyaltyView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;

    return (
        <div className="h-full octane-catalog-layout-info-loyalty text-black flex flex-row">
            <div className="overflow-auto h-full flex flex-col info-loyalty-content">
                <div dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(0)) }} />
            </div>
        </div>
    );
};
