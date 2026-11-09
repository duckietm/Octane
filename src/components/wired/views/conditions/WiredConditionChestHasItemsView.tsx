import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { normalizeWiredComparison, WIRED_CMP_DEFAULT, WiredComparisonOperator } from '../WiredComparisonOperator';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { normalizeWiredValueTarget, variableTokenFromId, WIRED_VALUE_TARGET_GLOBAL, WiredValueOrVariableField } from '../WiredValueOrVariableField';
import { toWiredVariableIdOnTarget } from '../WiredVariableIds';
import { getCustomVariableItemId, normalizeVariableTokenFromWire } from '../WiredVariablePickerData';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const CHEST_AMOUNT_MIN = 0;
const CHEST_AMOUNT_MAX = 1_000_000;
const SOURCE_SELECTED = 100;

/** The chest amount fields AIR's ChestHasAmount reads and writes (shared by Chest Has Items and Chest Has Item Types). */
export interface IChestAmountState {
    amount: string;
    fromVariable: boolean;
    target: number;
    token: string;
    comparison: number;
}

/**
 * The official [value, valueIsVariable, target, comparison] with the variable as the first variable id. Boxes saved
 * by older clients kept the variable token in the string; a target outside the official four reads as global.
 */
export const readChestAmountState = (intData: number[], variableIds: string[] | undefined, stringData: string): IChestAmountState => {
    const target = intData?.length > 2 ? intData[2] : WIRED_VALUE_TARGET_GLOBAL;

    return {
        amount: String(Math.max(CHEST_AMOUNT_MIN, intData?.[0] ?? 1)),
        fromVariable: intData?.[1] === 1,
        target: [0, 1, -10, -20].includes(target) ? normalizeWiredValueTarget(target) : WIRED_VALUE_TARGET_GLOBAL,
        token: variableTokenFromId(variableIds?.[0] ?? '') || normalizeVariableTokenFromWire(stringData ?? ''),
        comparison: intData?.length > 3 ? normalizeWiredComparison(intData[3]) : WIRED_CMP_DEFAULT
    };
};

export const chestAmountParams = (state: IChestAmountState) => {
    const value = Math.max(CHEST_AMOUNT_MIN, Math.min(CHEST_AMOUNT_MAX, Math.floor(Number(state.amount) || 0)));
    const variableId = state.fromVariable ? getCustomVariableItemId(state.token) : 0;

    return {
        intParams: [value, state.fromVariable ? 1 : 0, state.target, state.comparison],
        // The variable list's id (user:12 / room:12), as AIR sends it.
        variableIds: variableId > 0 ? [toWiredVariableIdOnTarget(state.target, state.token)] : []
    };
};

interface ChestAmountSectionsProps {
    state: IChestAmountState;
    onChange: (state: IChestAmountState) => void;
    onValidityChange: (valid: boolean) => void;
}

/** AIR ChestHasAmount: the comparison section, then the value-or-variable amount (0..1000000). */
export const WiredConditionChestAmountSections: FC<ChestAmountSectionsProps> = ({ state, onChange, onValidityChange }) => (
    <NativeTextTree>
        <div className="flex flex-col gap-3">
            <WiredComparisonOperator
                name="chestAmountComparison"
                title={LocalizeText('wiredfurni.params.comparison_selection')}
                value={state.comparison}
                onChange={(comparison) => onChange({ ...state, comparison })}
            />
            <WiredValueOrVariableField
                isVariable={state.fromVariable}
                label={LocalizeText('wiredfurni.params.chest_compare_amount')}
                literal={state.amount}
                max={CHEST_AMOUNT_MAX}
                min={CHEST_AMOUNT_MIN}
                target={state.target}
                token={state.token}
                onIsVariableChange={(fromVariable) => onChange({ ...state, fromVariable })}
                onLiteralChange={(amount) => onChange({ ...state, amount })}
                onTargetChange={(target) => onChange({ ...state, target })}
                onTokenChange={(token) => onChange({ ...state, token })}
                onValidityChange={onValidityChange}
            />
        </div>
    </NativeTextTree>
);

export const isChestAmountValid = (state: IChestAmountState, literalValid: boolean) =>
    literalValid && (!state.fromVariable || getCustomVariableItemId(state.token) > 0);

/**
 * Chest Has Items (45), AIR ChestHasAmount: one furni source slot for the chests (`mergedSelections [[1, 0]]`,
 * `sources.furni.title.chests`), the picks by default, or the trigger, a selector or a signal.
 */
export const WiredConditionChestHasItemsView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null, setSourceTypes = null, setFurniIds = null } = useWired();
    const [state, setState] = useState<IChestAmountState>(() => readChestAmountState([], [], ''));
    const [literalValid, setLiteralValid] = useState(true);
    const [furniSource, setFurniSource] = useState(SOURCE_SELECTED);

    useEffect(() => {
        if (!trigger) return;

        setState(readChestAmountState(trigger.intData ?? [], trigger.variableIds, trigger.stringData ?? ''));
        // A box saved before the source slot has none and reads its picks.
        setFurniSource(trigger.furniSourceTypes?.[0] ?? SOURCE_SELECTED);
    }, [trigger]);

    const requiresFurni = furniSource === SOURCE_SELECTED ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;

    const save = () => {
        const { intParams, variableIds } = chestAmountParams(state);

        setIntParams(intParams);
        setVariableIds(variableIds);
        setStringParam('');
        setSourceTypes({ furni: [furniSource], users: [] });

        if (furniSource !== SOURCE_SELECTED) setFurniIds([]);
    };

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={requiresFurni}
                save={save}
                validate={() => isChestAmountValid(state, literalValid)}
                footer={
                    <WiredSourcesSelector
                        showFurni={true}
                        furniTitle="wiredfurni.params.sources.furni.title.chests"
                        furniSource={furniSource}
                        onChangeFurni={setFurniSource}
                    />
                }
            >
                <WiredConditionChestAmountSections state={state} onChange={setState} onValidityChange={setLiteralValid} />
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
