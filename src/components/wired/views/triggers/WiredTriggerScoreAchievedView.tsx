import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSliderSection';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const TEAM_TYPES = [0, 1, 2, 3, 4];

export const WiredTriggeScoreAchievedView: FC<{}> = (props) => {
    const [points, setPoints] = useState(1);
    const [teamType, setTeamType] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([points, teamType]);

    useEffect(() => {
        setPoints(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setTeamType(trigger.intData.length > 1 ? trigger.intData[1] : 0);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-1">
                <WiredSliderSection
                    max={1000}
                    min={1}
                    titleFallback={LocalizeText('wiredfurni.params.setscore', ['points'], [points.toString()])}
                    titleKey="wiredfurni.params.setscore2"
                    value={points}
                    onChange={setPoints}
                />
                <hr className="m-0 bg-dark" />
                <Text bold>{LocalizeText('wiredfurni.params.team')}</Text>
                {TEAM_TYPES.map((value) => (
                    <label key={value} className="flex items-center gap-1">
                        <input
                            checked={teamType === value}
                            className="form-check-input"
                            name="scoreAchievedTeamType"
                            type="radio"
                            onChange={() => setTeamType(value)}
                        />
                        <Text>{LocalizeText(value === 0 ? 'wiredfurni.params.team.any' : `wiredfurni.params.team.${value}`)}</Text>
                    </label>
                ))}
            </div>
        </WiredTriggerBaseView>
    );
};
