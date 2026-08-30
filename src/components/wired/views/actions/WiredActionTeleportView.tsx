import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { WiredActionLayoutCode } from '../../../../api/wired/WiredActionLayoutCode';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionTeleportView: FC<{}> = (props) => {
    const { trigger = null, setIntParams = null } = useWired();
    const isTeleportEffect = trigger?.code === WiredActionLayoutCode.TELEPORT;
    const isUserToFurniEffect = trigger?.code === WiredActionLayoutCode.USER_TO_FURNI;
    /** Same three slots as the teleport, but it walks — so no "teleport instantly" to offer. */
    const isWalkToFurni = trigger?.code === WiredActionLayoutCode.WALK_TO_FURNI;
    const usesTeleportSlots = isTeleportEffect || isWalkToFurni;
    const [fastTeleport, setFastTeleport] = useState<boolean>(() => {
        if (isTeleportEffect && trigger?.intData?.length >= 3) return trigger.intData[0] === 1;
        return false;
    });
    const [walkMode, setWalkMode] = useState<number>(() => {
        if (isUserToFurniEffect && trigger?.intData?.length >= 3) return trigger.intData[2];
        return 1;
    });

    const [furniSource, setFurniSource] = useState<number>(() => {
        if (usesTeleportSlots && trigger?.intData?.length >= 3) return trigger.intData[1];
        if (isUserToFurniEffect && trigger?.intData?.length >= 3) return trigger.intData[0];
        if (trigger?.intData?.length >= 1) return trigger.intData[0];
        return (trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0;
    });

    const [userSource, setUserSource] = useState<number>(() => {
        if (usesTeleportSlots && trigger?.intData?.length >= 3) return trigger.intData[2];
        if (isUserToFurniEffect && trigger?.intData?.length >= 3) return trigger.intData[1];
        if (trigger?.intData?.length >= 2) return trigger.intData[1];
        return 0;
    });

    useEffect(() => {
        if (!trigger) return;

        if (usesTeleportSlots && trigger.intData.length >= 3) {
            setFastTeleport(trigger.intData[0] === 1);
            setFurniSource(trigger.intData[1]);
            setUserSource(trigger.intData[2]);
            setWalkMode(1);
            return;
        }

        if (isUserToFurniEffect && trigger.intData.length >= 3) {
            setFastTeleport(false);
            setFurniSource(trigger.intData[0]);
            setUserSource(trigger.intData[1]);
            setWalkMode(trigger.intData[2]);
            return;
        }

        setFastTeleport(false);
        setWalkMode(1);

        if (trigger.intData.length >= 1) setFurniSource(trigger.intData[0]);
        else setFurniSource((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0);

        if (trigger.intData.length >= 2) setUserSource(trigger.intData[1]);
        else setUserSource(0);
    }, [isUserToFurniEffect, isWalkToFurni, usesTeleportSlots, trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () =>
        setIntParams(
            usesTeleportSlots
                ? [fastTeleport ? 1 : 0, furniSource, userSource]
                : isUserToFurniEffect
                  ? [furniSource, userSource, walkMode]
                  : [furniSource, userSource]
        );

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={
                <WiredSourcesSelector
                    showFurni={true}
                    showUsers={true}
                    furniSource={furniSource}
                    userSource={userSource}
                    onChangeFurni={onChangeFurniSource}
                    onChangeUsers={setUserSource}
                />
            }
        >
            {isTeleportEffect && (
                <div className="flex items-center gap-1">
                    <input checked={fastTeleport} className="form-check-input" type="checkbox" onChange={(event) => setFastTeleport(event.target.checked)} />
                    <Text>{LocalizeText('wiredfurni.params.teleport.options.0')}</Text>
                </div>
            )}
            {isUserToFurniEffect && (
                <div className="flex flex-col gap-1">
                    {[0, 1, 2].map((option) => (
                        <label key={option} className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={walkMode === option}
                                className="form-check-input"
                                name="userWalkMode"
                                type="radio"
                                onChange={() => setWalkMode(option)}
                            />
                            <Text>{LocalizeText(`wiredfurni.params.user_move.walkmode.${option}`)}</Text>
                        </label>
                    ))}
                </div>
            )}
        </WiredActionBaseView>
    );
};
