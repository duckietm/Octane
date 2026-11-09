import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredDateToString, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const DATE_PLACEHOLDER = 'YYYY/MM/DD HH:MM';
const DATE_MAX_LENGTH = 1000;

/** Unix seconds of a typed date, or null when it does not parse (AIR Date.parse). */
const parseDateSeconds = (text: string): number | null => {
    const trimmed = (text ?? '').trim();

    if (!trimmed) return null;

    const time = Date.parse(trimmed);

    return isNaN(time) ? null : Math.floor(time / 1000);
};

/**
 * AIR's date range params: [] when the start does not parse, [start] when the end does not, otherwise
 * [start, end], all in Unix seconds.
 */
export const dateRangeParams = (startText: string, endText: string): number[] => {
    const start = parseDateSeconds(startText);

    if (start === null) return [];

    const end = parseDateSeconds(endText);

    return end === null ? [start] : [start, end];
};

/** A stored date as AIR shows it (yyyy/MM/dd HH:mm); empty when there is none. */
const dateText = (seconds: number | undefined) => (seconds && seconds > 0 ? WiredDateToString(new Date(seconds * 1000)) : '');

export const WiredConditionDateRangeView: FC<{}> = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams(dateRangeParams(startDate, endDate));

    useEffect(() => {
        const intData = trigger?.intData ?? [];

        setStartDate(dateText(intData[0]));
        setEndDate(dateText(intData[1]));
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredConditionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.startdate')}</Text>
                    <OctaneInput
                        aria-label={LocalizeText('wiredfurni.params.startdate')}
                        maxLength={DATE_MAX_LENGTH}
                        placeholder={DATE_PLACEHOLDER}
                        type="text"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.enddate')}</Text>
                    <OctaneInput
                        aria-label={LocalizeText('wiredfurni.params.enddate')}
                        maxLength={DATE_MAX_LENGTH}
                        placeholder={DATE_PLACEHOLDER}
                        type="text"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
