import { FC, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Text } from '../../../../common';
import { Checkbox } from '../../../../common/Checkbox';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';

/**
 * Official createSelectorOptions: one framework section for every selector, "Selector options" with
 * Filter (`selector_option.0`) and Invert (`selector_option.1`). It reads the box's saved choice and hands
 * every change to the save (`setSelectorOptions`), which also asks before an invert without a filter.
 */
export const WiredSelectorOptionsSection: FC<{}> = () => {
    const { trigger = null, setSelectorOptions = null } = useWired();
    const [filter, setFilter] = useState(false);
    const [invert, setInvert] = useState(false);

    useEffect(() => {
        if (!trigger) return;

        const options = { filter: trigger.isFilter ?? false, invert: trigger.isInvert ?? false };

        setFilter(options.filter);
        setInvert(options.invert);
        setSelectorOptions?.(options);
    }, [trigger, setSelectorOptions]);

    const update = (next: { filter: boolean; invert: boolean }) => {
        setFilter(next.filter);
        setInvert(next.invert);
        setSelectorOptions?.(next);
    };

    return (
        <NativeTextTree>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>
                <label className="flex items-center gap-2">
                    <Checkbox checked={filter} onCheckedChange={(checked) => update({ filter: checked, invert })} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>
                <label className="flex items-center gap-2">
                    <Checkbox checked={invert} onCheckedChange={(checked) => update({ filter, invert: checked })} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>
            </div>
        </NativeTextTree>
    );
};
