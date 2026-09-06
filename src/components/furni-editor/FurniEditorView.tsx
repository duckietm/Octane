import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../common';
import { useHasPermission } from '../../hooks';
import { useFurniEditor } from '../../hooks/furni-editor';
import { FurniEditorEditView } from './views/FurniEditorEditView';
import { FurniEditorSearchView } from './views/FurniEditorSearchView';

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
        furniDataEntry,
        furniDataDiagnostic,
        interactions,
        searchItems,
        loadDetail,
        loadBySpriteId,
        updateItem,
        deleteItem,
        loadInteractions,
        updateFurnidata,
        revertFurnidata,
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
        <OctaneCardView uniqueKey="furni-editor" className="w-[620px] h-[520px]">
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
                    <FurniEditorSearchView items={items} total={total} page={page} loading={loading} onSearch={searchItems} onSelect={handleSelect} />
                )}

                {activeTab === TAB_EDIT && selectedItem && (
                    <FurniEditorEditView
                        item={selectedItem}
                        furniDataEntry={furniDataEntry}
                        furniDataDiagnostic={furniDataDiagnostic}
                        interactions={interactions}
                        loading={loading}
                        onUpdate={updateItem}
                        onDelete={deleteItem}
                        onBack={handleBack}
                        onUpdateFurnidata={updateFurnidata}
                        onRevertFurnidata={revertFurnidata}
                        onSyncPublicName={syncPublicName}
                        onImportText={importText}
                        importResult={importResult}
                    />
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
