import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const COUNTER_INTERACTION_TYPES = ['game_upcounter'];
const MINUTES_MIN = 0;
const MINUTES_MAX = 99;
const HALF_SECONDS_MIN = 0;
const HALF_SECONDS_MAX = 119;

const OPERATOR_OPTIONS = [
    { value: 0, label: 'wiredfurni.params.operator.0' },
    { value: 1, label: 'wiredfurni.params.operator.1' },
    { value: 2, label: 'wiredfurni.params.operator.2' }
];

const normalizeOperator = (value: number) => {
    if (value < 0 || value > 2) return 2;

    return value;
};

const normalizeMinutes = (value: number) => Math.max(MINUTES_MIN, Math.min(MINUTES_MAX, value));
const normalizeHalfSeconds = (value: number) => Math.max(HALF_SECONDS_MIN, Math.min(HALF_SECONDS_MAX, value));

const formatSeconds = (halfSeconds: number) => {
    const value = normalizeHalfSeconds(halfSeconds) / 2;
    const text = value.toFixed(1);

    return text.endsWith('.0') ? text.slice(0, -2) : text;
};

export const WiredActionAdjustClockView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setAllowedInteractionTypes = null, setAllowedInteractionErrorKey = null } = useWired();
    const [operator, setOperator] = useState(2);
    const [furniSource, setFurniSource] = useState<number>(() => {
        if (trigger?.intData?.length > 1) return trigger.intData[1];
        return (trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0;
    });
    const [minutes, setMinutes] = useState(0);
    const [halfSeconds, setHalfSeconds] = useState(0);

    const secondsLabel = useMemo(() => formatSeconds(halfSeconds), [halfSeconds]);

    useEffect(() => {
        if (!trigger) return;

        setOperator(trigger.intData.length > 0 ? normalizeOperator(trigger.intData[0]) : 2);
        setFurniSource(trigger.intData.length > 1 ? trigger.intData[1] : (trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0);
        setMinutes(trigger.intData.length > 2 ? normalizeMinutes(trigger.intData[2]) : 0);
        setHalfSeconds(trigger.intData.length > 3 ? normalizeHalfSeconds(trigger.intData[3]) : 0);
    }, [trigger]);

    useEffect(() => {
        setAllowedInteractionTypes(COUNTER_INTERACTION_TYPES);
        setAllowedInteractionErrorKey('wiredfurni.error.require_counter_furni');

        return () => {
            setAllowedInteractionTypes(null);
            setAllowedInteractionErrorKey(null);
        };
    }, [setAllowedInteractionErrorKey, setAllowedInteractionTypes]);

    const save = () => {
        setIntParams([operator, furniSource, normalizeMinutes(minutes), normalizeHalfSeconds(halfSeconds)]);
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <div className="flex flex-col gap-2">
                {OPERATOR_OPTIONS.map((option) => {
                    return (
                        <div key={option.value} className="flex items-center gap-1">
                            <input
                                checked={operator === option.value}
                                className="form-check-input"
                                id={`adjustClockOperator${option.value}`}
                                name="adjustClockOperator"
                                type="radio"
                                onChange={() => setOperator(option.value)}
                            />
                            <Text>{LocalizeText(option.label)}</Text>
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.clock_minutes', LocalizeText('wiredfurni.params.time.minute_selection'), ['minutes'], [minutes.toString()])}</Text>
                <Slider max={MINUTES_MAX} min={MINUTES_MIN} step={1} value={minutes} onChange={(event) => setMinutes(normalizeMinutes(event as number))} />
                <Text small>{minutes}</Text>
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.clock_seconds', LocalizeText('wiredfurni.params.time.second_selection'), ['seconds'], [secondsLabel])}</Text>
                <Slider
                    max={HALF_SECONDS_MAX}
                    min={HALF_SECONDS_MIN}
                    step={1}
                    value={halfSeconds}
                    onChange={(event) => setHalfSeconds(normalizeHalfSeconds(event as number))}
                />
                <Text small>{secondsLabel}</Text>
            </div>
        </WiredActionBaseView>
    );
};
