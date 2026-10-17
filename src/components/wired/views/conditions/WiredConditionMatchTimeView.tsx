import { ChangeEvent, FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Radio } from '../../../../common/Radio';

const MODE_SKIP = 0;
const MODE_EXACT = 1;
const MODE_RANGE = 2;
const MODE_OPTIONS = [MODE_SKIP, MODE_EXACT, MODE_RANGE];
/** An official "use" flag and range as the editor's mode: off, a single value, or a range. */
const toMode = (use: boolean, from: number, to: number) => (!use ? MODE_SKIP : from === to ? MODE_EXACT : MODE_RANGE);


const clampValue = (value: number, min: number, max: number) => {
    if (isNaN(value)) return min;

    return Math.max(min, Math.min(max, Math.floor(value)));
};

interface TimeFilterSectionProps {
    sectionId: string;
    titleKey: string;
    min: number;
    max: number;
    mode: number;
    fromValue: number;
    toValue: number;
    onModeChange: (value: number) => void;
    onFromChange: (value: number) => void;
    onToChange: (value: number) => void;
}

const parseInputValue = (event: ChangeEvent<HTMLInputElement>, min: number, max: number) => {
    return clampValue(parseInt(event.target.value || min.toString(), 10), min, max);
};

const InlineNumberInput: FC<{ value: number; min: number; max: number; onChange: (value: number) => void }> = (props) => {
    const { value = 0, min = 0, max = 0, onChange = null } = props;

    return (
        <input
            className="form-control form-control-sm text-center"
            max={max}
            min={min}
            style={{ width: 56 }}
            type="number"
            value={value}
            onChange={(event) => onChange(parseInputValue(event, min, max))}
        />
    );
};

const TimeFilterSection: FC<TimeFilterSectionProps> = (props) => {
    const {
        sectionId = '',
        titleKey = '',
        min = 0,
        max = 0,
        mode = MODE_SKIP,
        fromValue = 0,
        toValue = 0,
        onModeChange = null,
        onFromChange = null,
        onToChange = null
    } = props;

    return (
        <div className="d-flex flex-column gap-2">
            <Text bold>{LocalizeText(titleKey)}</Text>
            <div className="flex items-center gap-1">
                <Radio checked={mode === MODE_SKIP} id={`${sectionId}0`} name={sectionId} onCheckedChange={() => onModeChange(MODE_SKIP)} />
                <Text>{LocalizeText('wiredfurni.params.time.skip')}</Text>
            </div>
            <div className="flex items-center gap-2">
                <Radio checked={mode === MODE_EXACT} id={`${sectionId}1`} name={sectionId} onCheckedChange={() => onModeChange(MODE_EXACT)} />
                <Text>{LocalizeText('wiredfurni.params.time.exact')}</Text>
                <InlineNumberInput max={max} min={min} value={fromValue} onChange={onFromChange} />
            </div>
            <div className="flex items-center gap-2">
                <Radio checked={mode === MODE_RANGE} id={`${sectionId}2`} name={sectionId} onCheckedChange={() => onModeChange(MODE_RANGE)} />
                <Text>{LocalizeText('wiredfurni.params.time.range')}</Text>
                <InlineNumberInput max={max} min={min} value={fromValue} onChange={onFromChange} />
                <Text>-</Text>
                <InlineNumberInput max={max} min={min} value={toValue} onChange={onToChange} />
            </div>
        </div>
    );
};

export const WiredConditionMatchTimeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [hourMode, setHourMode] = useState(MODE_SKIP);
    const [hourFrom, setHourFrom] = useState(0);
    const [hourTo, setHourTo] = useState(0);
    const [minuteMode, setMinuteMode] = useState(MODE_SKIP);
    const [minuteFrom, setMinuteFrom] = useState(0);
    const [minuteTo, setMinuteTo] = useState(0);
    const [secondMode, setSecondMode] = useState(MODE_SKIP);
    const [secondFrom, setSecondFrom] = useState(0);
    const [secondTo, setSecondTo] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        // Official layout: [useSeconds, useMinutes, useHours, secondMin, secondMax, minuteMin, minuteMax, hourMin, hourMax].
        const d = trigger.intData;
        const [secFrom, secTo] = [clampValue(d[3] ?? 0, 0, 59), clampValue(d[4] ?? 59, 0, 59)];
        const [minFrom, minTo] = [clampValue(d[5] ?? 0, 0, 59), clampValue(d[6] ?? 59, 0, 59)];
        const [hrFrom, hrTo] = [clampValue(d[7] ?? 0, 0, 23), clampValue(d[8] ?? 23, 0, 23)];

        setSecondMode(toMode(d[0] === 1, secFrom, secTo));
        setSecondFrom(secFrom);
        setSecondTo(secTo);
        setMinuteMode(toMode(d[1] === 1, minFrom, minTo));
        setMinuteFrom(minFrom);
        setMinuteTo(minTo);
        setHourMode(toMode(d[2] === 1, hrFrom, hrTo));
        setHourFrom(hrFrom);
        setHourTo(hrTo);
    }, [trigger]);

    const save = () => {
        const range = (mode: number, from: number, to: number, max: number) => [clampValue(from, 0, max), clampValue(mode === MODE_RANGE ? to : from, 0, max)];

        setIntParams([
            secondMode !== MODE_SKIP ? 1 : 0,
            minuteMode !== MODE_SKIP ? 1 : 0,
            hourMode !== MODE_SKIP ? 1 : 0,
            ...range(secondMode, secondFrom, secondTo, 59),
            ...range(minuteMode, minuteFrom, minuteTo, 59),
            ...range(hourMode, hourFrom, hourTo, 23)
        ]);
    };

    return (
        <WiredConditionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-3">
                <TimeFilterSection
                    fromValue={hourFrom}
                    max={23}
                    min={0}
                    mode={hourMode}
                    sectionId="matchTimeHour"
                    titleKey="wiredfurni.params.time.hour_selection"
                    toValue={hourTo}
                    onFromChange={(value) => setHourFrom(clampValue(value, 0, 23))}
                    onModeChange={setHourMode}
                    onToChange={(value) => setHourTo(clampValue(value, 0, 23))}
                />
                <TimeFilterSection
                    fromValue={minuteFrom}
                    max={59}
                    min={0}
                    mode={minuteMode}
                    sectionId="matchTimeMinute"
                    titleKey="wiredfurni.params.time.minute_selection"
                    toValue={minuteTo}
                    onFromChange={(value) => setMinuteFrom(clampValue(value, 0, 59))}
                    onModeChange={setMinuteMode}
                    onToChange={(value) => setMinuteTo(clampValue(value, 0, 59))}
                />
                <TimeFilterSection
                    fromValue={secondFrom}
                    max={59}
                    min={0}
                    mode={secondMode}
                    sectionId="matchTimeSecond"
                    titleKey="wiredfurni.params.time.second_selection"
                    toValue={secondTo}
                    onFromChange={(value) => setSecondFrom(clampValue(value, 0, 59))}
                    onModeChange={setSecondMode}
                    onToChange={(value) => setSecondTo(clampValue(value, 0, 59))}
                />
            </div>
        </WiredConditionBaseView>
    );
};
