import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

/**
 * What the text field holds. The badge, tag and motto conditions all store a string plus the same
 * user source and quantifier, so they share this dialog — but a tag is not a badge code and neither
 * is a motto, and each has its own length limit. `null` is for the gender and room-rights conditions,
 * whose answer comes from the user rather than from anything typed: they hide the field entirely.
 */
type WiredTextField = 'badge' | 'tag' | 'motto';

const TEXT_FIELDS: Record<WiredTextField, { key: string; fallback: string; maxLength?: number; tooltipKey?: string }> = {
    // Official: a 1000 character field with the badge code tooltip.
    badge: { key: 'wiredfurni.params.badgecode', fallback: 'Badge code', maxLength: 1000, tooltipKey: 'wiredfurni.tooltip.badgecode' },
    tag: { key: 'wiredfurni.params.tag', fallback: 'Tag', maxLength: 38 },
    motto: { key: 'wiredfurni.params.motto_contains', fallback: 'Motto contains', maxLength: 64 }
};

interface WiredConditionActorIsWearingBadgeViewProps {
    field?: WiredTextField | null;
}

export const WiredConditionActorIsWearingBadgeView: FC<WiredConditionActorIsWearingBadgeViewProps> = ({ field = 'badge' }) => {
    const [badge, setBadge] = useState('');
    // Official layout: the badge in the string, no int params, the users in the official source slot; the
    // quantifier is the base view's.
    const { trigger = null, setStringParam = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => trigger?.userSourceTypes?.[0] ?? 0);

    const text = field ? TEXT_FIELDS[field] : null;

    const save = () => {
        setStringParam(text ? badge : '');
        setIntParams([]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        setBadge(trigger.stringData);
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            >
                {text && (
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback(text.key, text.fallback)}</Text>
                        <OctaneInput
                            maxLength={text.maxLength}
                            title={text.tooltipKey ? LocalizeText(text.tooltipKey) : undefined}
                            type="text"
                            value={badge}
                            onChange={(event) => setBadge(event.target.value)}
                        />
                    </div>
                )}
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
