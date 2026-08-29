import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { NitroInput } from '../../../../layout';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

interface WiredConditionActorIsWearingBadgeViewProps {
    negative?: boolean;
    /**
     * The gender and room-rights conditions share this dialog because they need the same user source
     * and quantifier — but their answer comes from the user, not from something you type. They pass
     * false so the badge-code field stays out of the window.
     */
    showBadge?: boolean;
}

export const WiredConditionActorIsWearingBadgeView: FC<WiredConditionActorIsWearingBadgeViewProps> = ({ negative = false, showBadge = true }) => {
    const [badge, setBadge] = useState('');
    const [quantifier, setQuantifier] = useState(1);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length >= 1) return trigger.intData[0];
        return 0;
    });

    const save = () => {
        setStringParam(showBadge ? badge : '');
        setIntParams([userSource, quantifier]);
    };

    useEffect(() => {
        setBadge(trigger.stringData);
        if (trigger.intData.length >= 1) setUserSource(trigger.intData[0]);
        else setUserSource(0);
        setQuantifier(trigger.intData.length >= 2 ? (trigger.intData[1] === 1 ? 1 : 0) : 1);
    }, [trigger]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                {[0, 1].map((value) => (
                    <label key={value} className="flex items-center gap-1">
                        <input
                            checked={quantifier === value}
                            className="form-check-input"
                            name="badgeQuantifier"
                            type="radio"
                            onChange={() => setQuantifier(value)}
                        />
                        <Text>{LocalizeText(`wiredfurni.params.quantifier.users${negative ? '.neg' : ''}.${value}`)}</Text>
                    </label>
                ))}
            </div>
            {showBadge && (
                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.badgecode', 'Badge code')}</Text>
                    <NitroInput type="text" value={badge} onChange={(event) => setBadge(event.target.value)} />
                </div>
            )}
        </WiredConditionBaseView>
    );
};
