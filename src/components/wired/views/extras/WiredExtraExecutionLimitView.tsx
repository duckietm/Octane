import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MIN_EXECUTIONS = 1;
const MAX_EXECUTIONS = 100;
const DEFAULT_EXECUTIONS = 1;
const MIN_TIME_WINDOW_MS = 500;
const MAX_TIME_WINDOW_MS = 10000;
const DEFAULT_TIME_WINDOW_MS = 500;
const TIME_WINDOW_STEP_MS = 500;

const normalizeExecutions = (value: number) => {
    if (isNaN(value)) return DEFAULT_EXECUTIONS;

    return Math.max(MIN_EXECUTIONS, Math.min(MAX_EXECUTIONS, Math.round(value)));
};

const normalizeTimeWindow = (value: number) => {
    if (isNaN(value)) return DEFAULT_TIME_WINDOW_MS;

    const clampedValue = Math.max(MIN_TIME_WINDOW_MS, Math.min(MAX_TIME_WINDOW_MS, value));

    return Math.round(clampedValue / TIME_WINDOW_STEP_MS) * TIME_WINDOW_STEP_MS;
};

const formatTimeWindow = (value: number) => {
    const seconds = value / 1000;

    return Number.isInteger(seconds) ? seconds.toString() : seconds.toFixed(1);
};

export const WiredExtraExecutionLimitView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [executions, setExecutions] = useState(DEFAULT_EXECUTIONS);
    const [timeWindowMs, setTimeWindowMs] = useState(DEFAULT_TIME_WINDOW_MS);

    useEffect(() => {
        if (!trigger) return;

        setExecutions(normalizeExecutions(trigger.intData.length > 0 ? trigger.intData[0] : DEFAULT_EXECUTIONS));
        // Official layout: [max executions, window in half-second pulses].
        setTimeWindowMs(normalizeTimeWindow(trigger.intData.length > 1 ? trigger.intData[1] * TIME_WINDOW_STEP_MS : DEFAULT_TIME_WINDOW_MS));
    }, [trigger]);

    const save = () => {
        setIntParams([normalizeExecutions(executions), normalizeTimeWindow(timeWindowMs) / TIME_WINDOW_STEP_MS]);
        setStringParam('');
    };

    return (
        <NativeTextTree>
            <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 380 }}>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2">
                        <Text>{LocalizeText('wiredfurni.params.setexecutions', ['amount'], [executions.toString()])}</Text>
                        <Slider
                            min={MIN_EXECUTIONS}
                            max={MAX_EXECUTIONS}
                            step={1}
                            value={executions}
                            onChange={(value) => setExecutions(normalizeExecutions(Array.isArray(value) ? value[0] : Number(value)))}
                        />
                        <Text small>{executions}</Text>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Text>{LocalizeText('wiredfurni.params.settimewindow', ['timewindow'], [formatTimeWindow(timeWindowMs)])}</Text>
                        <Slider
                            min={MIN_TIME_WINDOW_MS}
                            max={MAX_TIME_WINDOW_MS}
                            step={TIME_WINDOW_STEP_MS}
                            value={timeWindowMs}
                            onChange={(value) => setTimeWindowMs(normalizeTimeWindow(Array.isArray(value) ? value[0] : Number(value)))}
                        />
                        <Text small>{formatTimeWindow(timeWindowMs)}s</Text>
                    </div>
                </div>
            </WiredExtraBaseView>
        </NativeTextTree>
    );
};
