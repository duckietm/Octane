import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSliderSection';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';
import { Radio } from '../../../../common/Radio';

const TEAM_TYPES = [0, 1, 2, 3, 4];

/** Official: the team (two columns) first, then the points slider; [points, team]. */
export const WiredTriggeScoreAchievedView: FC<{}> = () => {
    const [points, setPoints] = useState(1);
    const [teamType, setTeamType] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([points, teamType]);

    useEffect(() => {
        setPoints(Math.max(1, Math.min(1000, trigger?.intData?.[0] ?? 1)));
        setTeamType(trigger?.intData?.[1] ?? 0);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.team')}</Text>
                    <div className="grid grid-cols-2 gap-1">
                        {TEAM_TYPES.map((value) => (
                            <label key={value} className="flex items-center gap-1">
                                <Radio checked={teamType === value} name="scoreAchievedTeamType" onCheckedChange={() => setTeamType(value)} />
                                <Text>{LocalizeText(value === 0 ? 'wiredfurni.params.team.any' : `wiredfurni.params.team.${value}`)}</Text>
                            </label>
                        ))}
                    </div>
                </div>
                <WiredSliderSection
                    max={1000}
                    min={1}
                    title={localizeWithFallback('wiredfurni.params.setscore2', LocalizeText('wiredfurni.params.setscore', ['points'], [points.toString()]), ['points'], [points.toString()])}
                    value={points}
                    onChange={setPoints}
                />
            </div>
        </WiredTriggerBaseView>
    );
};
