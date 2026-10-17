import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
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
                    {index === activeNodes.length - 1 ? (
                        <span className="truncate font-semibold">{node.localization}</span>
                    ) : (
                        <BaseButton className="truncate cursor-pointer border-0 bg-transparent p-0 hover:underline" type="button" onClick={() => activateNode(node)}>
                            {node.localization}
                        </BaseButton>
                    )}
                </span>
            ))}
        </div>
    );
};
