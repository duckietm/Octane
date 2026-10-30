import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WIRED_MOVE_ICONS, WIRED_SEQUENTIAL_DIRECTIONS, WiredIconCheckboxGroup } from '../WiredMoveIconRadios';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { WiredConditionQuantifierSection } from './WiredConditionQuantifierSection';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

// Official: 8 icon checkboxes move_0..move_7, 4 per row (0 1 2 3 / 4 5 6 7).
const DIRECTION_OPTIONS = WIRED_SEQUENTIAL_DIRECTIONS.map((direction) => ({ value: direction, icon: WIRED_MOVE_ICONS[direction] }));

const toggleDirection = (mask: number, direction: number, checked: boolean) => {
    if (checked) return mask | (1 << direction);

    return mask & ~(1 << direction);
};

export const WiredConditionActorDirView: FC<{}> = () => {
    // Official layout: [direction mask], the users in the official source slot; the quantifier section sits in
    // this view's advanced block.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [directionMask, setDirectionMask] = useState(0);
    const [userSource, setUserSource] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (!trigger) return;

        const nextDirectionMask = trigger.intData.length > 0 ? trigger.intData[0] : 0;
        const nextUserSource = trigger.userSourceTypes?.[0] ?? 0;

        setDirectionMask(nextDirectionMask);
        setUserSource(nextUserSource);
        setShowAdvanced(nextUserSource !== 0 || (trigger.quantifierCode ?? 0) !== 0);
    }, [trigger]);

    const save = () => {
        setIntParams([directionMask]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footerCollapsible={false}
                showQuantifier={false}
                footer={
                    <div className="flex flex-col gap-2">
                        <BaseButton className="btn btn-link p-0 align-self-start" type="button" onClick={() => setShowAdvanced((value) => !value)}>
                            {LocalizeText(showAdvanced ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                        </BaseButton>
                        {showAdvanced && (
                            <>
                                <WiredConditionQuantifierSection />
                                <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />
                            </>
                        )}
                    </div>
                }
            >
                <div className="flex flex-col gap-2">
                    <Text bold>{LocalizeText('wiredfurni.params.direction_selection')}</Text>
                    <WiredIconCheckboxGroup
                        options={DIRECTION_OPTIONS}
                        isChecked={(direction) => (directionMask & (1 << direction)) !== 0}
                        onChange={(direction, checked) => setDirectionMask((mask) => toggleDirection(mask, direction, checked))}
                    />
                </div>
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
