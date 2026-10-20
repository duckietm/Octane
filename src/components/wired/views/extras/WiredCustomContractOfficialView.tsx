import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType, WiredSelectionVisualizer } from '../../../../api';
import {
    CUSTOM_CONTRACT_COINS,
    CUSTOM_CONTRACT_CONTEXT_TARGET,
    CUSTOM_CONTRACT_FURNI,
    CUSTOM_CONTRACT_GLOBAL_TARGET,
    CUSTOM_CONTRACT_MAX_AMOUNT,
    CUSTOM_CONTRACT_MIN_AMOUNT,
    CustomContractElement,
    emptyCustomContractElement,
    readCustomContractElement,
    writeCustomContractElement
} from '../../../../api/wired/WiredCustomContract';
import { Text } from '../../../../common';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { FURNI_SOURCES, sortWiredSourceOptions, WiredSourceOption } from '../WiredSourcesSelector';
import { getCustomVariableItemId } from '../WiredVariablePickerData';
import { variableTokenFromId, WIRED_FIXED_HOLDER_SOURCE, WiredValueOrVariableField } from '../WiredValueOrVariableField';
import { toWiredVariableIdOnTarget, wiredVariableIdList } from '../WiredVariableIds';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const SOURCE_SELECTED = 100;
const SOURCE_SECONDARY_SELECTED = 101;
const ELEMENT_TYPES = [CUSTOM_CONTRACT_COINS, CUSTOM_CONTRACT_FURNI];
const ELEMENT_TYPE_LABELS = ['Coins', 'Furni'];

/** The reward furni take the second pick list (source 101), as AIR's dual furni picking does. */
const REWARD_SOURCES: WiredSourceOption[] = sortWiredSourceOptions(
    [
        { value: 0, label: 'wiredfurni.params.sources.furni.0' },
        { value: SOURCE_SECONDARY_SELECTED, label: 'wiredfurni.params.sources.furni.101' },
        { value: 200, label: 'wiredfurni.params.sources.furni.200' },
        { value: 201, label: 'wiredfurni.params.sources.furni.201' }
    ],
    'furni'
);

type Half = 'payment' | 'reward';

interface ElementSectionProps {
    half: Half;
    element: CustomContractElement;
    onChange: (element: CustomContractElement) => void;
    onValidityChange: (valid: boolean) => void;
}

/** AIR: a collapsed section with the enable checkbox revealing the element type and the value-or-variable amount. */
const ElementSection: FC<ElementSectionProps> = ({ half, element, onChange, onValidityChange }) => {
    const title = LocalizeText(`wiredfurni.params.custom_contract.${half}`);
    const enableLabel = LocalizeText(`wiredfurni.params.custom_contract.enable_${half}`);
    const amountLabel = localizeWithFallback('wiredfurni.params.custom_contract.amount_selection', 'Select amount:');

    return (
        <details>
            <summary>
                <Text bold>{title}</Text>
            </summary>
            <div className="flex flex-col gap-1 pt-1">
                <label className="flex items-center gap-1">
                    <Checkbox aria-label={enableLabel} checked={element.enabled} onCheckedChange={(enabled) => onChange({ ...element, enabled })} />
                    <Text>{enableLabel}</Text>
                </label>
                <fieldset className="flex flex-col gap-1 ps-3" disabled={!element.enabled}>
                    <Text bold>{localizeWithFallback('wiredfurni.params.custom_contract.element_type_selection', 'Element type:')}</Text>
                    <div className="flex items-center gap-3">
                        {ELEMENT_TYPES.map((type) => (
                            <label key={type} className="flex items-center gap-1">
                                <Radio
                                    disabled={!element.enabled}
                                    name={`customContract-${half}-type`}
                                    checked={element.type === type}
                                    onCheckedChange={() => onChange({ ...element, type })}
                                />
                                <Text>{localizeWithFallback(`wiredfurni.params.custom_contract.element_type_selection.${type}`, ELEMENT_TYPE_LABELS[type])}</Text>
                            </label>
                        ))}
                    </div>
                    <Text bold>{amountLabel}</Text>
                    <WiredValueOrVariableField
                        disabled={!element.enabled}
                        holderSource={WIRED_FIXED_HOLDER_SOURCE}
                        isVariable={element.fromVariable}
                        label={`${title}: ${amountLabel}`}
                        literal={element.literal}
                        max={CUSTOM_CONTRACT_MAX_AMOUNT}
                        min={CUSTOM_CONTRACT_MIN_AMOUNT}
                        target={element.target}
                        targets={[CUSTOM_CONTRACT_GLOBAL_TARGET, CUSTOM_CONTRACT_CONTEXT_TARGET]}
                        token={element.token}
                        onIsVariableChange={(fromVariable) => onChange({ ...element, fromVariable })}
                        onLiteralChange={(literal) => onChange({ ...element, literal })}
                        onTargetChange={(target) => onChange({ ...element, target })}
                        onTokenChange={(token) => onChange({ ...element, token })}
                        onValidityChange={onValidityChange}
                    />
                </fieldset>
            </div>
        </details>
    );
};

/**
 * The official Custom Contract (addon 20, AIR `chests/class_4234`): the usage warning, then a payment and a reward
 * section, each switched on by its checkbox and holding the element type (coins or furni) and the amount (1..100000,
 * a value or a room / context variable). Ints `[payment on, type, from a variable, amount, target, reward on, type,
 * from a variable, amount, target]`, variable ids `[payment, reward]`; furni slot 0 the payment furni (first picks),
 * slot 1 the reward furni (second picks), each usable only while its element is on and furni.
 */
export const WiredCustomContractOfficialView: FC<{}> = () => {
    const { trigger = null, furniIds = [], setFurniIds, setFurniIds2, setIntParams, setStringParam, setVariableIds, setSourceTypes, setAllowsFurni } = useWired();
    const [payment, setPayment] = useState<CustomContractElement>(emptyCustomContractElement);
    const [reward, setReward] = useState<CustomContractElement>(emptyCustomContractElement);
    const [paymentValid, setPaymentValid] = useState(true);
    const [rewardValid, setRewardValid] = useState(true);
    const [paymentSource, setPaymentSource] = useState(SOURCE_SELECTED);
    const [rewardSource, setRewardSource] = useState(SOURCE_SECONDARY_SELECTED);
    const [paymentIds, setPaymentIds] = useState<number[]>([]);
    const [rewardIds, setRewardIds] = useState<number[]>([]);
    const [selectionMode, setSelectionMode] = useState<Half>('payment');
    const highlightedIds = useRef<number[]>([]);

    const paymentPicksFurni = payment.enabled && payment.type === CUSTOM_CONTRACT_FURNI;
    const rewardPicksFurni = reward.enabled && reward.type === CUSTOM_CONTRACT_FURNI;

    const syncHighlights = useCallback((nextPaymentIds: number[], nextRewardIds: number[]) => {
        if (highlightedIds.current.length) {
            WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlightedIds.current);
            WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlightedIds.current);
        }

        const rewardSet = new Set(nextRewardIds);
        const paymentOnlyIds = nextPaymentIds.filter((id) => !rewardSet.has(id));

        if (paymentOnlyIds.length) WiredSelectionVisualizer.applySelectionShaderToFurni(paymentOnlyIds);
        if (nextRewardIds.length) WiredSelectionVisualizer.applySecondarySelectionShaderToFurni(nextRewardIds);

        highlightedIds.current = Array.from(new Set([...nextPaymentIds, ...nextRewardIds]));
    }, []);

    const switchSelection = useCallback(
        (next: Half) => {
            if (next === 'payment' && (paymentSource !== SOURCE_SELECTED || !paymentPicksFurni)) return;
            if (next === 'reward' && (rewardSource !== SOURCE_SECONDARY_SELECTED || !rewardPicksFurni)) return;

            const nextPaymentIds = selectionMode === 'payment' ? [...furniIds] : [...paymentIds];
            const nextRewardIds = selectionMode === 'reward' ? [...furniIds] : [...rewardIds];

            setPaymentIds(nextPaymentIds);
            setRewardIds(nextRewardIds);
            setSelectionMode(next);
            setFurniIds([...(next === 'payment' ? nextPaymentIds : nextRewardIds)]);
        },
        [selectionMode, furniIds, paymentSource, rewardSource, paymentPicksFurni, rewardPicksFurni, paymentIds, rewardIds, setFurniIds]
    );

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        const slots = trigger.furniSourceTypes ?? [];
        const nextPaymentIds = [...(trigger.selectedItems ?? [])];
        const nextRewardIds = [...(trigger.selectedItems2 ?? [])];

        setPayment(readCustomContractElement(data, 0, variableTokenFromId(trigger.variableIds?.[0] ?? '')));
        setReward(readCustomContractElement(data, 5, variableTokenFromId(trigger.variableIds?.[1] ?? '')));
        setPaymentSource(slots.length >= 1 ? slots[0] : SOURCE_SELECTED);
        setRewardSource(slots.length >= 2 ? (slots[1] === SOURCE_SELECTED ? SOURCE_SECONDARY_SELECTED : slots[1]) : SOURCE_SECONDARY_SELECTED);
        setPaymentIds(nextPaymentIds);
        setRewardIds(nextRewardIds);
        setSelectionMode('payment');
        setFurniIds([...nextPaymentIds]);
    }, [trigger, setFurniIds]);

    useEffect(() => {
        if (selectionMode === 'payment') setPaymentIds(furniIds);
        else setRewardIds(furniIds);
    }, [furniIds, selectionMode]);

    useEffect(() => {
        syncHighlights(paymentIds, rewardIds);
    }, [paymentIds, rewardIds, syncHighlights]);

    useEffect(() => {
        const canEditPayment = paymentSource === SOURCE_SELECTED && paymentPicksFurni;
        const canEditReward = rewardSource === SOURCE_SECONDARY_SELECTED && rewardPicksFurni;

        if (selectionMode === 'payment' && !canEditPayment && canEditReward) {
            switchSelection('reward');
            return;
        }

        if (selectionMode === 'reward' && !canEditReward && canEditPayment) {
            switchSelection('payment');
            return;
        }

        const canEditCurrent = selectionMode === 'payment' ? canEditPayment : canEditReward;

        setAllowsFurni(canEditCurrent ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE);
    }, [selectionMode, paymentSource, rewardSource, paymentPicksFurni, rewardPicksFurni, switchSelection, setAllowsFurni]);

    useEffect(() => {
        return () => {
            if (!highlightedIds.current.length) return;

            WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlightedIds.current);
            WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlightedIds.current);
            highlightedIds.current = [];
        };
    }, []);

    const save = () => {
        const nextPaymentIds = selectionMode === 'payment' ? [...furniIds] : [...paymentIds];
        const nextRewardIds = selectionMode === 'reward' ? [...furniIds] : [...rewardIds];
        const paymentVariable = payment.enabled && payment.fromVariable ? getCustomVariableItemId(payment.token) : 0;
        const rewardVariable = reward.enabled && reward.fromVariable ? getCustomVariableItemId(reward.token) : 0;

        setPaymentIds(nextPaymentIds);
        setRewardIds(nextRewardIds);

        if (selectionMode === 'reward') {
            setSelectionMode('payment');
            setFurniIds([...nextPaymentIds]);
        }

        setIntParams([...writeCustomContractElement(payment, paymentVariable), ...writeCustomContractElement(reward, rewardVariable)]);
        setStringParam('');
        // The variable list's ids (room:12 / ctx:12), as AIR sends them.
        setVariableIds(wiredVariableIdList(
            paymentVariable > 0 ? toWiredVariableIdOnTarget(payment.target, payment.token) : '',
            rewardVariable > 0 ? toWiredVariableIdOnTarget(reward.target, reward.token) : ''
        ));
        setSourceTypes({ furni: [paymentSource, rewardSource], users: [] });
        setFurniIds2(rewardSource === SOURCE_SECONDARY_SELECTED ? nextRewardIds.filter((id) => id > 0) : []);
    };

    const elementValid = (element: CustomContractElement, valid: boolean) =>
        !element.enabled || (valid && (!element.fromVariable || getCustomVariableItemId(element.token) > 0));
    const validate = () => elementValid(payment, paymentValid) && elementValid(reward, rewardValid);
    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;

    // AIR forceHidePickFurniInstructions, widthModifier 1.2: the two source rows are the whole selection.
    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            validate={validate}
            widthModifier={1.2}
            allowScrolling
            showSelection={false}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <fieldset disabled={!paymentPicksFurni} className={paymentPicksFurni ? undefined : 'opacity-50'}>
                        <WiredFurniSelectionSourceRow
                            title="wiredfurni.params.sources.furni.title.payment"
                            options={FURNI_SOURCES}
                            value={paymentSource}
                            selectionKind="primary"
                            selectionActive={selectionMode === 'payment'}
                            selectionCount={paymentIds.length}
                            selectionLimit={selectionLimit}
                            selectionEnabledValues={[SOURCE_SELECTED]}
                            onChange={setPaymentSource}
                            onSelectionActivate={() => switchSelection('payment')}
                        />
                    </fieldset>
                    <fieldset disabled={!rewardPicksFurni} className={rewardPicksFurni ? undefined : 'opacity-50'}>
                        <WiredFurniSelectionSourceRow
                            title="wiredfurni.params.sources.furni.title.reward"
                            options={REWARD_SOURCES}
                            value={rewardSource}
                            selectionKind="secondary"
                            selectionActive={selectionMode === 'reward'}
                            selectionCount={rewardIds.length}
                            selectionLimit={selectionLimit}
                            selectionEnabledValues={[SOURCE_SECONDARY_SELECTED]}
                            onChange={(value) => setRewardSource(value === SOURCE_SELECTED ? SOURCE_SECONDARY_SELECTED : value)}
                            onSelectionActivate={() => switchSelection('reward')}
                        />
                    </fieldset>
                </div>
            }
        >
            <div className="flex flex-col gap-2">
                <Text small className="whitespace-pre-line">{LocalizeText('wiredfurni.params.custom_contract.usage_warning').replace(/\\n/g, '\n')}</Text>
                <ElementSection half="payment" element={payment} onChange={setPayment} onValidityChange={setPaymentValid} />
                <ElementSection half="reward" element={reward} onChange={setReward} onValidityChange={setRewardValid} />
            </div>
        </WiredExtraBaseView>
    );
};
