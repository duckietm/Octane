import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Radio } from '../../../../common/Radio';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const MINUTES_MIN = 0;
const MINUTES_MAX = 99;
const HALF_SECONDS_MIN = 0;
const HALF_SECONDS_MAX = 119;

const COMPARISON_OPTIONS = [
    { value: 0, label: 'wiredfurni.params.comparison.0' },
    { value: 1, label: 'wiredfurni.params.comparison.1' },
    { value: 2, label: 'wiredfurni.params.comparison.2' }
];

const normalizeComparison = (value: number) => {
    if (value < 0 || value > 2) return 1;

    return value;
};

const normalizeMinutes = (value: number) => Math.max(MINUTES_MIN, Math.min(MINUTES_MAX, value));
const normalizeHalfSeconds = (value: number) => Math.max(HALF_SECONDS_MIN, Math.min(HALF_SECONDS_MAX, value));

const formatSeconds = (halfSeconds: number) => {
    const value = normalizeHalfSeconds(halfSeconds) / 2;
    const text = value.toFixed(1);

    return text.endsWith('.0') ? text.slice(0, -2) : text;
};

export const WiredConditionCounterTimeMatchesView: FC<{}> = () => {
    // Official layout: [seconds, minutes, half second, comparison], the counters in the official source slot; the
    // quantifier is the base view's.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [comparison, setComparison] = useState(1);
    const [furniSource, setFurniSource] = useState<number>(() => trigger?.furniSourceTypes?.[0] ?? ((trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0));
    const [minutes, setMinutes] = useState(0);
    const [halfSeconds, setHalfSeconds] = useState(0);

    const secondsLabel = useMemo(() => formatSeconds(halfSeconds), [halfSeconds]);

    const save = () => {
        const steps = normalizeHalfSeconds(halfSeconds);

        setIntParams([Math.floor(steps / 2), normalizeMinutes(minutes), steps % 2, normalizeComparison(comparison)]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    useEffect(() => {
        if (!trigger) return;

        setHalfSeconds(normalizeHalfSeconds((trigger.intData[0] ?? 0) * 2 + (trigger.intData[2] ?? 0)));
        setMinutes(trigger.intData.length > 1 ? normalizeMinutes(trigger.intData[1]) : 0);
        setComparison(trigger.intData.length > 3 ? normalizeComparison(trigger.intData[3]) : 1);
        setFurniSource(trigger.furniSourceTypes?.[0] ?? ((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0));
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
                save={save}
                footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
            >
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.comparison_selection')}</Text>
                    {COMPARISON_OPTIONS.map((option) => {
                        return (
                            <div key={option.value} className="flex items-center gap-1">
                                <Radio checked={comparison === option.value} id={`counterComparison${option.value}`} name="counterComparison" onCheckedChange={() => setComparison(option.value)} />
                                <Text>{LocalizeText(option.label)}</Text>
                            </div>
                        );
                    })}
                </div>
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.clock_minutes_elapsed', ['minutes'], [minutes.toString()])}</Text>
                    <Slider max={MINUTES_MAX} min={MINUTES_MIN} step={1} value={minutes} onChange={(event) => setMinutes(normalizeMinutes(event as number))} />
                    <Text small>{minutes}</Text>
                </div>
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.clock_seconds_elapsed', ['seconds'], [secondsLabel])}</Text>
                    <Slider
                        max={HALF_SECONDS_MAX}
                        min={HALF_SECONDS_MIN}
                        step={1}
                        value={halfSeconds}
                        onChange={(event) => setHalfSeconds(normalizeHalfSeconds(event as number))}
                    />
                    <Text small>{secondsLabel}</Text>
                </div>
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
