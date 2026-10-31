import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/**
 * Habbo's achievement enabler add-on (`wf_xtra_achievement_enabler`): names the achievements the
 * room's progress-achievement boxes may progress. Server: WiredExtraAchievementEnabler, string param
 * the names (comma, semicolon or space separated), no int params.
 */

export const ACHIEVEMENT_ENABLER_MAX_LENGTH = 2000;

export const WiredExtraAchievementEnablerView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [text, setText] = useState('');

    useEffect(() => {
        if (!trigger) return;

        setText(trigger.stringData ?? '');
    }, [trigger]);

    const save = () => {
        setIntParams([]);
        setStringParam(text.slice(0, ACHIEVEMENT_ENABLER_MAX_LENGTH));
    };

    return (
        <NativeTextTree>
            <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.achievement_enabler', 'Achievements')}</Text>
                    <textarea
                        className="form-control form-control-sm"
                        maxLength={ACHIEVEMENT_ENABLER_MAX_LENGTH}
                        placeholder={localizeWithFallback('wiredfurni.params.achievement_enabler.placeholder', 'ACH_MyGame1, ACH_MyGame2')}
                        rows={3}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                    />
                    <Text small>
                        {localizeWithFallback(
                            'wiredfurni.params.achievement_enabler.hint',
                            'The achievements this room may progress. Only the ones the hotel allows for wired work.'
                        )}
                    </Text>
                </div>
            </WiredExtraBaseView>
        </NativeTextTree>
    );
};
