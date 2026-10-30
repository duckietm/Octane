import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { Radio } from '../../../../common/Radio';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export const WiredSelectorFurniOnFurniView: FC<{}> = () => {
    // Official layout: [selection type], the furni in the official source slot, filter / invert in the official fields.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [selectionType, setSelectionType] = useState(0);
    const [furniSource, setFurniSource] = useState<number>(() => trigger?.furniSourceTypes?.[0] ?? ((trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0));

    useEffect(() => {
        if (!trigger) return;

        setSelectionType(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setFurniSource(trigger.furniSourceTypes?.[0] ?? ((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0));
    }, [trigger]);

    const save = () => {
        setIntParams([selectionType]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    return (
        <NativeTextTree>
            <WiredSelectorBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
                save={save}
                hideDelay={true}
                footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
            >
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('wiredfurni.params.selection_type')}</Text>
                        {[0, 1, 2, 3].map((value) => {
                            return (
                                <label key={value} className="flex items-center gap-1">
                                    <Radio checked={selectionType === value} name="furniOnFurniSelectionType" onCheckedChange={() => setSelectionType(value)} />
                                    <Text>{LocalizeText(`wiredfurni.params.onfurni.${value}`)}</Text>
                                </label>
                            );
                        })}
                    </div>

                </div>
            </WiredSelectorBaseView>
        </NativeTextTree>
    );
};
