import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSliderSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotFurniSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';

/**
 * Puts the selected furni at a height you type, or hands them back their stacking height.
 *
 * Official: the two-way choice in its section, then a slider section over 0 to 8000 (thousandths of
 * a tile, shown as they are) that is disabled for "back to the stacking height". Ints: [height, type];
 * the furni source is the official source slot.
 */

const MIN_HEIGHT = 0;
const MAX_HEIGHT = 8000;

const MODE_SET = 0;
const MODE_RELEASE = 1;

const MODE_LABELS: Record<number, { key: string; fallback: string }> = {
    [MODE_SET]: { key: 'wiredfurni.params.override_height.type.0', fallback: 'Set this height' },
    [MODE_RELEASE]: { key: 'wiredfurni.params.override_height.type.1', fallback: 'Back to the stacking height' }
};

const clampHeight = (value: number) => {
    if (!Number.isFinite(value)) return MIN_HEIGHT;
    return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(value)));
};

export const WiredActionOverrideHeightView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();

    const [height, setHeight] = useState<number>(0);
    const [mode, setMode] = useState<number>(MODE_SET);
    const [furniSource, setFurniSource] = useState<number>(0);

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];

        setHeight(clampHeight(data.length > 0 ? data[0] : 0));
        setMode(data.length > 1 && data[1] === MODE_RELEASE ? MODE_RELEASE : MODE_SET);
        setFurniSource(slotFurniSource(trigger));
    }, [trigger]);

    const save = () => {
        setIntParams([height, mode]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <div className="flex flex-col gap-2">
                <Text bold>{localizeWithFallback('wiredfurni.params.override_height.type', 'Height')}</Text>
                {[MODE_SET, MODE_RELEASE].map((value) => (
                    <label key={value} className="flex items-center gap-1">
                        <Radio checked={mode === value} name="overrideHeightMode" onCheckedChange={() => setMode(value)} />
                        <Text>{localizeWithFallback(MODE_LABELS[value].key, MODE_LABELS[value].fallback)}</Text>
                    </label>
                ))}
            </div>
            <div className={mode === MODE_RELEASE ? 'pointer-events-none opacity-50' : ''}>
                <WiredSliderSection
                    max={MAX_HEIGHT}
                    min={MIN_HEIGHT}
                    title={localizeWithFallback('wiredfurni.params.override_height.height', 'Height')}
                    value={height}
                    onChange={(value) => setHeight(clampHeight(value))}
                />
            </div>
        </WiredActionBaseView>
    );
};
