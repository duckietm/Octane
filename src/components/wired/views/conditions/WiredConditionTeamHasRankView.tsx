import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { WiredConditionQuantifierSection } from './WiredConditionQuantifierSection';
import { Radio } from '../../../../common/Radio';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const TEAM_OPTIONS = [0, 1, 2, 3, 4];
const PLACEMENT_OPTIONS = [1, 2, 3, 4];

export const WiredConditionTeamHasRankView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [team, setTeam] = useState(1);
    const [placement, setPlacement] = useState(1);
    const [userSource, setUserSource] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (!trigger) return;

        const nextTeam = trigger.intData.length > 0 ? trigger.intData[0] : 1;
        // Officially the placement is 0 (first) .. 3 (fourth); the editor shows 1-4.
        const nextPlacement = trigger.intData.length > 1 ? trigger.intData[1] + 1 : 1;
        const nextUserSource = trigger.intData.length > 2 ? trigger.intData[2] : 0;

        setTeam(TEAM_OPTIONS.includes(nextTeam) ? nextTeam : 1);
        setPlacement(PLACEMENT_OPTIONS.includes(nextPlacement) ? nextPlacement : 1);
        setUserSource(nextUserSource);
        setShowAdvanced(nextUserSource !== 0 || (trigger.quantifierCode ?? 0) !== 0);
    }, [trigger]);

    const save = () => {
        // Official [team, placement]; our user source follows. The quantifier goes in its own slot.
        setIntParams([team, placement - 1, userSource]);
    };

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footerCollapsible={false}
                showQuantifier={false}
                footer={
                    <div className="flex flex-col gap-2">
                        <BaseButton className="octane-wired__advanced-toggle" type="button" onClick={() => setShowAdvanced((value) => !value)}>
                            {LocalizeText(showAdvanced ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                        </BaseButton>
                        {showAdvanced && (
                            <>
                                <WiredConditionQuantifierSection />
                                <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />
                            </>
                        )}
                    </div>
                }
            >
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.team')}</Text>
                    {TEAM_OPTIONS.map((value) => {
                        const labelKey = value === 0 ? 'wiredfurni.params.team.triggerer' : `wiredfurni.params.team.${value}`;

                        return (
                            <div key={value} className="flex items-center gap-1">
                                <Radio checked={team === value} id={`teamHasRank${value}`} name="teamHasRank" onCheckedChange={() => setTeam(value)} />
                                <Text>{LocalizeText(labelKey)}</Text>
                            </div>
                        );
                    })}
                </div>
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.placement_selection')}</Text>
                    {PLACEMENT_OPTIONS.map((value) => {
                        return (
                            <div key={value} className="flex items-center gap-1">
                                <Radio checked={placement === value} id={`teamRankPlacement${value}`} name="teamRankPlacement" onCheckedChange={() => setPlacement(value)} />
                                <Text>{LocalizeText(`wiredfurni.params.placement.${value}`)}</Text>
                            </div>
                        );
                    })}
                </div>
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
