import { FC } from 'react';
import { ICatalogNode } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { CatalogIconView } from '../catalog-icon/CatalogIconView';

interface CatalogRailItemViewProps {
    node: ICatalogNode;
    isActive: boolean;
    onClick: () => void;
}

export const CatalogRailItemView: FC<CatalogRailItemViewProps> = (props) => {
    const { node, isActive, onClick } = props;

    return (
        <BaseButton
            aria-pressed={isActive}
            type="button"
            className={`flex w-full items-center gap-2 px-1.5 py-1.5 rounded-lg cursor-pointer transition-all duration-150 shrink-0 ${isActive ? 'bg-white shadow-catalog-card ring-1 ring-catalog-accent/30' : 'hover:bg-white/60'}`}
            title={node.localization}
            onClick={onClick}
        >
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <CatalogIconView icon={node.iconId} className="w-6 h-6" />
            </div>
            <span
                className={`text-[11px] font-medium whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-200 truncate ${isActive ? 'text-catalog-accent' : 'text-catalog-text'}`}
            >
                {node.localization}
            </span>
        </BaseButton>
    );
};
