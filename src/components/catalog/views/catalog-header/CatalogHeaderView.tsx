import { FC } from 'react';
import { GetConfigurationValue } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export interface CatalogHeaderViewProps {
    imageUrl?: string;
}

export const CatalogHeaderView: FC<CatalogHeaderViewProps> = (props) => {
    const { imageUrl = null } = props;
    const displayImageUrl = imageUrl ?? GetConfigurationValue<string>('catalog.asset.image.url').replace('%name%', 'catalog_header_roombuilder');

    return (
        <NativeTextTree>
            <div className="flex justify-center items-center w-full octane-catalog-header">
                <img
                    alt=""
                    src={displayImageUrl}
                    onError={({ currentTarget }) => {
                        currentTarget.src = GetConfigurationValue<string>('catalog.asset.image.url').replace('%name%', 'catalog_header_roombuilder');
                    }}
                />
            </div>
        </NativeTextTree>
    );
};
