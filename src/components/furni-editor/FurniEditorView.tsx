import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../common';
import { useHasPermission } from '../../hooks';
import { useFurniEditor } from '../../hooks/furni-editor';
import { FurniEditorEditView } from './views/FurniEditorEditView';
import { FurniEditorSearchView } from './views/FurniEditorSearchView';
import { lineQueryFor } from './furniEditorSuggestions';

const TAB_SEARCH = 0;
const TAB_EDIT = 1;

export const FurniEditorView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [activeTab, setActiveTab] = useState(TAB_SEARCH);

    const {
        items,
        total,
        page,
        loading,
        error,
        clearError,
        selectedItem,
        setSelectedItem,
        catalogItems,
        furniDataEntry,
        furniDataDiagnostic,
        interactions,
        relatedItems,
        probeRelated,
        searchItems,
        loadDetail,
        loadBySpriteId,
        updateItem,
        deleteItem,
        loadInteractions,
        updateFurnidata,
        revertFurnidata,
        updateFurnidataStructure,
        syncPublicName,
        importText,
        importResult
    } = useFurniEditor();

    const isMod = useHasPermission('acc_catalogfurni');

    // Auto-switch to edit tab when an item is selected
    useEffect(() => {
        if (selectedItem) setActiveTab(TAB_EDIT);
    }, [selectedItem]);

    useEffect(() => {
        if (!isMod) return;

        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prev) => !prev);
                        return;
                }
            },
            eventUrlPrefix: 'furni-editor/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [isMod]);

    useEffect(() => {
        if (isVisible) loadInteractions();
    }, [isVisible]);

    // Escape to close
    useEffect(() => {
        if (!isVisible) return;

        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsVisible(false);
        };

        window.addEventListener('keydown', handler);

        return () => window.removeEventListener('keydown', handler);
    }, [isVisible]);

    useEffect(() => {
        if (!isMod) return;

        const handler = (e: CustomEvent<{ spriteId: number }>) => {
            const { spriteId } = e.detail;

            setIsVisible(true);
            loadBySpriteId(spriteId);
        };

        window.addEventListener('furni-editor:open', handler);

        return () => window.removeEventListener('furni-editor:open', handler);
    }, [isMod, loadBySpriteId]);

    // Every open furni gets a probe for its line: siblings and duplicates come from it.
    useEffect(() => {
        probeRelated(selectedItem ? lineQueryFor(selectedItem.itemName) : '');
    }, [selectedItem?.id, selectedItem?.itemName, probeRelated]);

    const handleSelect = useCallback(
        (id: number) => {
            loadDetail(id);
        },
        [loadDetail]
    );

    const handleBack = useCallback(() => {
        setSelectedItem(null);
        setActiveTab(TAB_SEARCH);
    }, [setSelectedItem]);

    const handleClose = useCallback(() => {
        setIsVisible(false);
    }, []);

    if (!isVisible || !isMod) return null;

    return (
        <OctaneCardView uniqueKey="furni-editor" className="w-[780px] h-[600px] min-w-[720px] min-h-[560px]">
            <OctaneCardHeaderView headerText="Furni Editor" onCloseClick={handleClose} />
            <OctaneCardTabsView>
                <OctaneCardTabsItemView isActive={activeTab === TAB_SEARCH} onClick={() => setActiveTab(TAB_SEARCH)}>
                    Search
                </OctaneCardTabsItemView>
                <OctaneCardTabsItemView isActive={activeTab === TAB_EDIT} onClick={() => selectedItem && setActiveTab(TAB_EDIT)}>
                    Edit
                </OctaneCardTabsItemView>
            </OctaneCardTabsView>
            <OctaneCardContentView>
                {error && (
                    <div className="bg-[#f8d7da] border border-[#f5c6cb] rounded p-2 text-[#721c24] text-xs mb-1 flex justify-between items-center">
                        <span>{error}</span>
                        <span className="cursor-pointer font-bold" onClick={clearError}>
                            x
                        </span>
                    </div>
                )}

                {activeTab === TAB_SEARCH && (
                    <FurniEditorSearchView
                        items={items}
                        total={total}
                        page={page}
                        loading={loading}
                        interactions={interactions}
                        onSearch={searchItems}
                        onSelect={handleSelect}
                    />
                )}

                {activeTab === TAB_EDIT && selectedItem && (
                    <FurniEditorEditView
                        item={selectedItem}
                        catalogItems={catalogItems}
                        furniDataEntry={furniDataEntry}
                        furniDataDiagnostic={furniDataDiagnostic}
                        interactions={interactions}
                        relatedItems={relatedItems}
                        loading={loading}
                        onUpdate={updateItem}
                        onDelete={deleteItem}
                        onBack={handleBack}
                        onUpdateFurnidata={updateFurnidata}
                        onRevertFurnidata={revertFurnidata}
                        onUpdateFurnidataStructure={updateFurnidataStructure}
                        onSyncPublicName={syncPublicName}
                        onImportText={importText}
                        importResult={importResult}
                    />
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
