import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export const WiredActionUnfreezeView: FC<{}> = () => {
    const [userSource, setUserSource] = useState(0);
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();

    // Official: no int params; the user source is the official source slot.
    const save = () => {
        setIntParams([]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        setUserSource(slotUserSource(trigger));
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredActionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            />
        </NativeTextTree>
    );
};
