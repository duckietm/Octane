import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, readWiredUserAction, wiredUserActionExtra, WiredUserActionChoice } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredUserActionSection } from '../WiredUserActionSection';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { Checkbox } from '../../../../common/Checkbox';


export const WiredSelectorUsersByActionView: FC<{}> = () => {
    const [choice, setChoice] = useState<WiredUserActionChoice>(() => readWiredUserAction([], ''));
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);
    const { trigger = null, setIntParams = null, setStringParam = null, setSelectorOptions = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        setChoice(readWiredUserAction(trigger.intData ?? [], trigger.stringData ?? ''));
        setFilterExisting(trigger.isFilter ?? false);
        setInvert(trigger.isInvert ?? false);
    }, [trigger]);

    // Official: [action], the sign / dance extra in the string, filter and invert in the selector switches.
    const save = useCallback(() => {
        setIntParams([choice.action]);
        setStringParam(wiredUserActionExtra(choice));
        setSelectorOptions({ filter: filterExisting, invert });
    }, [choice, filterExisting, invert, setIntParams, setSelectorOptions, setStringParam]);

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
                <WiredUserActionSection choice={choice} onChange={setChoice} />
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
