import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { Checkbox } from '../../../../common/Checkbox';

export const WiredSelectorFurniOnFurniView: FC<{}> = () => {
    // Official layout: [selection type], the furni in the official source slot, filter / invert in the official fields.
    const { trigger = null, setIntParams = null, setSelectorOptions = null, setSourceTypes = null } = useWired();
    const [selectionType, setSelectionType] = useState(0);
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);
    const [furniSource, setFurniSource] = useState<number>(() => trigger?.furniSourceTypes?.[0] ?? ((trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0));

    useEffect(() => {
        if (!trigger) return;

        setSelectionType(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setFurniSource(trigger.furniSourceTypes?.[0] ?? ((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0));
        setFilterExisting(trigger.isFilter ?? false);
        setInvert(trigger.isInvert ?? false);
    }, [trigger]);

    const save = () => {
        setIntParams([selectionType]);
        setSourceTypes({ furni: [furniSource], users: [] });
        setSelectorOptions({ filter: filterExisting, invert });
    };

    return (
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
                                <input
                                    checked={selectionType === value}
                                    className="form-check-input"
                                    name="furniOnFurniSelectionType"
                                    type="radio"
                                    onChange={() => setSelectionType(value)}
                                />
                                <Text>{LocalizeText(`wiredfurni.params.onfurni.${value}`)}</Text>
                            </label>
                        );
                    })}
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
