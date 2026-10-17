import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { FURNI_SOURCES, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';

// Ours (wf_act_pickup_furni, code 1156). Server WiredEffectRemoveFurni: intParams = [mode, furniSource]. furniSource is resolved via
// WiredSourceUtil.resolveItems, which supports SELECTED(100)/SELECTOR(200)/SIGNAL(201)/TRIGGER(0).
const MODE_RETURN = 0;
const MODE_DELETE = 1;
const SOURCE_SELECTED = 100;

const normalizeFurniSource = (value: number) =>
    FURNI_SOURCES.some((option) => option.value === value) ? value : SOURCE_SELECTED;

export const WiredActionRemoveFurniView: FC<{}> = () => {
    const { trigger = null, setFurniIds = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [mode, setMode] = useState<number>(MODE_RETURN);
    const [furniSource, setFurniSource] = useState<number>(SOURCE_SELECTED);

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        setMode(data.length > 0 ? data[0] : MODE_RETURN);
        setFurniSource(normalizeFurniSource(trigger.furniSourceTypes?.[0] ?? SOURCE_SELECTED));
    }, [trigger]);

    const requiresFurni = furniSource === SOURCE_SELECTED ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;

    const save = () => {
        // Ours: [mode]; the furni source is the official source slot.
        setIntParams([mode]);
        setSourceTypes({ furni: [furniSource], users: [] });
        if (furniSource !== SOURCE_SELECTED) setFurniIds?.([]);
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <div className="flex flex-col gap-2">
                <Text bold>{localizeWithFallback('wiredfurni.removefurni.instructions', 'Choose what happens to the removed furni:')}</Text>
                <div className="flex items-center gap-1">
                    <Radio name="removeMode" checked={mode === MODE_RETURN} onCheckedChange={() => setMode(MODE_RETURN)} />
                    <Text>{localizeWithFallback('wiredfurni.removefurni.mode.return', "Return to owner's inventory")}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <Radio name="removeMode" checked={mode === MODE_DELETE} onCheckedChange={() => setMode(MODE_DELETE)} />
                    <Text>{localizeWithFallback('wiredfurni.removefurni.mode.delete', 'Delete permanently (cannot be undone)')}</Text>
                </div>
            </div>
        </WiredActionBaseView>
    );
};
