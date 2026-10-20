import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { localizeWithFallback, WiredFurniType, WiredSelectionVisualizer } from '../../../../api';
import { Text } from '../../../../common';
import { Checkbox } from '../../../../common/Checkbox';
import { NumberInput } from '../../../../common/NumberInput';
import { Radio } from '../../../../common/Radio';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { FURNI_SOURCES, sortWiredSourceOptions, WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { getCustomVariableItemId } from '../WiredVariablePickerData';
import { variableTokenFromId, WIRED_FIXED_HOLDER_SOURCE, WiredValueOrVariableField } from '../WiredValueOrVariableField';
import { toWiredVariableIdOnTarget } from '../WiredVariableIds';
import { WiredActionBaseView } from './WiredActionBaseView';

export const TRANSACTION_MODE_NORMAL = 0;
export const TRANSACTION_MODE_MULTIPLIER = 1;
export const TRANSACTION_MODE_AUTO = 2;
export const TRANSACTION_MULTIPLIER_MIN = 1;
export const TRANSACTION_MULTIPLIER_MAX = 500;
export const TRANSACTION_TIMEOUT_MIN = 30;
export const TRANSACTION_TIMEOUT_MAX = 3600;
export const TRANSACTION_TIMEOUT_DEFAULT = 300;

const GLOBAL_TARGET = -10;
const CONTEXT_TARGET = -20;
const SOURCE_SELECTED = 100;
const SOURCE_SECONDARY_SELECTED = 101;
const REFERENCE_SOURCE = 200;
const MODES = [TRANSACTION_MODE_NORMAL, TRANSACTION_MODE_MULTIPLIER, TRANSACTION_MODE_AUTO];
const MODE_LABELS = ['Normal', 'Multiplier', 'Auto multiplier'];

/** The contracts take the second pick list (source 101), as AIR's dual furni picking does. */
const CONTRACT_SOURCES: WiredSourceOption[] = sortWiredSourceOptions(
    [
        { value: 0, label: 'wiredfurni.params.sources.furni.0' },
        { value: SOURCE_SECONDARY_SELECTED, label: 'wiredfurni.params.sources.furni.101' },
        { value: 200, label: 'wiredfurni.params.sources.furni.200' },
        { value: 201, label: 'wiredfurni.params.sources.furni.201' }
    ],
    'furni'
);

type SelectionMode = 'chests' | 'contracts';

const clampTimeout = (value: number) => Math.min(TRANSACTION_TIMEOUT_MAX, Math.max(TRANSACTION_TIMEOUT_MIN, Number.isFinite(value) ? Math.round(value) : TRANSACTION_TIMEOUT_DEFAULT));

/**
 * The official Initiate Transaction (47, AIR `chests/class_4135`): the transaction mode (normal, multiplier, auto
 * multiplier), the multiplier as a value or a room/context variable (1..500, the auto limit in mode 2, unused in
 * mode 0) and the timeout (30..3600 s, 300 by default). Ints `[mode, multiplier, from a variable, target, timeout on,
 * timeout seconds]`, the variable as the definition's variable id; furni slot 0 the chests (first picks), slot 1
 * the contracts (second picks), user slot 0 the trading users.
 */
export const WiredActionInitTransactionView: FC<{}> = () => {
    const { trigger = null, furniIds = [], setFurniIds, setFurniIds2, setIntParams, setStringParam, setVariableIds, setSourceTypes, setAllowsFurni } = useWired();
    const [mode, setMode] = useState(TRANSACTION_MODE_NORMAL);
    const [multiplier, setMultiplier] = useState('1');
    const [isVariable, setIsVariable] = useState(false);
    const [target, setTarget] = useState(GLOBAL_TARGET);
    const [token, setToken] = useState('');
    const [multiplierValid, setMultiplierValid] = useState(true);
    const [timeoutEnabled, setTimeoutEnabled] = useState(false);
    const [timeoutSeconds, setTimeoutSeconds] = useState(String(TRANSACTION_TIMEOUT_DEFAULT));
    const [chestSource, setChestSource] = useState(SOURCE_SELECTED);
    const [contractSource, setContractSource] = useState(SOURCE_SECONDARY_SELECTED);
    const [userSource, setUserSource] = useState(0);
    const [chestIds, setChestIds] = useState<number[]>([]);
    const [contractIds, setContractIds] = useState<number[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('chests');
    const highlightedIds = useRef<number[]>([]);

    const syncHighlights = useCallback((nextChestIds: number[], nextContractIds: number[]) => {
        if (highlightedIds.current.length) {
            WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlightedIds.current);
            WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlightedIds.current);
        }

        const contractSet = new Set(nextContractIds);
        const chestOnlyIds = nextChestIds.filter((id) => !contractSet.has(id));

        if (chestOnlyIds.length) WiredSelectionVisualizer.applySelectionShaderToFurni(chestOnlyIds);
        if (nextContractIds.length) WiredSelectionVisualizer.applySecondarySelectionShaderToFurni(nextContractIds);

        highlightedIds.current = Array.from(new Set([...nextChestIds, ...nextContractIds]));
    }, []);

    const switchSelection = useCallback(
        (next: SelectionMode) => {
            if (next === 'chests' && chestSource !== SOURCE_SELECTED) return;
            if (next === 'contracts' && contractSource !== SOURCE_SECONDARY_SELECTED) return;

            const nextChestIds = selectionMode === 'chests' ? [...furniIds] : [...chestIds];
            const nextContractIds = selectionMode === 'contracts' ? [...furniIds] : [...contractIds];

            setChestIds(nextChestIds);
            setContractIds(nextContractIds);
            setSelectionMode(next);
            setFurniIds([...(next === 'chests' ? nextChestIds : nextContractIds)]);
        },
        [selectionMode, furniIds, chestSource, contractSource, chestIds, contractIds, setFurniIds]
    );

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        const slots = trigger.furniSourceTypes ?? [];
        const nextChestIds = [...(trigger.selectedItems ?? [])];
        const nextContractIds = [...(trigger.selectedItems2 ?? [])];

        setMode(MODES.includes(data[0]) ? data[0] : TRANSACTION_MODE_NORMAL);
        // AIR onEditStart: a variable multiplier shows the value 1 next to it.
        setIsVariable(data[2] === 1);
        setMultiplier(String(data[2] === 1 ? 1 : Math.min(TRANSACTION_MULTIPLIER_MAX, Math.max(TRANSACTION_MULTIPLIER_MIN, data[1] ?? 1))));
        setTarget(data[3] === CONTEXT_TARGET ? CONTEXT_TARGET : GLOBAL_TARGET);
        setToken(data[2] === 1 ? variableTokenFromId(trigger.variableIds?.[0] ?? '') : '');
        setTimeoutEnabled(data[4] === 1);
        setTimeoutSeconds(String(data.length > 5 ? clampTimeout(data[5]) : TRANSACTION_TIMEOUT_DEFAULT));
        setChestSource(slots.length >= 1 ? slots[0] : SOURCE_SELECTED);
        setContractSource(slots.length >= 2 ? (slots[1] === SOURCE_SELECTED ? SOURCE_SECONDARY_SELECTED : slots[1]) : SOURCE_SECONDARY_SELECTED);
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
        setChestIds(nextChestIds);
        setContractIds(nextContractIds);
        setSelectionMode('chests');
        setFurniIds([...nextChestIds]);
    }, [trigger, setFurniIds]);

    useEffect(() => {
        if (selectionMode === 'chests') setChestIds(furniIds);
        else setContractIds(furniIds);
    }, [furniIds, selectionMode]);

    useEffect(() => {
        syncHighlights(chestIds, contractIds);
    }, [chestIds, contractIds, syncHighlights]);

    useEffect(() => {
        const canEditChests = chestSource === SOURCE_SELECTED;
        const canEditContracts = contractSource === SOURCE_SECONDARY_SELECTED;

        if (selectionMode === 'chests' && !canEditChests && canEditContracts) {
            switchSelection('contracts');
            return;
        }

        if (selectionMode === 'contracts' && !canEditContracts && canEditChests) {
            switchSelection('chests');
            return;
        }

        const canEditCurrent = selectionMode === 'chests' ? canEditChests : canEditContracts;

        setAllowsFurni(canEditCurrent ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE);
    }, [selectionMode, chestSource, contractSource, switchSelection, setAllowsFurni]);

    useEffect(() => {
        return () => {
            if (!highlightedIds.current.length) return;

            WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlightedIds.current);
            WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlightedIds.current);
            highlightedIds.current = [];
        };
    }, []);

    const multiplierUsed = mode !== TRANSACTION_MODE_NORMAL;

    const save = () => {
        const nextChestIds = selectionMode === 'chests' ? [...furniIds] : [...chestIds];
        const nextContractIds = selectionMode === 'contracts' ? [...furniIds] : [...contractIds];
        const variableId = isVariable ? getCustomVariableItemId(token) : 0;
        const value = Math.min(TRANSACTION_MULTIPLIER_MAX, Math.max(TRANSACTION_MULTIPLIER_MIN, parseInt(multiplier, 10) || 1));

        setChestIds(nextChestIds);
        setContractIds(nextContractIds);

        if (selectionMode === 'contracts') {
            setSelectionMode('chests');
            setFurniIds([...nextChestIds]);
        }

        setIntParams([mode, value, variableId > 0 ? 1 : 0, target, timeoutEnabled ? 1 : 0, clampTimeout(parseInt(timeoutSeconds, 10))]);
        setStringParam('');
        // The variable list's id (room:12 / ctx:12), as AIR sends it.
        setVariableIds(variableId > 0 ? [toWiredVariableIdOnTarget(target, token)] : []);
        setSourceTypes({ furni: [chestSource, contractSource, REFERENCE_SOURCE], users: [userSource, REFERENCE_SOURCE] });
        setFurniIds2(contractSource === SOURCE_SECONDARY_SELECTED ? nextContractIds.filter((id) => id > 0) : []);
    };

    const timeoutValue = parseInt(timeoutSeconds, 10);
    const validate = () =>
        (!multiplierUsed || (multiplierValid && (!isVariable || getCustomVariableItemId(token) > 0))) &&
        (!timeoutEnabled || (timeoutValue >= TRANSACTION_TIMEOUT_MIN && timeoutValue <= TRANSACTION_TIMEOUT_MAX));

    const multiplierTitle =
        mode === TRANSACTION_MODE_AUTO
            ? localizeWithFallback('wiredfurni.params.contract.multiplier_selection2', 'Auto multiplier limit:')
            : localizeWithFallback('wiredfurni.params.contract.multiplier_selection', 'Select multiplier:');
    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;

    // AIR forceHidePickFurniInstructions and advancedAlwaysVisible: the two source rows are the whole selection.
    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            validate={validate}
            footerCollapsible={false}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} userSlot={0} onChangeUsers={setUserSource} />}
            selectionPreview={
                <div className="flex flex-col gap-2">
                    <WiredFurniSelectionSourceRow
                        title="wiredfurni.params.sources.furni.title.chests"
                        options={FURNI_SOURCES}
                        value={chestSource}
                        selectionKind="primary"
                        selectionActive={selectionMode === 'chests'}
                        selectionCount={chestIds.length}
                        selectionLimit={selectionLimit}
                        selectionEnabledValues={[SOURCE_SELECTED]}
                        onChange={setChestSource}
                        onSelectionActivate={() => switchSelection('chests')}
                    />
                    <WiredFurniSelectionSourceRow
                        title="wiredfurni.params.sources.furni.title.contracts"
                        options={CONTRACT_SOURCES}
                        value={contractSource}
                        selectionKind="secondary"
                        selectionActive={selectionMode === 'contracts'}
                        selectionCount={contractIds.length}
                        selectionLimit={selectionLimit}
                        selectionEnabledValues={[SOURCE_SECONDARY_SELECTED]}
                        onChange={(value) => setContractSource(value === SOURCE_SELECTED ? SOURCE_SECONDARY_SELECTED : value)}
                        onSelectionActivate={() => switchSelection('contracts')}
                    />
                </div>
            }
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.contract.mode', 'Transaction method:')}</Text>
                {MODES.map((value) => (
                    <label key={value} className="flex items-center gap-1">
                        <Radio name="transactionMode" checked={mode === value} onCheckedChange={() => setMode(value)} />
                        <Text>{localizeWithFallback(`wiredfurni.params.contract.mode.${value}`, MODE_LABELS[value])}</Text>
                    </label>
                ))}
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{multiplierTitle}</Text>
                {/* AIR class_4135: createValueOrVariableSection(0, global/context, multiplier_selection, 1, 500); the title
                    switches to multiplier_selection2 in auto mode and the section is disabled in normal mode. */}
                <WiredValueOrVariableField
                    disabled={!multiplierUsed}
                    holderSource={WIRED_FIXED_HOLDER_SOURCE}
                    isVariable={isVariable}
                    label={multiplierTitle}
                    literal={multiplier}
                    max={TRANSACTION_MULTIPLIER_MAX}
                    min={TRANSACTION_MULTIPLIER_MIN}
                    target={target}
                    targets={[GLOBAL_TARGET, CONTEXT_TARGET]}
                    token={token}
                    onIsVariableChange={setIsVariable}
                    onLiteralChange={setMultiplier}
                    onTargetChange={setTarget}
                    onTokenChange={setToken}
                    onValidityChange={setMultiplierValid}
                />
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.contract.timeout', 'Timeout:')}</Text>
                <label className="flex items-center gap-1">
                    <Checkbox checked={timeoutEnabled} onCheckedChange={(nextChecked) => setTimeoutEnabled(nextChecked)} />
                    <Text>{localizeWithFallback('wiredfurni.params.contract.timeout.desc', 'Cancel a trade automatically on timeout')}</Text>
                </label>
                <label className="flex items-center gap-1">
                    <Text>{localizeWithFallback('wiredfurni.params.contract.timeout.selection', 'Timeout (seconds):')}</Text>
                    <NumberInput
                        aria-label="timeout seconds"
                        className="form-control form-control-sm"
                        max={TRANSACTION_TIMEOUT_MAX}
                        min={TRANSACTION_TIMEOUT_MIN}
                        value={timeoutSeconds}
                        onBlur={() => setTimeoutSeconds(String(clampTimeout(parseInt(timeoutSeconds, 10))))}
                        onChange={(event) => setTimeoutSeconds(event.target.value)}
                    />
                </label>
            </div>
        </WiredActionBaseView>
    );
};
