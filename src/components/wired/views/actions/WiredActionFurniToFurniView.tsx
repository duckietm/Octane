import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { WiredFurniType, WiredSelectionVisualizer } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { FURNI_SOURCES, sortWiredSourceOptions, WiredSourceOption } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const SOURCE_TRIGGER = 0;
const SOURCE_SELECTED = 100;
const SOURCE_SECONDARY_SELECTED = 101;

const TARGET_FURNI_SOURCES: WiredSourceOption[] = sortWiredSourceOptions(
    [
        { value: 0, label: 'wiredfurni.params.sources.furni.0' },
        { value: SOURCE_SECONDARY_SELECTED, label: 'wiredfurni.params.sources.furni.101' },
        { value: 200, label: 'wiredfurni.params.sources.furni.200' },
        { value: 201, label: 'wiredfurni.params.sources.furni.201' }
    ],
    'furni'
);

type SelectionMode = 'move' | 'target';

const parseIds = (data: string): number[] => {
    if (!data || !data.length) return [];

    const ids = new Set<number>();

    for (const part of data.split(/[;,\t]/)) {
        const trimmed = part.trim();
        if (!trimmed.length) continue;

        const value = parseInt(trimmed, 10);
        if (!isNaN(value) && value > 0) ids.add(value);
    }

    return Array.from(ids);
};

export const WiredActionFurniToFurniView: FC<{}> = () => {
    const [moveSource, setMoveSource] = useState<number>(SOURCE_TRIGGER);
    const [targetSource, setTargetSource] = useState<number>(SOURCE_TRIGGER);
    const [moveFurniIds, setMoveFurniIds] = useState<number[]>([]);
    const [targetFurniIds, setTargetFurniIds] = useState<number[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('move');

    const highlightedIds = useRef<number[]>([]);

    const { trigger = null, furniIds = [], setFurniIds, setFurniIds2, setIntParams, setStringParam, setSourceTypes, setAllowsFurni } = useWired();

    // AIR tints by pick list: the furni to move (stuffIds) the first tint, the targets (stuffIds2) the blue one.
    const syncHighlights = useCallback((nextMoveIds: number[], nextTargetIds: number[]) => {
        highlightedIds.current = WiredSelectionVisualizer.showPickLists(highlightedIds.current, nextMoveIds, nextTargetIds);
    }, []);

    const switchSelection = useCallback(
        (mode: SelectionMode) => {
            const canEditMove = moveSource === SOURCE_SELECTED;
            const canEditTarget = targetSource === SOURCE_SECONDARY_SELECTED;

            if (mode === 'move' && !canEditMove) return;
            if (mode === 'target' && !canEditTarget) return;

            const nextMoveIds = selectionMode === 'move' ? [...furniIds] : [...moveFurniIds];
            const nextTargetIds = selectionMode === 'target' ? [...furniIds] : [...targetFurniIds];

            setMoveFurniIds(nextMoveIds);
            setTargetFurniIds(nextTargetIds);
            setSelectionMode(mode);
            setFurniIds([...(mode === 'move' ? nextMoveIds : nextTargetIds)]);
        },
        [selectionMode, furniIds, moveSource, targetSource, moveFurniIds, targetFurniIds, setFurniIds]
    );

    useEffect(() => {
        if (!trigger) return;

        // Official: no int params. Furni source slot 0 is the furni to move, slot 1 the target, whose
        // picks are the second pick list (stuffIds2); a box from an older server sent them as text.
        const nextMoveIds = trigger.selectedItems ?? [];
        const nextTargetIds = trigger.selectedItems2?.length ? [...trigger.selectedItems2] : parseIds(trigger.stringData);
        const slots = trigger.furniSourceTypes ?? [];
        const nextMoveSource = slots.length >= 1 ? slots[0] : nextMoveIds.length ? SOURCE_SELECTED : SOURCE_TRIGGER;
        const nextTargetSourceRaw = slots.length >= 2 ? slots[1] : nextTargetIds.length ? SOURCE_SECONDARY_SELECTED : SOURCE_TRIGGER;
        const nextTargetSource = nextTargetSourceRaw === SOURCE_SELECTED ? SOURCE_SECONDARY_SELECTED : nextTargetSourceRaw;

        setMoveSource(nextMoveSource);
        setTargetSource(nextTargetSource);
        setMoveFurniIds(nextMoveIds);
        setTargetFurniIds(nextTargetIds);
        setSelectionMode('move');
        setFurniIds([...nextMoveIds]);
    }, [trigger, setFurniIds]);

    useEffect(() => {
        if (selectionMode === 'move') setMoveFurniIds(furniIds);
        else setTargetFurniIds(furniIds);
    }, [furniIds, selectionMode]);

    useEffect(() => {
        syncHighlights(moveFurniIds, targetFurniIds);
    }, [moveFurniIds, targetFurniIds, syncHighlights]);

    useEffect(() => {
        WiredSelectionVisualizer.setEditingPickList(selectionMode === 'target' ? 2 : 1);
    }, [selectionMode]);

    useEffect(() => {
        const canEditMove = moveSource === SOURCE_SELECTED;
        const canEditTarget = targetSource === SOURCE_SECONDARY_SELECTED;

        if (selectionMode === 'move' && !canEditMove && canEditTarget) {
            switchSelection('target');
            return;
        }

        if (selectionMode === 'target' && !canEditTarget && canEditMove) {
            switchSelection('move');
            return;
        }

        const canEditCurrent = selectionMode === 'move' ? canEditMove : canEditTarget;
        setAllowsFurni(canEditCurrent ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE);
    }, [selectionMode, moveSource, targetSource, switchSelection, setAllowsFurni]);

    useEffect(() => {
        return () => {
            WiredSelectionVisualizer.setEditingPickList(1);

            if (!highlightedIds.current.length) return;

            WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlightedIds.current);
            WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlightedIds.current);
            highlightedIds.current = [];
        };
    }, []);

    const save = useCallback(() => {
        const nextMoveIds = selectionMode === 'move' ? [...furniIds] : [...moveFurniIds];
        const nextTargetIds = selectionMode === 'target' ? [...furniIds] : [...targetFurniIds];

        setMoveFurniIds(nextMoveIds);
        setTargetFurniIds(nextTargetIds);

        if (selectionMode === 'target') {
            setSelectionMode('move');
            setFurniIds([...nextMoveIds]);
        }

        setIntParams([]);
        setStringParam('');
        setSourceTypes({ furni: [moveSource, targetSource === SOURCE_SECONDARY_SELECTED ? SOURCE_SELECTED : targetSource], users: [] });
        setFurniIds2(targetSource === SOURCE_SECONDARY_SELECTED ? nextTargetIds.filter((id) => id > 0) : []);
    }, [selectionMode, furniIds, moveFurniIds, moveSource, targetSource, targetFurniIds, setFurniIds, setFurniIds2, setIntParams, setStringParam, setSourceTypes]);

    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;

    return (
        <NativeTextTree>
            <WiredActionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
                save={save}
                selectionPreview={
                    <div className="flex flex-col gap-2">
                        <WiredFurniSelectionSourceRow
                            title="wiredfurni.params.sources.furni.title.mv.0"
                            options={FURNI_SOURCES}
                            value={moveSource}
                            selectionKind="primary"
                            selectionActive={selectionMode === 'move'}
                            selectionCount={moveFurniIds.length}
                            selectionLimit={selectionLimit}
                            selectionEnabledValues={[SOURCE_SELECTED]}
                            onChange={setMoveSource}
                            onSelectionActivate={() => switchSelection('move')}
                        />
                        <WiredFurniSelectionSourceRow
                            title="wiredfurni.params.sources.furni.title.mv.1"
                            options={TARGET_FURNI_SOURCES}
                            value={targetSource}
                            selectionKind="secondary"
                            selectionActive={selectionMode === 'target'}
                            selectionCount={targetFurniIds.length}
                            selectionLimit={selectionLimit}
                            selectionEnabledValues={[SOURCE_SECONDARY_SELECTED]}
                            onChange={(value) => setTargetSource(value === SOURCE_SELECTED ? SOURCE_SECONDARY_SELECTED : value)}
                            onSelectionActivate={() => switchSelection('target')}
                        />
                    </div>
                }
            />
        </NativeTextTree>
    );
};
