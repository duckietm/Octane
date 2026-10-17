import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';
import { NumberInput } from '../../../../common/NumberInput';

const MODE_SKIP = 0;
const MODE_EXACT = 1;
const MODE_RANGE = 2;
const MODE_OPTIONS = [MODE_SKIP, MODE_EXACT, MODE_RANGE];
/** An official "use" flag and range as the editor's mode: off, a single value, or a range. */
const toMode = (use: boolean, from: number, to: number) => (!use ? MODE_SKIP : from === to ? MODE_EXACT : MODE_RANGE);

const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const createMask = (values: number[]) => values.reduce((mask, value) => mask | (1 << value), 0);
const ALL_WEEKDAYS_MASK = createMask(WEEKDAY_OPTIONS);
const ALL_MONTHS_MASK = createMask(MONTH_OPTIONS);

const clampValue = (value: number, min: number, max: number) => {
    if (isNaN(value)) return min;

    return Math.max(min, Math.min(max, Math.floor(value)));
};

const parseInputValue = (event: { target: { value: string } }, min: number, max: number) => {
    return clampValue(parseInt(event.target.value || min.toString(), 10), min, max);
};

const toggleMaskValue = (mask: number, value: number, enabled: boolean) => {
    if (enabled) return mask | (1 << value);

    return mask & ~(1 << value);
};

const InlineNumberInput: FC<{ value: number; min: number; max: number; onChange: (value: number) => void }> = (props) => {
    const { value = 0, min = 0, max = 0, onChange = null } = props;

    return (
        <NumberInput className="form-control form-control-sm text-center" max={max} min={min} style={{ width: 72 }} value={value} onChange={(event) => onChange(parseInputValue(event, min, max))} />
    );
};

interface MatchDateSectionProps {
    sectionId: string;
    titleKey: string;
    mode: number;
    fromValue: number;
    toValue: number;
    min: number;
    max: number;
    onModeChange: (value: number) => void;
    onFromChange: (value: number) => void;
    onToChange: (value: number) => void;
}

const MatchDateSection: FC<MatchDateSectionProps> = (props) => {
    const {
        sectionId = '',
        titleKey = '',
        mode = MODE_SKIP,
        fromValue = 0,
        toValue = 0,
        min = 0,
        max = 0,
        onModeChange = null,
        onFromChange = null,
        onToChange = null
    } = props;

    return (
        <div className="flex flex-col gap-2">
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

export const WiredConditionMatchDateView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const currentYear = useMemo(() => new Date().getFullYear(), []);
    const [weekdayMask, setWeekdayMask] = useState(ALL_WEEKDAYS_MASK);
    const [dayMode, setDayMode] = useState(MODE_SKIP);
    const [dayFrom, setDayFrom] = useState(1);
    const [dayTo, setDayTo] = useState(31);
    const [monthMask, setMonthMask] = useState(ALL_MONTHS_MASK);
    const [yearMode, setYearMode] = useState(MODE_SKIP);
    const [yearFrom, setYearFrom] = useState(currentYear);
    const [yearTo, setYearTo] = useState(currentYear);

    useEffect(() => {
        if (!trigger) return;

        // Official layout: [useDay, useYear, weekday mask (bit 0 Monday, 0 every day), dayMin, dayMax,
        // month mask (bit 0 January, 0 every month), yearMin, yearMax]; the editor's masks start at bit 1.
        const d = trigger.intData;
        const [dFrom, dTo] = [clampValue(d[3] ?? 1, 1, 31), clampValue(d[4] ?? 31, 1, 31)];
        const [yFrom, yTo] = [clampValue(d[6] ?? currentYear, 0, 9999), clampValue(d[7] ?? currentYear, 0, 9999)];

        setWeekdayMask(d[2] > 0 ? (d[2] << 1) & ALL_WEEKDAYS_MASK : ALL_WEEKDAYS_MASK);
        setDayMode(toMode(d[0] === 1, dFrom, dTo));
        setDayFrom(dFrom);
        setDayTo(dTo);
        setMonthMask(d[5] > 0 ? (d[5] << 1) & ALL_MONTHS_MASK : ALL_MONTHS_MASK);
        setYearMode(toMode(d[1] === 1, yFrom, yTo));
        setYearFrom(yFrom);
        setYearTo(yTo);
    }, [currentYear, trigger]);

    const save = () => {
        const weekdays = weekdayMask || ALL_WEEKDAYS_MASK;
        const months = monthMask || ALL_MONTHS_MASK;

        setIntParams([
            dayMode !== MODE_SKIP ? 1 : 0,
            yearMode !== MODE_SKIP ? 1 : 0,
            weekdays === ALL_WEEKDAYS_MASK ? 0 : weekdays >> 1,
            clampValue(dayFrom, 1, 31),
            clampValue(dayMode === MODE_RANGE ? dayTo : dayFrom, 1, 31),
            months === ALL_MONTHS_MASK ? 0 : months >> 1,
            clampValue(yearFrom, 0, 9999),
            clampValue(yearMode === MODE_RANGE ? yearTo : yearFrom, 0, 9999)
        ]);
    };

    return (
        <WiredConditionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                    <Text bold>{LocalizeText('wiredfurni.params.time.weekday_selection')}</Text>
                    <div className="flex flex-wrap gap-2">
                        {WEEKDAY_OPTIONS.map((value) => {
                            const checked = (weekdayMask & (1 << value)) !== 0;

                            return (
                                <label key={value} className="flex items-center gap-1">
                                    <Checkbox checked={checked} onCheckedChange={(nextChecked) => setWeekdayMask(toggleMaskValue(weekdayMask, value, nextChecked))} />
                                    <Text>{LocalizeText(`wiredfurni.params.time.weekday.${value}`)}</Text>
                                </label>
                            );
                        })}
                    </div>
                </div>
                <MatchDateSection
                    fromValue={dayFrom}
                    max={31}
                    min={1}
                    mode={dayMode}
                    sectionId="matchDateDay"
                    titleKey="wiredfurni.params.time.day_selection"
                    toValue={dayTo}
                    onFromChange={(value) => setDayFrom(clampValue(value, 1, 31))}
                    onModeChange={setDayMode}
                    onToChange={(value) => setDayTo(clampValue(value, 1, 31))}
                />
                <div className="flex flex-col gap-2">
                    <Text bold>{LocalizeText('wiredfurni.params.time.month_selection')}</Text>
                    <div className="flex flex-wrap gap-2">
                        {MONTH_OPTIONS.map((value) => {
                            const checked = (monthMask & (1 << value)) !== 0;

                            return (
                                <label key={value} className="flex items-center gap-1">
                                    <Checkbox checked={checked} onCheckedChange={(nextChecked) => setMonthMask(toggleMaskValue(monthMask, value, nextChecked))} />
                                    <Text>{LocalizeText(`wiredfurni.params.time.month.${value}`)}</Text>
                                </label>
                            );
                        })}
                    </div>
                </div>
                <MatchDateSection
                    fromValue={yearFrom}
                    max={9999}
                    min={0}
                    mode={yearMode}
                    sectionId="matchDateYear"
                    titleKey="wiredfurni.params.time.year_selection"
                    toValue={yearTo}
                    onFromChange={(value) => setYearFrom(clampValue(value, 0, 9999))}
                    onModeChange={setYearMode}
                    onToChange={(value) => setYearTo(clampValue(value, 0, 9999))}
                />
            </div>
        </WiredConditionBaseView>
    );
};
