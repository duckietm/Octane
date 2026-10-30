import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText, WiredFurniType, WiredSelectionVisualizer } from '../../../../api';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { FURNI_SOURCES, sortWiredSourceOptions, WiredSourceOption } from '../WiredSourcesSelector';
import { variableTokenFromId } from '../WiredValueOrVariableField';
import { toWiredVariableId } from '../WiredVariableIds';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, getCustomVariableItemId, IWiredVariablePickerEntry } from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Radio } from '../../../../common/Radio';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const SOURCE_SELECTED = 100;
const SOURCE_SECONDARY_SELECTED = 101;
const SCAN_MODES = [0, 1];

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

interface IScannerVariableCandidate {
    itemId: number;
    hasValue?: boolean;
    isReadOnly?: boolean;
    requiresExecutionContext?: boolean;
    valueShape?: string;
    unavailable?: boolean;
}

/** AIR's filter: a context variable with a value that the room's wired may create, delete and write. */
export const isChestScannerVariableCandidate = (definition: IScannerVariableCandidate): boolean =>
    !!definition &&
    definition.itemId > 0 &&
    !!definition.hasValue &&
    !definition.isReadOnly &&
    !definition.requiresExecutionContext &&
    definition.valueShape !== 'array' &&
    !definition.unavailable;

/**
 * The official chest item type scanner (AIR `§_-i2B§`, addon 18): the usage note, a context variable for the count
 * and the collapsed scan options. Ints `[mode]` (0 every item in the chests, 1 only the displayed ones), the
 * variable as the first variable id; furni slot 0 the item types (first picks), slot 1 the chests (second picks).
 */
export const WiredExtraChestItemTypeScannerView: FC<{}> = () => {
    const { trigger = null, furniIds = [], setFurniIds, setFurniIds2, setIntParams, setStringParam, setVariableIds, setSourceTypes, setAllowsFurni } = useWired();
    const { contextVariableDefinitions = [] } = useWiredTools();
    const [variableToken, setVariableToken] = useState('');
    const [mode, setMode] = useState(0);
    const [typeSource, setTypeSource] = useState(SOURCE_SELECTED);
    const [chestSource, setChestSource] = useState(SOURCE_SECONDARY_SELECTED);
    const [typeIds, setTypeIds] = useState<number[]>([]);
    const [chestIds, setChestIds] = useState<number[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('types');
    const highlightedIds = useRef<number[]>([]);

    const variableEntries = useMemo(
        () =>
            buildWiredVariablePickerEntries('context', 'change-reference', contextVariableDefinitions.filter(isChestScannerVariableCandidate)).filter(
                (entry) => entry.kind === 'custom'
            ),
        [contextVariableDefinitions]
    );

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

        setMode(trigger.intData?.[0] === 1 ? 1 : 0);
        setVariableToken(variableTokenFromId(trigger.variableIds?.[0] ?? ''));
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
        const variableId = getCustomVariableItemId(variableToken);

        setTypeIds(nextTypeIds);
        setChestIds(nextChestIds);

        if (selectionMode === 'chests') {
            setSelectionMode('types');
            setFurniIds([...nextTypeIds]);
        }

        setIntParams([mode]);
        setStringParam('');
        // The variable list's id of the context variable (ctx:12), as AIR sends it.
        setVariableIds(variableId > 0 ? [toWiredVariableId('context', variableToken)] : []);
        setSourceTypes({ furni: [typeSource, chestSource], users: [] });
        setFurniIds2(chestSource === SOURCE_SECONDARY_SELECTED ? nextChestIds.filter((id) => id > 0) : []);
    };

    const validate = () => getCustomVariableItemId(variableToken) > 0;
    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;

    // AIR forceHidePickFurniInstructions: the two source rows are the whole selection, in the advanced section that
    // addon 18 always shows open (advancedAlwaysVisible).
    return (
        <NativeTextTree>
            <WiredExtraBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
                save={save}
                validate={validate}
                cardStyle={{ width: 400 }}
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
                <div className="flex flex-col gap-2">
                    <Text small className="whitespace-pre-line">{LocalizeText('wiredfurni.params.chest_item_type_scanner.info').replace(/\\n/g, '\n')}</Text>
                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variables.variable_selection')}</Text>
                        <WiredVariablePicker
                            entries={variableEntries as IWiredVariablePickerEntry[]}
                            recentScope="chest-item-type-scanner"
                            selectedToken={variableToken}
                            onSelect={(entry) => setVariableToken(entry.token)}
                        />
                    </div>
                    <details>
                        <summary>
                            <Text bold>{LocalizeText('wiredfurni.params.chest_item_type_scanner')}</Text>
                        </summary>
                        <div className="flex flex-col gap-1 pt-1">
                            {SCAN_MODES.map((value) => (
                                <label key={value} className="flex items-center gap-1">
                                    <Radio name="chestItemTypeScannerMode" checked={mode === value} onCheckedChange={ () => setMode(value) } />
                                    <Text>{LocalizeText(`wiredfurni.params.chest_item_type_scanner.${value}`)}</Text>
                                </label>
                            ))}
                        </div>
                    </details>
                </div>
            </WiredExtraBaseView>
        </NativeTextTree>
    );
};
