import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';
import { Radio } from '../../../../common/Radio';

export const WiredTriggerAvatarLeaveRoomView: FC<{}> = (props) => {
    const [username, setUsername] = useState('');
    const [avatarMode, setAvatarMode] = useState(0);
    const { trigger = null, setStringParam = null } = useWired();

    const save = () => setStringParam(avatarMode === 1 ? username : '');

    useEffect(() => {
        setUsername(trigger.stringData);
        setAvatarMode(trigger.stringData ? 1 : 0);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.picktriggerer')}</Text>
                <div className="flex items-center gap-1">
                    <Radio checked={avatarMode === 0} id="avatarMode0" name="avatarMode" onCheckedChange={() => setAvatarMode(0)} />
                    <Text>{LocalizeText('wiredfurni.params.anyavatar')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <Radio checked={avatarMode === 1} id="avatarMode1" name="avatarMode" onCheckedChange={() => setAvatarMode(1)} />
                    <Text>{LocalizeText('wiredfurni.params.certainavatar')}</Text>
                </div>
                {avatarMode === 1 && <OctaneInput type="text" value={username} onChange={(event) => setUsername(event.target.value)} />}
            </div>
        </WiredTriggerBaseView>
    );
};
