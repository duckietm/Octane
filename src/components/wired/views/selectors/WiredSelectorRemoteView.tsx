import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { Checkbox } from '../../../../common/Checkbox';

const MAX_PICK_COUNT = 20;

/**
 * The official "remote selection" (code 19): runs the picked selector boxes and combines what they
 * select. Int params [combine type (0 union, 1 intersection), random pick count (0 = every picked one)];
 * filter / invert are the official selector fields. Without a picked selector it falls back to the
 * signal's furni or the picks (ours).
 */
export const WiredSelectorRemoteView: FC<{}> = () => {
    const [intersect, setIntersect] = useState(false);
    const [pickCount, setPickCount] = useState(0);
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);
    const { trigger = null, setIntParams = null, setSelectorOptions = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        setIntersect(trigger.intData?.[0] === 1);
        setPickCount(Math.max(0, Math.min(MAX_PICK_COUNT, trigger.intData?.[1] ?? 0)));
        setFilterExisting(trigger.isFilter ?? false);
        setInvert(trigger.isInvert ?? false);
    }, [trigger]);

    const save = useCallback(() => {
        setIntParams([intersect ? 1 : 0, pickCount]);
        setSelectorOptions({ filter: filterExisting, invert });
    }, [filterExisting, intersect, invert, pickCount, setIntParams, setSelectorOptions]);

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
                <Text small>{localizeWithFallback('wiredfurni.params.remote_selection.info', 'Pick selector boxes of other stacks; their selections are used here.')}</Text>

                <Text bold>{localizeWithFallback('wiredfurni.params.remote_selection.type', 'Selection type')}</Text>
                {[false, true].map((value) => (
                    <label key={String(value)} className="flex items-center gap-1">
                        <input type="radio" className="form-check-input" name="remoteSelectionType" checked={intersect === value} onChange={() => setIntersect(value)} />
                        <Text>{localizeWithFallback(`wiredfurni.params.remote_selection.type.${value ? 1 : 0}`, value ? 'Intersection' : 'Union')}</Text>
                    </label>
                ))}

                <label className="flex items-center gap-2">
                    <Text>{localizeWithFallback('wiredfurni.params.remote_selection.filter', 'Use this many of the picked, at random (0 = all)')}</Text>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        style={{ width: 64 }}
                        min={0}
                        max={MAX_PICK_COUNT}
                        value={pickCount}
                        onChange={(event) => setPickCount(Math.max(0, Math.min(MAX_PICK_COUNT, parseInt(event.target.value, 10) || 0)))}
                    />
                </label>

                <hr className="m-0 bg-dark" />

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
