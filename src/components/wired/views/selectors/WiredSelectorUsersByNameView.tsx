import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorUsersByNameView: FC<{}> = () => {
    const [namesText, setNamesText] = useState('');
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        const params = trigger.intData;

        setNamesText(trigger.stringData || '');
        setFilterExisting(params.length > 0 ? params[0] === 1 : false);
        setInvert(params.length > 1 ? params[1] === 1 : false);
    }, [trigger]);

    const save = useCallback(() => {
        setStringParam(namesText);
        setIntParams([filterExisting ? 1 : 0, invert ? 1 : 0]);
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
                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={filterExisting}
                        onChange={(event) => setFilterExisting(event.target.checked)}
                    />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>

                <label className="flex items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={invert} onChange={(event) => setInvert(event.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>
            </div>
        </WiredSelectorBaseView>
    );
};
