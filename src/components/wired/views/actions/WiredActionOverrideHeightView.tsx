import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

/**
 * Puts the selected furni at a height you type, or hands them back their stacking height.
 *
 * The official dialog is a two-way choice and a slider over thousandths of a tile, 0 to 8000, so
 * 2400 reads as 2.400. The furni source row underneath is this fork's own, the way every other furni
 * effect offers it.
 */

const MIN_HEIGHT = 0;
const MAX_HEIGHT = 8000;
const HEIGHT_STEP = 1;

const MODE_SET = 0;
const MODE_RELEASE = 1;

const MODE_LABELS: Record<number, { key: string; fallback: string }> = {
    [MODE_SET]: { key: 'wiredfurni.params.override_height.type.0', fallback: 'Set this height' },
    [MODE_RELEASE]: { key: 'wiredfurni.params.override_height.type.1', fallback: 'Back to the stacking height' }
};

const formatHeight = (value: number) => (value / 1000).toFixed(3);

const clampHeight = (value: number) => {
    if (!Number.isFinite(value)) return MIN_HEIGHT;
    return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(value)));
};

export const WiredActionOverrideHeightView: FC<{}> = (props) => {
    const { trigger = null, setIntParams = null } = useWired();

    const [height, setHeight] = useState<number>(0);
    const [heightInput, setHeightInput] = useState<string>('0.000');
    const [mode, setMode] = useState<number>(MODE_SET);
    const [furniSource, setFurniSource] = useState<number>(0);

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        const nextHeight = clampHeight(data.length > 0 ? data[0] : 0);

        setHeight(nextHeight);
        setHeightInput(formatHeight(nextHeight));
        setMode(data.length > 1 && data[1] === MODE_RELEASE ? MODE_RELEASE : MODE_SET);
        setFurniSource(data.length > 2 ? data[2] : (trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0);
    }, [trigger]);

    const updateHeight = (value: number) => {
        const next = clampHeight(value);
        setHeight(next);
        setHeightInput(formatHeight(next));
    };

    // Typing is left alone until blur, so a half-written "2." is not rewritten under the cursor.
    const updateHeightInput = (value: string) => {
        setHeightInput(value);

        const parsed = Number.parseFloat(value.replace(',', '.'));
        if (Number.isFinite(parsed)) setHeight(clampHeight(parsed * 1000));
    };

    const save = () => setIntParams([height, mode, furniSource]);

    return (
        <WiredActionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT} save={save} footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}>
            <div className="flex flex-col gap-2">
                {[MODE_SET, MODE_RELEASE].map((value) => (
                    <div key={value} className="flex items-center gap-1">
                        <input checked={mode === value} className="form-check-input" id={`overrideHeightMode${value}`} name="overrideHeightMode" type="radio" onChange={() => setMode(value)} />
                        <Text>{localizeWithFallback(MODE_LABELS[value].key, MODE_LABELS[value].fallback)}</Text>
                    </div>
                ))}
            </div>
            {mode === MODE_SET && (
                <>
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.override_height.height', 'Height')}</Text>
                        <input className="form-control form-control-sm" inputMode="decimal" type="text" value={heightInput} onBlur={() => setHeightInput(formatHeight(height))} onChange={(event) => updateHeightInput(event.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Slider max={MAX_HEIGHT} min={MIN_HEIGHT} step={HEIGHT_STEP} value={height} onChange={(event) => updateHeight(event as number)} />
                        <Text small>{formatHeight(height)}</Text>
                    </div>
                </>
            )}
        </WiredActionBaseView>
    );
};
