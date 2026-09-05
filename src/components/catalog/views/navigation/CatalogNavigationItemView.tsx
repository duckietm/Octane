import { FC, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { FaArrowsAlt, FaCaretDown, FaCaretUp, FaPlus, FaTrash } from 'react-icons/fa';
import { ICatalogNode, LocalizeText } from '../../../../api';
import { CatalogIconView } from '../catalog-icon/CatalogIconView';
import { CatalogNavigationRuntime } from './CatalogNavigationRuntime';
import { CatalogNavigationSetView } from './CatalogNavigationSetView';

export interface CatalogNavigationItemViewProps {
    node: ICatalogNode;
    runtime: CatalogNavigationRuntime;
    child?: boolean;
}

export const CatalogNavigationItemView: FC<CatalogNavigationItemViewProps> = (props) => {
    const { node = null, runtime, child = false } = props;
    const { activateNode, adminMode, createSubpage, deletePage, reorderPage } = runtime;
    const [isDragOver, setIsDragOver] = useState(false);
    const dragRef = useRef<HTMLDivElement>(null);
    // Strip only technical technical suffixes; labels such as
    // "Flags (Wall)" or "Forest (Blue)" are meaningful catalog names.
    const swfLabel = (node?.localization || '').replace(/\s*\((?:BC|Hot)\)\s*$/i, '').trim();

    const handleDragStart = useCallback(
        (e: React.DragEvent) => {
            if (!adminMode) return;

            e.dataTransfer.setData('text/plain', JSON.stringify({ pageId: node.pageId, parentId: node.parent?.pageId ?? -1 }));
            e.dataTransfer.effectAllowed = 'move';
        },
        [adminMode, node]
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            if (!adminMode) return;

            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setIsDragOver(true);
        },
        [adminMode]
    );

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            if (!adminMode) return;

            e.preventDefault();
            setIsDragOver(false);

            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));

                if (data.pageId && data.pageId !== node.pageId) {
                    // Drop onto a branch = reparent under this node
                    // Drop onto a leaf = reorder as sibling
                    const targetParentId = node.isBranch ? node.pageId : (node.parent?.pageId ?? -1);
                    const targetIndex = node.isBranch ? 0 : (node.parent?.children?.indexOf(node) ?? 0);

                    reorderPage(data.pageId, targetParentId, targetIndex);
                }
            } catch (err) {
                // Invalid drag data
            }
        },
        [adminMode, node, reorderPage]
    );

    useEffect(() => {
        if (!node?.isActive || !dragRef.current?.scrollIntoView) return;

        dragRef.current.scrollIntoView({ block: 'nearest' });
    }, [node?.isActive]);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;

            event.preventDefault();
            activateNode(node);
        },
        [activateNode, node]
    );

    return (
        <div className={`octane-catalog-navigation-node ${child ? 'is-child' : ''}`}>
            <div
                ref={dragRef}
                className={`octane-catalog-navigation-item group/nav ${node.isActive ? 'is-active' : ''} ${node.isBranch ? 'is-branch' : 'is-leaf'} ${node.isOpen ? 'is-open' : ''} ${isDragOver ? 'is-drag-over' : ''}`}
                draggable={adminMode}
                role="treeitem"
                tabIndex={0}
                aria-expanded={node.isBranch ? node.isOpen : undefined}
                aria-level={(node.depth ?? 0) + 1}
                aria-selected={node.isActive}
                onClick={() => activateNode(node)}
                onKeyDown={handleKeyDown}
                onDragLeave={adminMode ? handleDragLeave : undefined}
                onDragOver={adminMode ? handleDragOver : undefined}
                onDragStart={adminMode ? handleDragStart : undefined}
                onDrop={adminMode ? handleDrop : undefined}
            >
                {adminMode && (
                    <FaArrowsAlt className="octane-catalog-navigation-drag text-[7px] text-muted cursor-grab shrink-0 opacity-0 group-hover/nav:opacity-60" />
                )}
                <div className="octane-catalog-navigation-icon">
                    <CatalogIconView icon={node.iconId} />
                </div>
                <span className="octane-catalog-navigation-label" title={adminMode ? `Page ID: ${node.pageId}` : undefined}>
                    {swfLabel}
                </span>
                {adminMode && (
                    <div className="octane-catalog-navigation-admin flex items-center gap-1 opacity-0 group-hover/nav:opacity-100 transition-opacity">
                        <FaPlus
                            className="text-[8px] text-success hover:text-green-800"
                            title={LocalizeText('catalog.admin.create.subpage')}
                            onClick={(e) => {
                                e.stopPropagation();
                                createSubpage(node);
                            }}
                        />
                        <FaTrash
                            className="text-[8px] text-danger hover:text-red-700"
                            title={LocalizeText('catalog.admin.delete.page')}
                            onClick={(e) => {
                                e.stopPropagation();
                                deletePage(node);
                            }}
                        />
                    </div>
                )}
                {node.isBranch && (
                    <span className="octane-catalog-navigation-caret text-[9px] text-muted shrink-0">{node.isOpen ? <FaCaretUp /> : <FaCaretDown />}</span>
                )}
            </div>
            {node.isOpen && node.isBranch && <CatalogNavigationSetView child={true} node={node} runtime={runtime} />}
        </div>
    );
};
