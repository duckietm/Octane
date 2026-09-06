import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { useCatalogActions, useCatalogUiState } from '../../../../hooks';

export const CatalogBreadcrumbView: FC<{}> = () => {
    const { activeNodes = [] } = useCatalogUiState();
    const { activateNode } = useCatalogActions();

    if (!activeNodes || activeNodes.length === 0) {
        return (
            <div className="octane-catalog-breadcrumb">
                <span>{LocalizeText('catalog.title')}</span>
            </div>
        );
    }

    return (
        <div className="octane-catalog-breadcrumb">
            {activeNodes.map((node, index) => (
                <span key={node.pageId} className="octane-catalog-breadcrumb-segment">
                    <span className="octane-catalog-breadcrumb-separator">&rsaquo;</span>
                    <span
                        className={`truncate ${index === activeNodes.length - 1 ? 'font-semibold' : 'cursor-pointer hover:underline'}`}
                        onClick={index < activeNodes.length - 1 ? () => activateNode(node) : undefined}
                    >
                        {node.localization}
                    </span>
                </span>
            ))}
        </div>
    );
};
