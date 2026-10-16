import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { Checkbox } from '../../../../common/Checkbox';


export const WiredSelectorFurniByTypeView: FC<{}> = () => {
    const [matchState, setMatchState] = useState(false);
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);

    // Official layout: [match state], the picked furni (the types) in the official source slot.
    const { trigger = null, setIntParams, setSelectorOptions = null, setSourceTypes = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        const p = trigger.intData;
        setMatchState(p[0] === 1);
        setFilterExisting(trigger.isFilter ?? false);
        setInvert(trigger.isInvert ?? false);
    }, [trigger]);

    const save = useCallback(() => {
        setIntParams([matchState ? 1 : 0]);
        setSourceTypes({ furni: [100], users: [] });
        setSelectorOptions({ filter: filterExisting, invert });
    }, [matchState, filterExisting, invert, setIntParams]);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={requiresFurni} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                    <Checkbox checked={matchState} onCheckedChange={(nextChecked) => setMatchState(nextChecked)} />
                    <Text small>{LocalizeText('wiredfurni.params.state_match')}</Text>
                </label>

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
