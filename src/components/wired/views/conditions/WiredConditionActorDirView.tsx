import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WIRED_DIRECTION_GRID, WiredDirectionIcon } from '../WiredDirectionIcon';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';

const toggleDirection = (mask: number, direction: number, checked: boolean) => {
    if (checked) return mask | (1 << direction);

    return mask & ~(1 << direction);
};

export const WiredConditionActorDirView: FC<{}> = () => {
    // Official layout: [direction mask, our quantifier], the users in the official source slot.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [directionMask, setDirectionMask] = useState(0);
    const [userSource, setUserSource] = useState(0);
    const [quantifier, setQuantifier] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (!trigger) return;

        const nextDirectionMask = trigger.intData.length > 0 ? trigger.intData[0] : 0;
        const nextUserSource = trigger.userSourceTypes?.[0] ?? 0;
        const nextQuantifier = trigger.intData.length > 1 ? trigger.intData[1] : 0;

        setDirectionMask(nextDirectionMask);
        setUserSource(nextUserSource);
        setQuantifier(nextQuantifier === 1 ? 1 : 0);
        setShowAdvanced(nextUserSource !== 0 || nextQuantifier !== 0);
    }, [trigger]);

    const save = () => {
        setIntParams([directionMask, quantifier]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <button className="btn btn-link p-0 align-self-start" type="button" onClick={() => setShowAdvanced((value) => !value)}>
                        {LocalizeText(showAdvanced ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                    </button>
                    {showAdvanced && (
                        <>
                            <div className="flex flex-col gap-1">
                                <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                                {[0, 1].map((value) => {
                                    return (
                                        <label key={value} className="flex items-center gap-1">
                                            <Radio checked={quantifier === value} name="actorDirQuantifier" onCheckedChange={() => setQuantifier(value)} />
                                            <Text>{LocalizeText(`wiredfurni.params.quantifier.users.${value}`)}</Text>
                                        </label>
                                    );
                                })}
                            </div>
                            <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />
                        </>
                    )}
                </div>
            }
        >
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.direction_selection')}</Text>
                <div className="grid grid-cols-4 gap-2 max-w-[240px]">
                    {WIRED_DIRECTION_GRID.flatMap((row, rowIndex) =>
                        row.map((direction, columnIndex) => {
                            if (direction === null) {
                                return <div key={`actor-dir-empty-${rowIndex}-${columnIndex}`} />;
                            }

                            const checked = (directionMask & (1 << direction)) !== 0;

                            return (
                                <label key={`actor-dir-${direction}`} className="flex items-center justify-center gap-[2px] cursor-pointer">
                                    <Checkbox checked={checked} onCheckedChange={(nextChecked) => setDirectionMask(toggleDirection(directionMask, direction, nextChecked))} />
                                    <span className="inline-flex items-center justify-center">
                                        <WiredDirectionIcon direction={direction} selected={checked} />
                                    </span>
                                </label>
                            );
                        })
                    )}
                </div>
            </div>
        </WiredConditionBaseView>
    );
};
