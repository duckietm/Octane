import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionJoinTeamView: FC<{}> = (props) => {
    const [selectedTeamType, setSelectedTeamType] = useState(0);
    const [selectedTeam, setSelectedTeam] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 2) return trigger.intData[2];
        if (trigger?.intData?.length > 1) return trigger.intData[1];
        return 0;
    });

    const save = () => setIntParams([selectedTeamType, selectedTeam, userSource]);

    useEffect(() => {
        if (trigger.intData.length > 2) {
            setSelectedTeamType(trigger.intData[0]);
            setSelectedTeam(trigger.intData[1]);
            setUserSource(trigger.intData[2]);
        } else {
            setSelectedTeamType(0);
            setSelectedTeam(trigger.intData.length > 0 ? trigger.intData[0] : 1);
            setUserSource(trigger.intData.length > 1 ? trigger.intData[1] : 0);
        }
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.choose_type')}</Text>
                {[
                    { value: 0, key: 'wiredfurni.params.team.game.0', label: 'Wired' },
                    { value: 1, key: 'wiredfurni.params.team.game.1', label: 'Banzai' },
                    { value: 2, key: 'wiredfurni.params.team.game.2', label: 'Freeze' }
                ].map((option) => {
                    return (
                        <div key={option.value} className="flex gap-1">
                            <input
                                checked={selectedTeamType === option.value}
                                className="form-check-input"
                                id={`selectedTeamType${option.value}`}
                                name="selectedTeamType"
                                type="radio"
                                onChange={() => setSelectedTeamType(option.value)}
                            />
                            <Text>{localizeWithFallback(option.key, option.label)}</Text>
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.team')}</Text>
                {[1, 2, 3, 4].map((team) => {
                    return (
                        <div key={team} className="flex gap-1">
                            <input
                                checked={selectedTeam === team}
                                className="form-check-input"
                                id={`selectedTeam${team}`}
                                name="selectedTeam"
                                type="radio"
                                onChange={(event) => setSelectedTeam(team)}
                            />
                            <Text>{LocalizeText(`wiredfurni.params.team.${team}`)}</Text>
                        </div>
                    );
                })}
            </div>
        </WiredActionBaseView>
    );
};
