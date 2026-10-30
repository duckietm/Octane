import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotFurniSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export const WiredActionNegativeCallAnotherStackView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => slotFurniSource(trigger));

    useEffect(() => {
        if (!trigger) return;

        setFurniSource(slotFurniSource(trigger));
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    // Official: no int params; the furni source is the official source slot.
    const save = () => {
        setIntParams([]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    return (
        <NativeTextTree>
            <WiredActionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
                save={save}
                footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
            />
        </NativeTextTree>
    );
};
