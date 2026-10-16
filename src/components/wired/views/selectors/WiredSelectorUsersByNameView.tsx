import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { Checkbox } from '../../../../common/Checkbox';

export const WiredSelectorUsersByNameView: FC<{}> = () => {
    const [namesText, setNamesText] = useState('');
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);
    const { trigger = null, setIntParams = null, setStringParam = null, setSelectorOptions = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        const params = trigger.intData;

        setNamesText(trigger.stringData || '');
        setFilterExisting(trigger.isFilter ?? false);
        setInvert(trigger.isInvert ?? false);
    }, [trigger]);

    const save = useCallback(() => {
        setStringParam(namesText);
        setIntParams([]);
        setSelectorOptions({ filter: filterExisting, invert });
    }, [namesText, filterExisting, invert, setStringParam, setIntParams]);

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.enter_names')}</Text>
                    <textarea
                        className="form-control form-control-sm octane-wired__resizable-textarea"
                        value={namesText}
                        onChange={(event) => setNamesText(event.target.value)}
                    />
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
