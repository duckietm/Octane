import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredIconRadioGroup } from '../WiredMoveIconRadios';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

// Official: "any team" on a row of its own, then the teams 1-4 in 2 columns.
const TEAM_TYPES = [1, 2, 3, 4];

export const WiredSelectorUsersTeamView: FC<{}> = () => {
    const [teamType, setTeamType] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        const params = trigger.intData;

        setTeamType(params.length > 0 ? params[0] : 0);
    }, [trigger]);

    const save = useCallback(() => {
        setIntParams([teamType]);
    }, [teamType, setIntParams]);

    return (
        <NativeTextTree>
            <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('wiredfurni.params.team')}</Text>
                        <WiredIconRadioGroup
                            columns={2}
                            name="usersTeamSelector"
                            options={[
                                { value: 0, label: LocalizeText('wiredfurni.params.team.any'), newLine: true },
                                ...TEAM_TYPES.map((value) => ({ value, label: LocalizeText(`wiredfurni.params.team.${value}`) }))
                            ]}
                            value={teamType}
                            onChange={setTeamType}
                        />
                    </div>

                </div>
            </WiredSelectorBaseView>
        </NativeTextTree>
    );
};
