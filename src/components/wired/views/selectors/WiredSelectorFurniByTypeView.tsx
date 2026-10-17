import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { hasWiredAdvancedSources, WiredAdvancedSourceRows } from '../WiredAdvancedSourceRows';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { Checkbox } from '../../../../common/Checkbox';


export const WiredSelectorFurniByTypeView: FC<{}> = () => {
    const [matchState, setMatchState] = useState(false);
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);
    const [furniSource, setFurniSource] = useState(100);

    // Official layout: [match state], the picked furni (the types) in the official source slot.
    const { trigger = null, setIntParams, setSelectorOptions = null, setSourceTypes = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        const p = trigger.intData;
        setMatchState(p[0] === 1);
        setFilterExisting(trigger.isFilter ?? false);
        setInvert(trigger.isInvert ?? false);
        setFurniSource(trigger.furniSourceTypes?.[0] ?? trigger.inputSourcesConf?.furniDefaults?.[0] ?? 100);
    }, [trigger]);

    // The type source is the advanced row of the server-listed furni selection; without that list the picks are the types.
    const hasSourceRows = hasWiredAdvancedSources(trigger);

    const save = useCallback(() => {
        setIntParams([matchState ? 1 : 0]);
        if (!hasSourceRows) setSourceTypes({ furni: [100], users: [] });
        setSelectorOptions({ filter: filterExisting, invert });
    }, [matchState, filterExisting, invert, hasSourceRows, setIntParams, setSourceTypes, setSelectorOptions]);

    const requiresFurni = !hasSourceRows || furniSource === 100 ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;

    return (
        <WiredSelectorBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            hideDelay={true}
            cardStyle={{ width: 400 }}
            footer={hasSourceRows ? <WiredAdvancedSourceRows onFurniSourceChange={(slot, value) => slot === 0 && setFurniSource(value)} /> : null}
        >
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
