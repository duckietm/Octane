import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSliderSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';

/** The times slider runs 1..11; 11 is "unlimited" and goes out as 0. */
const TIMES_UNLIMITED = 11;

interface WiredActionGiveScoreBaseViewProps {
    /** Give score to a predefined team: the team in a two-column grid, the third int. */
    toTeam: boolean;
}

/**
 * Official give score: [points (negative to take them), times in game (0: unlimited)] and, for a team,
 * [team] after; points, times, then the operation. The user source is the official source slot.
 */
export const WiredActionGiveScoreBaseView: FC<WiredActionGiveScoreBaseViewProps> = ({ toTeam }) => {
    const [points, setPoints] = useState(1);
    const [times, setTimes] = useState(TIMES_UNLIMITED);
    const [operation, setOperation] = useState(0);
    const [team, setTeam] = useState(1);
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => slotUserSource(trigger));

    useEffect(() => {
        if (!trigger) return;

        const signed = trigger.intData?.[0] ?? 1;
        const storedTimes = trigger.intData?.[1] ?? 0;

        setPoints(Math.max(1, Math.min(1000, Math.abs(signed) || 1)));
        setOperation(signed < 0 ? 1 : 0);
        setTimes(storedTimes > 0 && storedTimes < TIMES_UNLIMITED ? storedTimes : TIMES_UNLIMITED);
        setTeam(toTeam ? Math.max(1, Math.min(4, trigger.intData?.[2] ?? 1)) : 1);
        setUserSource(slotUserSource(trigger));
    }, [toTeam, trigger]);

    const save = () => {
        const signed = operation === 1 ? -points : points;
        const sentTimes = times >= TIMES_UNLIMITED ? 0 : times;

        setIntParams(toTeam ? [signed, sentTimes, team] : [signed, sentTimes]);
        setSourceTypes({ furni: [], users: toTeam ? [] : [userSource] });
    };

    const timesText = times >= TIMES_UNLIMITED ? localizeWithFallback('wiredfurni.params.unlimited', 'Unlimited') : String(times);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={toTeam ? null : <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <WiredSliderSection
                max={1000}
                min={1}
                title={localizeWithFallback('wiredfurni.params.setpoints2', LocalizeText('wiredfurni.params.setpoints', ['points'], [points.toString()]), ['points'], [points.toString()])}
                value={points}
                onChange={setPoints}
            />
            <WiredSliderSection
                max={TIMES_UNLIMITED}
                min={1}
                numberInput={false}
                title={localizeWithFallback('wiredfurni.params.settimesingame', `Times in game: ${timesText}`, ['times'], [timesText])}
                value={times}
                onChange={setTimes}
            />
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.points_operation')}</Text>
                {[0, 1].map((value) => (
                    <label key={value} className="flex items-center gap-1">
                        <Radio checked={operation === value} name="pointsOperation" onCheckedChange={() => setOperation(value)} />
                        <Text>{LocalizeText(`wiredfurni.params.points_operation.${value}`)}</Text>
                    </label>
                ))}
            </div>
            {toTeam && (
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.team')}</Text>
                    <div className="grid grid-cols-2 gap-1">
                        {[1, 2, 3, 4].map((value) => (
                            <label key={value} className="flex items-center gap-1">
                                <Radio checked={team === value} name="scoreTeam" onCheckedChange={() => setTeam(value)} />
                                <Text>{LocalizeText(`wiredfurni.params.team.${value}`)}</Text>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </WiredActionBaseView>
    );
};
