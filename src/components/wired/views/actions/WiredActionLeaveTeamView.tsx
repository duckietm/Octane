import { FC, useEffect, useState } from 'react';
import { WiredActionLayoutCode, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export const WiredActionLeaveTeamView: FC<{}> = (props) => {
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    /**
     * "All users leave team" walks every habbo in the room, so the source picker never chose its
     * targets. The saved value is still sent back untouched, because it decides whether the stack
     * needs a triggering user.
     */
    const showSource = trigger?.code !== WiredActionLayoutCode.ALL_USERS_LEAVE_TEAM;
    const [userSource, setUserSource] = useState<number>(() => slotUserSource(trigger));

    useEffect(() => {
        if (!trigger) return;
        setUserSource(slotUserSource(trigger));
    }, [trigger]);

    // Official: no int params; the user source is the official source slot.
    const save = () => {
        setIntParams([]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    return (
        <NativeTextTree>
            <WiredActionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footer={showSource ? <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} /> : null}
            />
        </NativeTextTree>
    );
};
