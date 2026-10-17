import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Radio } from '../../../../common/Radio';

const TEAM_OPTIONS = [0, 1, 2, 3, 4];
const PLACEMENT_OPTIONS = [1, 2, 3, 4];

export const WiredConditionTeamHasRankView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [team, setTeam] = useState(1);
    const [placement, setPlacement] = useState(1);
    const [userSource, setUserSource] = useState(0);
    const [quantifier, setQuantifier] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (!trigger) return;

        const nextTeam = trigger.intData.length > 0 ? trigger.intData[0] : 1;
        // Officially the placement is 0 (first) .. 3 (fourth); the editor shows 1-4.
        const nextPlacement = trigger.intData.length > 1 ? trigger.intData[1] + 1 : 1;
        const nextUserSource = trigger.intData.length > 2 ? trigger.intData[2] : 0;
        const nextQuantifier = trigger.intData.length > 3 ? trigger.intData[3] : 0;

        setTeam(TEAM_OPTIONS.includes(nextTeam) ? nextTeam : 1);
        setPlacement(PLACEMENT_OPTIONS.includes(nextPlacement) ? nextPlacement : 1);
        setUserSource(nextUserSource);
        setQuantifier(nextQuantifier === 1 ? 1 : 0);
        setShowAdvanced(nextUserSource !== 0 || nextQuantifier !== 0);
    }, [trigger]);

    const save = () => {
        setIntParams([team, placement - 1, userSource, quantifier]);
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <button className="btn btn-link p-0 align-self-start" type="button" onClick={() => setShowAdvanced((value) => !value)}>
                        {LocalizeText(showAdvanced ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                    </button>
                    {showAdvanced && (
                        <>
                            <div className="flex flex-col gap-1">
                                <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                                {[0, 1].map((value) => {
                                    return (
                                        <div key={value} className="flex items-center gap-1">
                                            <Radio checked={quantifier === value} id={`teamRankQuantifier${value}`} name="teamRankQuantifier" onCheckedChange={() => setQuantifier(value)} />
                                            <Text>{LocalizeText(`wiredfurni.params.quantifier.users.${value}`)}</Text>
                                        </div>
                                    );
                                })}
                            </div>
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
    );
};
