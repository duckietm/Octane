import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredIconRadioGroup } from '../WiredMoveIconRadios';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

// Official: 0 "in any team" (team.any) on its own row, then the teams 1-4 in 2 columns.
const TEAM_IDS: number[] = [1, 2, 3, 4];

export const WiredConditionActorIsTeamMemberView: FC = () => {
    const [selectedTeam, setSelectedTeam] = useState(-1);
    // Official layout: [team (0 any team, 1-4)], the users in the official source slot; the quantifier is the base view's.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => trigger?.userSourceTypes?.[0] ?? 0);

    const save = () => {
        setIntParams([selectedTeam]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        setSelectedTeam(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            >
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.team')}</Text>
                    <WiredIconRadioGroup
                        columns={2}
                        name="selectedTeam"
                        options={[
                            { value: 0, label: LocalizeText('wiredfurni.params.team.any'), newLine: true },
                            ...TEAM_IDS.map((value) => ({ value, label: LocalizeText(`wiredfurni.params.team.${value}`) }))
                        ]}
                        value={selectedTeam}
                        onChange={setSelectedTeam}
                    />
                </div>
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
