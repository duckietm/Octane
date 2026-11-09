import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { WiredFurniType, WiredSelectionVisualizer } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { FURNI_SOURCES, sortWiredSourceOptions, WiredSourceOption } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const SOURCE_TRIGGER = 0;
const SOURCE_SELECTED = 100;
const SOURCE_SECONDARY_SELECTED = 101;

const MATCH_FURNI_SOURCES: WiredSourceOption[] = sortWiredSourceOptions(
    [...FURNI_SOURCES, { value: SOURCE_SECONDARY_SELECTED, label: 'wiredfurni.params.sources.furni.101' }],
    'furni'
);

type SelectionMode = 'primary' | 'secondary';

export const WiredConditionFurniIsOfTypeView: FC = () => {
    const [matchSource, setMatchSource] = useState<number>(SOURCE_TRIGGER);
    const [compareSource, setCompareSource] = useState<number>(SOURCE_TRIGGER);
    const [primaryFurniIds, setPrimaryFurniIds] = useState<number[]>([]);
    const [secondaryFurniIds, setSecondaryFurniIds] = useState<number[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('primary');

    const highlightedIds = useRef<number[]>([]);

    // Official StuffTypeMatches: no int params, the furni checked and the furni whose types they must have in the
    // two source slots; source 100 is the picks (stuffIds), 101 the other picks (stuffIds2). The quantifier is the
    // base view's.
    const { trigger = null, furniIds = [], setFurniIds, setFurniIds2, setIntParams, setStringParam, setAllowsFurni, setSourceTypes } = useWired();

    // AIR tints by pick list: the picks (stuffIds) the first tint, the other picks (stuffIds2) the blue one.
    const syncHighlights = useCallback((nextPrimaryIds: number[], nextSecondaryIds: number[]) => {
        highlightedIds.current = WiredSelectionVisualizer.showPickLists(highlightedIds.current, nextPrimaryIds, nextSecondaryIds);
    }, []);

    const switchSelection = useCallback(
        (mode: SelectionMode) => {
            const canEditPrimary = matchSource === SOURCE_SELECTED || compareSource === SOURCE_SELECTED;
            const canEditSecondary = matchSource === SOURCE_SECONDARY_SELECTED || compareSource === SOURCE_SECONDARY_SELECTED;

            if (mode === 'primary' && !canEditPrimary) return;
            if (mode === 'secondary' && !canEditSecondary) return;

            const nextPrimaryIds = selectionMode === 'primary' ? [...furniIds] : [...primaryFurniIds];
            const nextSecondaryIds = selectionMode === 'secondary' ? [...furniIds] : [...secondaryFurniIds];

            setPrimaryFurniIds(nextPrimaryIds);
            setSecondaryFurniIds(nextSecondaryIds);
            setSelectionMode(mode);
            setFurniIds([...(mode === 'primary' ? nextPrimaryIds : nextSecondaryIds)]);
        },
        [selectionMode, furniIds, matchSource, compareSource, primaryFurniIds, secondaryFurniIds, setFurniIds]
    );

    useEffect(() => {
        if (!trigger) return;

        const nextPrimaryIds = [...(trigger.selectedItems ?? [])];
        const nextSecondaryIds = [...(trigger.selectedItems2 ?? [])];
        const nextMatchSource = trigger.furniSourceTypes?.[0] ?? SOURCE_TRIGGER;
        const nextCompareSource = trigger.furniSourceTypes?.[1] ?? SOURCE_SECONDARY_SELECTED;

        setMatchSource(nextMatchSource);
        setCompareSource(nextCompareSource);
        setPrimaryFurniIds(nextPrimaryIds);
        setSecondaryFurniIds(nextSecondaryIds);
        setSelectionMode('primary');
        setFurniIds([...nextPrimaryIds]);
    }, [trigger, setFurniIds]);

    useEffect(() => {
        if (selectionMode === 'primary') setPrimaryFurniIds(furniIds);
        else setSecondaryFurniIds(furniIds);
    }, [furniIds, selectionMode]);

    useEffect(() => {
        syncHighlights(primaryFurniIds, secondaryFurniIds);
    }, [primaryFurniIds, secondaryFurniIds, syncHighlights]);

    useEffect(() => {
        WiredSelectionVisualizer.setEditingPickList(selectionMode === 'secondary' ? 2 : 1);
    }, [selectionMode]);

    useEffect(() => {
        const canEditPrimary = matchSource === SOURCE_SELECTED || compareSource === SOURCE_SELECTED;
        const canEditSecondary = matchSource === SOURCE_SECONDARY_SELECTED || compareSource === SOURCE_SECONDARY_SELECTED;

        if (selectionMode === 'primary' && !canEditPrimary && canEditSecondary) {
            switchSelection('secondary');
            return;
        }

        if (selectionMode === 'secondary' && !canEditSecondary && canEditPrimary) {
            switchSelection('primary');
            return;
        }

        const canEditCurrent = selectionMode === 'primary' ? canEditPrimary : canEditSecondary;

        setAllowsFurni(canEditCurrent ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE : WiredFurniType.STUFF_SELECTION_OPTION_NONE);
    }, [selectionMode, matchSource, compareSource, switchSelection, setAllowsFurni]);

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
        const nextPrimaryIds = selectionMode === 'primary' ? [...furniIds] : [...primaryFurniIds];
        const nextSecondaryIds = selectionMode === 'secondary' ? [...furniIds] : [...secondaryFurniIds];

        setPrimaryFurniIds(nextPrimaryIds);
        setSecondaryFurniIds(nextSecondaryIds);

        const usesSource = (source: number) => matchSource === source || compareSource === source;

        // The live picks are saved as the first list: go back to it (the server reads it only when a slot is on 100).
        if (usesSource(SOURCE_SELECTED)) {
            setSelectionMode('primary');
            setFurniIds([...nextPrimaryIds]);
        }

        setFurniIds2(usesSource(SOURCE_SECONDARY_SELECTED) ? nextSecondaryIds.filter((id) => id > 0) : []);
        setIntParams([]);
        setStringParam('');
        setSourceTypes({ furni: [matchSource, compareSource], users: [] });
    }, [
        selectionMode,
        furniIds,
        primaryFurniIds,
        matchSource,
        compareSource,
        secondaryFurniIds,
        setFurniIds,
        setFurniIds2,
        setIntParams,
        setStringParam,
        setSourceTypes
    ]);

    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE}
                save={save}
                selectionPreview={
                    <div className="flex flex-col gap-2">
                        <WiredFurniSelectionSourceRow
                            title="wiredfurni.params.sources.furni.title.match.0"
                            options={MATCH_FURNI_SOURCES}
                            value={matchSource}
                            selectionKind="primary"
                            selectionActive={selectionMode === 'primary'}
                            selectionCount={primaryFurniIds.length}
                            selectionLimit={selectionLimit}
                            selectionEnabledValues={[SOURCE_SELECTED]}
                            onChange={setMatchSource}
                            onSelectionActivate={() => switchSelection('primary')}
                        />
                        <WiredFurniSelectionSourceRow
                            title="wiredfurni.params.sources.furni.title.match.1"
                            options={MATCH_FURNI_SOURCES}
                            value={compareSource}
                            selectionKind="secondary"
                            selectionActive={selectionMode === 'secondary'}
                            selectionCount={secondaryFurniIds.length}
                            selectionLimit={selectionLimit}
                            selectionEnabledValues={[SOURCE_SECONDARY_SELECTED]}
                            onChange={setCompareSource}
                            onSelectionActivate={() => switchSelection('secondary')}
                        />
                    </div>
                }
            />
        </NativeTextTree>
    );
};
