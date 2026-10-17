import { FC, useMemo } from 'react';
import { GetConfigurationValue } from '../../../../api';

export interface CatalogIconViewProps {
    icon: number;
    className?: string;
}

export const CatalogIconView: FC<CatalogIconViewProps> = (props) => {
    const { icon = 0, className = '' } = props;

    const iconUrl = useMemo(() => {
        return GetConfigurationValue<string>('catalog.asset.icon.url').replace('%name%', icon.toString());
    }, [icon]);

    if (!iconUrl) return null;

    return <img src={iconUrl} alt="" className={`w-5 h-5 object-contain image-rendering-pixelated ${className}`} draggable={false} />;
};
