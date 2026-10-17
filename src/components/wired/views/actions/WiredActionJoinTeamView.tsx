import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';

/** How the team is picked: the chosen one, the one with the fewest members, or a random one. */
export const JOIN_TEAM_MODES: Array<{ fallback: string; value: number }> = [
    { fallback: 'The chosen team', value: 0 },
    { fallback: 'The smallest team', value: 1 },
    { fallback: 'A random team', value: 2 }
];

const normalizeJoinMode = (value: number): number => (value === 1 || value === 2 ? value : 0);

/**
 * Official: the team (two columns) first, then the team type; [team, team type]. Ours follows: the
 * join mode, as a third int. The user source is the official source slot.
 */
export const WiredActionJoinTeamView: FC<{}> = () => {
    const [selectedTeamType, setSelectedTeamType] = useState(0);
    const [selectedTeam, setSelectedTeam] = useState(1);
    const [joinMode, setJoinMode] = useState(0);
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => slotUserSource(trigger));

    const save = () => {
        setIntParams([selectedTeam, selectedTeamType, joinMode]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        if (!trigger) return;

        const team = trigger.intData?.[0] ?? 1;

        setSelectedTeam(team >= 1 && team <= 4 ? team : 1);
        setSelectedTeamType(trigger.intData?.[1] ?? 0);
        setJoinMode(normalizeJoinMode(trigger.intData?.[2]));
        setUserSource(slotUserSource(trigger));
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.team')}</Text>
                <div className="grid grid-cols-2 gap-1">
                    {[1, 2, 3, 4].map((team) => (
                        <label key={team} className="flex gap-1">
                            <Radio checked={selectedTeam === team} disabled={joinMode !== 0} id={`selectedTeam${team}`} name="selectedTeam" onCheckedChange={() => setSelectedTeam(team)} />
                            <Text>{LocalizeText(`wiredfurni.params.team.${team}`)}</Text>
                        </label>
                    ))}
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.choose_type')}</Text>
                {[
                    { value: 0, label: 'Wired' },
                    { value: 1, label: 'Banzai' },
                    { value: 2, label: 'Freeze' }
                ].map((option) => (
                    <label key={option.value} className="flex gap-1">
                        <Radio checked={selectedTeamType === option.value} id={`selectedTeamType${option.value}`} name="selectedTeamType" onCheckedChange={() => setSelectedTeamType(option.value)} />
                        <Text>{localizeWithFallback(`wiredfurni.params.team_type.${option.value}`, option.label)}</Text>
                    </label>
                ))}
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.team.join_mode', 'Join')}</Text>
                {JOIN_TEAM_MODES.map((mode) => (
                    <label key={mode.value} className="flex gap-1">
                        <Radio checked={joinMode === mode.value} id={`joinMode${mode.value}`} name="joinMode" onCheckedChange={() => setJoinMode(mode.value)} />
                        <Text>{localizeWithFallback(`wiredfurni.params.team.join_mode.${mode.value}`, mode.fallback)}</Text>
                    </label>
                ))}
            </div>
        </WiredActionBaseView>
    );
};
