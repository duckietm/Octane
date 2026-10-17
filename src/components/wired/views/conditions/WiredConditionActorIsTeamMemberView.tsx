import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Radio } from '../../../../common/Radio';

// 0 is "in any team", as officially.
const teamIds: number[] = [0, 1, 2, 3, 4];

interface WiredConditionActorIsTeamMemberViewProps {
    negative?: boolean;
}

export const WiredConditionActorIsTeamMemberView: FC<WiredConditionActorIsTeamMemberViewProps> = ({ negative = false }) => {
    const [selectedTeam, setSelectedTeam] = useState(-1);
    const [quantifier, setQuantifier] = useState(1);
    // Official layout: [team (0 any team, 1-4), our quantifier], the users in the official source slot.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => trigger?.userSourceTypes?.[0] ?? 0);

    const save = () => {
        setIntParams([selectedTeam, quantifier]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        setSelectedTeam(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
        setQuantifier(trigger.intData[1] === 1 ? 1 : 0);
    }, [trigger]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                {[0, 1].map((value) => (
                    <label key={value} className="flex items-center gap-1">
                        <Radio checked={quantifier === value} name="teamMemberQuantifier" onCheckedChange={() => setQuantifier(value)} />
                        <Text>{LocalizeText(`wiredfurni.params.quantifier.users${negative ? '.neg' : ''}.${value}`)}</Text>
                    </label>
                ))}
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.team')}</Text>
                {teamIds.map((value) => {
                    return (
                        <div key={value} className="items-center gap-1">
                            <Radio checked={selectedTeam === value} id={`selectedTeam${value}`} name="selectedTeam" onCheckedChange={() => setSelectedTeam(value)} />
                            <Text>{value === 0 ? localizeWithFallback('wiredfurni.params.team.0', 'Any team') : LocalizeText(`wiredfurni.params.team.${value}`)}</Text>
                        </div>
                    );
                })}
            </div>
        </WiredConditionBaseView>
    );
};
