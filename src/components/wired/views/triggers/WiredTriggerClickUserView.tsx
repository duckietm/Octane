import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';
import { Checkbox } from '../../../../common/Checkbox';

export const WiredTriggerClickUserView: FC<{}> = () => {
    const [blockMenuOpen, setBlockMenuOpen] = useState(false);
    const [doNotRotate, setDoNotRotate] = useState(false);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([blockMenuOpen ? 1 : 0, doNotRotate ? 1 : 0]);

    useEffect(() => {
        setBlockMenuOpen(trigger?.intData?.length > 0 ? trigger.intData[0] === 1 : false);
        setDoNotRotate(trigger?.intData?.length > 1 ? trigger.intData[1] === 1 : false);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.click_user.settings')}</Text>
                <div className="flex items-center gap-1">
                    <Checkbox checked={blockMenuOpen} id="clickUserBlockMenuOpen" onCheckedChange={(nextChecked) => setBlockMenuOpen(nextChecked)} />
                    <Text>{LocalizeText('wiredfurni.params.click_user.block_menu_open')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <Checkbox checked={doNotRotate} id="clickUserDoNotRotate" onCheckedChange={(nextChecked) => setDoNotRotate(nextChecked)} />
                    <Text>{LocalizeText('wiredfurni.params.click_user.do_not_rotate')}</Text>
                </div>
            </div>
        </WiredTriggerBaseView>
    );
};
