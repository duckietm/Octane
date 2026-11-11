import { FC } from 'react';
import { ICatalogNode, SanitizeHtml } from '../../../../../api';
import { catalogCategoryChildren } from '../../../../../api/catalog/CatalogCategoryIndex';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { CatalogIconView } from '../../catalog-icon/CatalogIconView';

interface CatalogLayoutCategoryIndexViewProps {
    node: ICatalogNode;
    /** The page's own text (its teaser), shown above the index when it has one. */
    text?: string;
    onOpen: (node: ICatalogNode) => void;
}

/**
 * A heading page ("By type", "By design"): it sells nothing itself, so it lists its sub-pages, each with its icon,
 * and opens the one that is clicked. The official client gives such a node no page at all (clicking it only opens
 * the branch); a hotel whose heading has a page gets this index in place of an empty grid.
 */
export const CatalogLayoutCategoryIndexView: FC<CatalogLayoutCategoryIndexViewProps> = (props) => {
    const { node, text = '', onOpen } = props;
    const children = catalogCategoryChildren(node);
    const hasText = !!text.replace(/<[^>]*>/g, '').trim();

    return (
        <NativeTextTree>
            <div className="octane-catalog-category-index">
                {hasText && <div className="octane-catalog-category-index__text" dangerouslySetInnerHTML={{ __html: SanitizeHtml(text) }} />}
                <div className="octane-catalog-category-index__list" role="list">
                    {children.map((child) => (
                        <BaseButton
                            key={`${child.pageId}:${child.pageName}`}
                            className="octane-catalog-category-index__item"
                            role="listitem"
                            onClick={() => onOpen(child)}
                        >
                            <span className="octane-catalog-category-index__icon">
                                <CatalogIconView icon={child.iconId} />
                            </span>
                            <span className="octane-catalog-category-index__name">{child.localization}</span>
                        </BaseButton>
                    ))}
                </div>
            </div>
        </NativeTextTree>
    );
};
