import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Radio } from '../../../../common/Radio';

/**
 * What the text field holds. The badge, tag and motto conditions all store a string plus the same
 * user source and quantifier, so they share this dialog — but a tag is not a badge code and neither
 * is a motto, and each has its own length limit. `null` is for the gender and room-rights conditions,
 * whose answer comes from the user rather than from anything typed: they hide the field entirely.
 */
type WiredTextField = 'badge' | 'tag' | 'motto';

const TEXT_FIELDS: Record<WiredTextField, { key: string; fallback: string; maxLength?: number }> = {
    badge: { key: 'wiredfurni.params.badgecode', fallback: 'Badge code' },
    tag: { key: 'wiredfurni.params.tag', fallback: 'Tag', maxLength: 38 },
    motto: { key: 'wiredfurni.params.motto_contains', fallback: 'Motto contains', maxLength: 64 }
};

interface WiredConditionActorIsWearingBadgeViewProps {
    negative?: boolean;
    field?: WiredTextField | null;
}

export const WiredConditionActorIsWearingBadgeView: FC<WiredConditionActorIsWearingBadgeViewProps> = ({ negative = false, field = 'badge' }) => {
    const [badge, setBadge] = useState('');
    const [quantifier, setQuantifier] = useState(1);
    // Official layout: the badge in the string, [our quantifier], the users in the official source slot.
    const { trigger = null, setStringParam = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => trigger?.userSourceTypes?.[0] ?? 0);

    const text = field ? TEXT_FIELDS[field] : null;

    const save = () => {
        setStringParam(text ? badge : '');
        setIntParams([quantifier]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        setBadge(trigger.stringData);
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
        setQuantifier(trigger.intData[0] === 1 ? 1 : 0);
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
                        <Radio checked={quantifier === value} name="badgeQuantifier" onCheckedChange={() => setQuantifier(value)} />
                        <Text>{LocalizeText(`wiredfurni.params.quantifier.users${negative ? '.neg' : ''}.${value}`)}</Text>
                    </label>
                ))}
            </div>
            {text && (
                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback(text.key, text.fallback)}</Text>
                    <OctaneInput
                        maxLength={text.maxLength}
                        type="text"
                        value={badge}
                        onChange={(event) => setBadge(event.target.value)}
                    />
                </div>
            )}
        </WiredConditionBaseView>
    );
};
