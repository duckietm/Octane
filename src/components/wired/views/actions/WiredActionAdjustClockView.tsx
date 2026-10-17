import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotFurniSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';

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
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [operator, setOperator] = useState(2);
    const [furniSource, setFurniSource] = useState<number>(() => slotFurniSource(trigger));
    const [minutes, setMinutes] = useState(0);
    const [halfSeconds, setHalfSeconds] = useState(0);

    const secondsLabel = useMemo(() => formatSeconds(halfSeconds), [halfSeconds]);

    useEffect(() => {
        if (!trigger) return;

        // Official layout: [whole seconds, minutes, half a second (0/1), operator]; the furni source is
        // the official source slot.
        const d = trigger.intData ?? [];

        setHalfSeconds(normalizeHalfSeconds((d[0] ?? 0) * 2 + (d[2] === 1 ? 1 : 0)));
        setMinutes(normalizeMinutes(d[1] ?? 0));
        setOperator(normalizeOperator(d[3] ?? 2));
        setFurniSource(slotFurniSource(trigger));
    }, [trigger]);

    const save = () => {
        const value = normalizeHalfSeconds(halfSeconds);

        setIntParams([Math.floor(value / 2), normalizeMinutes(minutes), value % 2, operator]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.choose_type')}</Text>
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
            </div>
        </WiredActionBaseView>
    );
};
