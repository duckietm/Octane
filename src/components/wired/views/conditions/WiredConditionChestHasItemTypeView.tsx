import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { WiredFurniType, WiredSelectionVisualizer } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { FURNI_SOURCES, sortWiredSourceOptions, WiredSourceOption } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { chestAmountParams, IChestAmountState, isChestAmountValid, readChestAmountState, WiredConditionChestAmountSections } from './WiredConditionChestHasItemsView';

const SOURCE_SELECTED = 100;
const SOURCE_SECONDARY_SELECTED = 101;

/** The chests take the second pick list (source 101), as AIR's dual furni picking does. */
const CHEST_SOURCES: WiredSourceOption[] = sortWiredSourceOptions(
    [
        { value: 0, label: 'wiredfurni.params.sources.furni.0' },
        { value: SOURCE_SECONDARY_SELECTED, label: 'wiredfurni.params.sources.furni.101' },
        { value: 200, label: 'wiredfurni.params.sources.furni.200' },
        { value: 201, label: 'wiredfurni.params.sources.furni.201' }
    ],
    'furni'
);

type SelectionMode = 'types' | 'chests';

/**
 * Chest Has Item Types (46), AIR `class_4118` on ChestHasAmount: the same comparison and value-or-variable amount as
 * Chest Has Items, furni slot 0 the item types (first picks, `sources.furni.title.item_types`) and slot 1 the chests
 * (second picks, `sources.furni.title.chests`).
 */
export const WiredConditionChestHasItemTypeView: FC<{}> = () => {
    const { trigger = null, furniIds = [], setFurniIds, setFurniIds2, setIntParams, setStringParam, setVariableIds, setSourceTypes, setAllowsFurni } = useWired();
    const [state, setState] = useState<IChestAmountState>(() => readChestAmountState([], [], ''));
    const [literalValid, setLiteralValid] = useState(true);
    const [typeSource, setTypeSource] = useState(SOURCE_SELECTED);
    const [chestSource, setChestSource] = useState(SOURCE_SECONDARY_SELECTED);
    const [typeIds, setTypeIds] = useState<number[]>([]);
    const [chestIds, setChestIds] = useState<number[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('types');
    const highlightedIds = useRef<number[]>([]);

    const syncHighlights = useCallback((nextTypeIds: number[], nextChestIds: number[]) => {
        if (highlightedIds.current.length) {
            WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlightedIds.current);
            WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlightedIds.current);
        }

        const chestSet = new Set(nextChestIds);
        const typeOnlyIds = nextTypeIds.filter((id) => !chestSet.has(id));

        if (typeOnlyIds.length) WiredSelectionVisualizer.applySelectionShaderToFurni(typeOnlyIds);
        if (nextChestIds.length) WiredSelectionVisualizer.applySecondarySelectionShaderToFurni(nextChestIds);

        highlightedIds.current = Array.from(new Set([...nextTypeIds, ...nextChestIds]));
    }, []);

    const switchSelection = useCallback(
        (next: SelectionMode) => {
            if (next === 'types' && typeSource !== SOURCE_SELECTED) return;
            if (next === 'chests' && chestSource !== SOURCE_SECONDARY_SELECTED) return;

            const nextTypeIds = selectionMode === 'types' ? [...furniIds] : [...typeIds];
            const nextChestIds = selectionMode === 'chests' ? [...furniIds] : [...chestIds];

            setTypeIds(nextTypeIds);
            setChestIds(nextChestIds);
            setSelectionMode(next);
            setFurniIds([...(next === 'types' ? nextTypeIds : nextChestIds)]);
        },
        [selectionMode, furniIds, typeSource, chestSource, typeIds, chestIds, setFurniIds]
    );

    useEffect(() => {
        if (!trigger) return;

        const slots = trigger.furniSourceTypes ?? [];
        const nextTypeIds = [...(trigger.selectedItems ?? [])];
        const nextChestIds = [...(trigger.selectedItems2 ?? [])];

        setState(readChestAmountState(trigger.intData ?? [], trigger.variableIds, trigger.stringData ?? ''));
        setTypeSource(slots.length >= 1 ? slots[0] : SOURCE_SELECTED);
        setChestSource(slots.length >= 2 ? (slots[1] === SOURCE_SELECTED ? SOURCE_SECONDARY_SELECTED : slots[1]) : SOURCE_SECONDARY_SELECTED);
        setTypeIds(nextTypeIds);
        setChestIds(nextChestIds);
        setSelectionMode('types');
        setFurniIds([...nextTypeIds]);
    }, [trigger, setFurniIds]);

    useEffect(() => {
        if (selectionMode === 'types') setTypeIds(furniIds);
        else setChestIds(furniIds);
    }, [furniIds, selectionMode]);

    useEffect(() => {
        syncHighlights(typeIds, chestIds);
    }, [typeIds, chestIds, syncHighlights]);

    useEffect(() => {
        const canEditTypes = typeSource === SOURCE_SELECTED;
        const canEditChests = chestSource === SOURCE_SECONDARY_SELECTED;

        if (selectionMode === 'types' && !canEditTypes && canEditChests) {
            switchSelection('chests');
            return;
        }

        if (selectionMode === 'chests' && !canEditChests && canEditTypes) {
            switchSelection('types');
            return;
        }

        const canEditCurrent = selectionMode === 'types' ? canEditTypes : canEditChests;

        setAllowsFurni(canEditCurrent ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE);
    }, [selectionMode, typeSource, chestSource, switchSelection, setAllowsFurni]);

    useEffect(() => {
        return () => {
            if (!highlightedIds.current.length) return;

            WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlightedIds.current);
            WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlightedIds.current);
            highlightedIds.current = [];
        };
    }, []);

    const save = () => {
        const nextTypeIds = selectionMode === 'types' ? [...furniIds] : [...typeIds];
        const nextChestIds = selectionMode === 'chests' ? [...furniIds] : [...chestIds];
        const { intParams, variableIds } = chestAmountParams(state);

        setTypeIds(nextTypeIds);
        setChestIds(nextChestIds);

        if (selectionMode === 'chests') {
            setSelectionMode('types');
            setFurniIds([...nextTypeIds]);
        }

        setIntParams(intParams);
        setStringParam('');
        setVariableIds(variableIds);
        setSourceTypes({ furni: [typeSource, chestSource], users: [] });
        setFurniIds2(chestSource === SOURCE_SECONDARY_SELECTED ? nextChestIds.filter((id) => id > 0) : []);
    };

    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
                save={save}
                validate={() => isChestAmountValid(state, literalValid)}
                showSelection={false}
                footer={
                    <div className="flex flex-col gap-2">
                        <WiredFurniSelectionSourceRow
                            title="wiredfurni.params.sources.furni.title.item_types"
                            options={FURNI_SOURCES}
                            value={typeSource}
                            selectionKind="primary"
                            selectionActive={selectionMode === 'types'}
                            selectionCount={typeIds.length}
                            selectionLimit={selectionLimit}
                            selectionEnabledValues={[SOURCE_SELECTED]}
                            onChange={setTypeSource}
                            onSelectionActivate={() => switchSelection('types')}
                        />
                        <WiredFurniSelectionSourceRow
                            title="wiredfurni.params.sources.furni.title.chests"
                            options={CHEST_SOURCES}
                            value={chestSource}
                            selectionKind="secondary"
                            selectionActive={selectionMode === 'chests'}
                            selectionCount={chestIds.length}
                            selectionLimit={selectionLimit}
                            selectionEnabledValues={[SOURCE_SECONDARY_SELECTED]}
                            onChange={(value) => setChestSource(value === SOURCE_SELECTED ? SOURCE_SECONDARY_SELECTED : value)}
                            onSelectionActivate={() => switchSelection('chests')}
                        />
                    </div>
                }
            >
                <WiredConditionChestAmountSections state={state} onChange={setState} onValidityChange={setLiteralValid} />
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
