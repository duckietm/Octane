import { FC, useEffect, useState } from 'react';
import { WiredActionLayoutCode, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionLeaveTeamView: FC<{}> = (props) => {
    const { trigger = null, setIntParams = null } = useWired();
    /**
     * "All users leave team" walks every habbo in the room, so the source picker never chose its
     * targets. The saved value is still sent back untouched, because it decides whether the stack
     * needs a triggering user.
     */
    const showSource = trigger?.code !== WiredActionLayoutCode.ALL_USERS_LEAVE_TEAM;
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length >= 1) return trigger.intData[0];
        return 0;
    });

    useEffect(() => {
        if (!trigger) return;
        if (trigger.intData.length >= 1) setUserSource(trigger.intData[0]);
        else setUserSource(0);
    }, [trigger]);

    const save = () => setIntParams([userSource]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={showSource ? <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} /> : null}
        />
    );
};
