import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { WiredActionLayoutCode } from '../../../../api/wired/WiredActionLayoutCode';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotFurniSource, slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';

/**
 * Teleport (official [fast]), our walk to furni (laid out the same), move furni to user (official: no
 * ints) and move user to furni (official [walk mode], 0 by default). The furni and user sources are
 * the official source slots.
 */
export const WiredActionTeleportView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const isTeleportEffect = trigger?.code === WiredActionLayoutCode.TELEPORT;
    const isUserToFurniEffect = trigger?.code === WiredActionLayoutCode.USER_TO_FURNI;
    const isFurniToUserEffect = trigger?.code === WiredActionLayoutCode.FURNI_TO_USER;
    /** Same params as the teleport, but it walks, so no "teleport instantly" to offer. */
    const isWalkToFurni = trigger?.code === WiredActionLayoutCode.WALK_TO_FURNI;
    const usesFastSlot = isTeleportEffect || isWalkToFurni;
    const [fastTeleport, setFastTeleport] = useState(false);
    const [walkMode, setWalkMode] = useState(0);
    const [furniSource, setFurniSource] = useState<number>(() => slotFurniSource(trigger));
    const [userSource, setUserSource] = useState<number>(() => slotUserSource(trigger));

    useEffect(() => {
        if (!trigger) return;

        setFastTeleport(usesFastSlot && trigger.intData?.[0] === 1);
        setWalkMode(isUserToFurniEffect ? (trigger.intData?.[0] ?? 0) : 0);
        setFurniSource(slotFurniSource(trigger));
        setUserSource(slotUserSource(trigger));
    }, [isUserToFurniEffect, usesFastSlot, trigger]);

    const save = () => {
        setIntParams(usesFastSlot ? [fastTeleport ? 1 : 0] : isUserToFurniEffect ? [walkMode] : []);
        setSourceTypes({ furni: [furniSource], users: [userSource] });
    };

    const furniTitle = isFurniToUserEffect ? 'wiredfurni.params.sources.furni.title.mv.0' : isUserToFurniEffect ? 'wiredfurni.params.sources.furni.title.mv.1' : undefined;
    const usersTitle = isFurniToUserEffect ? 'wiredfurni.params.sources.furni.title.mv_user' : isUserToFurniEffect ? 'wiredfurni.params.sources.furni.title.mv_user2' : undefined;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={
                <WiredSourcesSelector
                    showFurni={true}
                    showUsers={true}
                    furniSource={furniSource}
                    furniTitle={furniTitle}
                    userSource={userSource}
                    usersTitle={usersTitle}
                    onChangeFurni={setFurniSource}
                    onChangeUsers={setUserSource}
                />
            }
        >
            {isTeleportEffect && (
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.teleport.options')}</Text>
                    <label className="flex items-center gap-1">
                        <Checkbox checked={fastTeleport} onCheckedChange={(nextChecked) => setFastTeleport(nextChecked)} />
                        <Text>{LocalizeText('wiredfurni.params.teleport.options.0')}</Text>
                    </label>
                </div>
            )}
            {isUserToFurniEffect && (
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.user_move.walkmode')}</Text>
                    {[0, 1, 2].map((option) => (
                        <label key={option} className="flex items-center gap-1 cursor-pointer">
                            <Radio checked={walkMode === option} name="userWalkMode" onCheckedChange={() => setWalkMode(option)} />
                            <Text>{LocalizeText(`wiredfurni.params.user_move.walkmode.${option}`)}</Text>
                        </label>
                    ))}
                </div>
            )}
        </WiredActionBaseView>
    );
};
