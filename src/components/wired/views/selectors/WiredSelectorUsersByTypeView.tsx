import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const USER_TYPES = [1, 2, 4];

export const WiredSelectorUsersByTypeView: FC<{}> = () => {
    const [userType, setUserType] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        const params = trigger.intData;

        setUserType(params.length > 0 ? params[0] : 1);
    }, [trigger]);

    const save = useCallback(() => {
        // Official type mask: any of Habbo (1), pet (2) and bot (4).
        setIntParams([userType || 1]);
    }, [userType, setIntParams]);

    return (
        <NativeTextTree>
            <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('wiredfurni.params.usertype')}</Text>
                        {USER_TYPES.map((value) => (
                            <label key={value} className="flex items-center gap-1">
                                <Checkbox checked={(userType & value) !== 0} name="usersByTypeSelector" onCheckedChange={() => setUserType((current) => current ^ value)} />
                                <Text>{LocalizeText(`wiredfurni.params.usertype.${value}`)}</Text>
                            </label>
                        ))}
                    </div>

                </div>
            </WiredSelectorBaseView>
        </NativeTextTree>
    );
};
