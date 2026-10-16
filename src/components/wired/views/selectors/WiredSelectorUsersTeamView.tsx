import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { Checkbox } from '../../../../common/Checkbox';

const TEAM_TYPES = [0, 1, 2, 3, 4];

export const WiredSelectorUsersTeamView: FC<{}> = () => {
    const [teamType, setTeamType] = useState(0);
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);
    const { trigger = null, setIntParams = null, setSelectorOptions = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        const params = trigger.intData;

        setTeamType(params.length > 0 ? params[0] : 0);
        setFilterExisting(trigger.isFilter ?? false);
        setInvert(trigger.isInvert ?? false);
    }, [trigger]);

    const save = useCallback(() => {
        setIntParams([teamType]);
        setSelectorOptions({ filter: filterExisting, invert });
    }, [teamType, filterExisting, invert, setIntParams]);

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.team')}</Text>
                    {TEAM_TYPES.map((value) => (
                        <label key={value} className="flex items-center gap-1">
                            <input
                                checked={teamType === value}
                                className="form-check-input"
                                name="usersTeamSelector"
                                type="radio"
                                onChange={() => setTeamType(value)}
                            />
                            <Text>{LocalizeText(value === 0 ? 'wiredfurni.params.team.any' : `wiredfurni.params.team.${value}`)}</Text>
                        </label>
                    ))}
                </div>

                <hr className="m-0 bg-dark" />

                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>

                <label className="flex items-center gap-2">
                    <Checkbox checked={filterExisting} onCheckedChange={(nextChecked) => setFilterExisting(nextChecked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>

                <label className="flex items-center gap-2">
                    <Checkbox checked={invert} onCheckedChange={(nextChecked) => setInvert(nextChecked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>
            </div>
        </WiredSelectorBaseView>
    );
};
