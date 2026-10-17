import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Radio } from '../../../../common/Radio';

const MODE_ALL = 0;
const MODE_AT_LEAST_ONE = 1;
const MODE_NOT_ALL = 2;
const MODE_NONE = 3;
const MODE_LESS_THAN = 4;
const MODE_EXACTLY = 5;
const MODE_MORE_THAN = 6;
const MIN_COMPARE_VALUE = 0;
const MAX_COMPARE_VALUE = 1000;
const DEFAULT_COMPARE_VALUE = 1;
const COMPARE_VALUE_PATTERN = /^\d*$/;

const FURNI_SOURCES: WiredSourceOption[] = [
    { value: 100, label: 'wiredfurni.params.sources.furni.100' },
    { value: 0, label: 'wiredfurni.params.sources.furni.0' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' },
    { value: 201, label: 'wiredfurni.params.sources.furni.201' }
];

const MODE_OPTIONS = [MODE_ALL, MODE_AT_LEAST_ONE, MODE_NOT_ALL, MODE_NONE];
const COMPARISON_OPTIONS = [MODE_LESS_THAN, MODE_EXACTLY, MODE_MORE_THAN];

const normalizeEvaluationMode = (value: number) => ([...MODE_OPTIONS, ...COMPARISON_OPTIONS].includes(value) ? value : MODE_ALL);
const normalizeFurniSource = (value: number) => (FURNI_SOURCES.some((option) => option.value === value) ? value : 0);
const normalizeCompareValue = (value: number) => {
    if (isNaN(value)) return DEFAULT_COMPARE_VALUE;

    return Math.max(MIN_COMPARE_VALUE, Math.min(MAX_COMPARE_VALUE, Math.floor(value)));
};

export const WiredExtraOrEvalView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const [evaluationMode, setEvaluationMode] = useState(MODE_ALL);
    const [furniSource, setFurniSource] = useState(0);
    const [compareValue, setCompareValue] = useState(DEFAULT_COMPARE_VALUE);
    const [compareValueInput, setCompareValueInput] = useState(DEFAULT_COMPARE_VALUE.toString());

    useEffect(() => {
        if (!trigger) return;

        // Official layout: [mode (-1 counted, 0 all, 1 any, 2 not all, 3 none), counted mode (0 less,
        // 1 exactly, 2 more), count]; the picked conditions' source is ours, in the furni slot.
        const d = trigger.intData;
        const mode = d[0] ?? MODE_ALL;

        setEvaluationMode(mode === -1 ? MODE_LESS_THAN + Math.max(0, Math.min(2, d[1] ?? 1)) : normalizeEvaluationMode(mode));
        setFurniSource(normalizeFurniSource(trigger.furniSourceTypes?.[0] ?? 0));
        const nextCompareValue = normalizeCompareValue(trigger.intData.length > 2 ? trigger.intData[2] : DEFAULT_COMPARE_VALUE);
        setCompareValue(nextCompareValue);
        setCompareValueInput(nextCompareValue.toString());
    }, [trigger]);

    const updateCompareValue = (value: number) => {
        const nextValue = normalizeCompareValue(value);

        setCompareValue(nextValue);
        setCompareValueInput(nextValue.toString());
    };

    const updateCompareValueInput = (value: string) => {
        if (!COMPARE_VALUE_PATTERN.test(value)) return;

        setCompareValueInput(value);

        if (!value.length) {
            setCompareValue(MIN_COMPARE_VALUE);
            return;
        }

        updateCompareValue(parseInt(value));
    };

    const save = () => {
        const mode = normalizeEvaluationMode(evaluationMode);
        const counted = mode >= MODE_LESS_THAN;

        setIntParams([counted ? -1 : mode, counted ? mode - MODE_LESS_THAN : 0, normalizeCompareValue(compareValue)]);
        setSourceTypes({ furni: [normalizeFurniSource(furniSource)], users: [] });
        setStringParam('');
    };

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            cardStyle={{ width: 360 }}
            footer={
                <WiredSourcesSelector
                    showFurni={true}
                    furniSource={furniSource}
                    furniSources={FURNI_SOURCES}
                    onChangeFurni={(value) => setFurniSource(normalizeFurniSource(value))}
                />
            }
        >
            <div className="flex flex-col gap-2">
                <Text>{LocalizeText('wiredfurni.params.eval_mode')}</Text>
                {MODE_OPTIONS.map((mode) => {
                    return (
                        <label key={mode} className="flex items-center gap-1 cursor-pointer">
                            <Radio checked={evaluationMode === mode} name="wiredExtraOrEvalMode" onCheckedChange={() => setEvaluationMode(mode)} />
                            <Text>{LocalizeText(`wiredfurni.params.eval_mode.${mode}`)}</Text>
                        </label>
                    );
                })}
                {COMPARISON_OPTIONS.map((mode) => {
                    const isSelected = evaluationMode === mode;

                    return (
                        <label key={mode} className="flex items-center gap-2 cursor-pointer">
                            <Radio checked={isSelected} name="wiredExtraOrEvalMode" onCheckedChange={() => setEvaluationMode(mode)} />
                            <Text>{LocalizeText(`wiredfurni.params.eval_mode.cmp.${mode - MODE_LESS_THAN}`)}</Text>
                            <input
                                className="form-control form-control-sm w-16"
                                inputMode="numeric"
                                max={MAX_COMPARE_VALUE}
                                min={MIN_COMPARE_VALUE}
                                type="text"
                                value={compareValueInput}
                                onBlur={() => setCompareValueInput(normalizeCompareValue(compareValue).toString())}
                                onChange={(event) => updateCompareValueInput(event.target.value)}
                                onFocus={() => setEvaluationMode(mode)}
                            />
                        </label>
                    );
                })}
            </div>
        </WiredExtraBaseView>
    );
};
