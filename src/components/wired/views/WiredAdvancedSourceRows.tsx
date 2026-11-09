import { Triggerable } from '@octane/renderer';
import { FC, Fragment, useEffect, useState } from 'react';
import { useWired } from '../../../hooks';
import { WiredSourcesSelector } from './WiredSourcesSelector';

export interface WiredAdvancedSourceRowsProps {
    /** Furni / user slots that the card draws itself (an inline section claims them). */
    skipFurni?: number[];
    skipUsers?: number[];
    /** Title keys per slot; the default source titles otherwise. */
    furniTitles?: Record<number, string>;
    usersTitles?: Record<number, string>;
    /** Called when a furni slot changes, e.g. so the card can show or hide its picks. */
    onFurniSourceChange?: (slot: number, value: number) => void;
}

const listedSlots = (allowed: number[][] | undefined, skip: number[]) =>
    (allowed ?? []).map((values, slot) => (values?.length && !skip.includes(slot) ? slot : -1)).filter((slot) => slot >= 0);

const currentSources = (sources: number[] | undefined, defaults: number[] | undefined, count: number) =>
    Array.from({ length: count }, (_, index) => sources?.[index] ?? defaults?.[index] ?? 0);

/** True when the server lists a furni or user selection for the generic advanced rows. */
export const hasWiredAdvancedSources = (trigger: Triggerable | null, skipFurni: number[] = [], skipUsers: number[] = []) => {
    const conf = trigger?.inputSourcesConf;

    if (!trigger?.advancedMode || !conf) return false;

    return listedSlots(conf.furniAllowed, skipFurni).length > 0 || listedSlots(conf.userAllowed, skipUsers).length > 0;
};

/**
 * The generic advanced section of the official editor (UserDefinedRoomEventsCtrl.createAdvancedSections): one source row per
 * furni and user selection the server lists for the box, in the server's order. The rows edit the box's source slots, which
 * the save sends.
 */
export const WiredAdvancedSourceRows: FC<WiredAdvancedSourceRowsProps> = (props) => {
    const { skipFurni = [], skipUsers = [], furniTitles = {}, usersTitles = {}, onFurniSourceChange = null } = props;
    const { trigger = null, setSourceTypes = null } = useWired();
    const conf = trigger?.inputSourcesConf;
    const [furni, setFurni] = useState<number[]>([]);
    const [users, setUsers] = useState<number[]>([]);

    useEffect(() => {
        if (!trigger) return;

        const conf = trigger.inputSourcesConf;

        setFurni(currentSources(trigger.furniSourceTypes, conf?.furniDefaults, conf?.furniAllowed?.length ?? 0));
        setUsers(currentSources(trigger.userSourceTypes, conf?.userDefaults, conf?.userAllowed?.length ?? 0));
    }, [trigger]);

    if (!trigger?.advancedMode || !conf) return null;

    const furniSlots = listedSlots(conf.furniAllowed, skipFurni);
    const userSlots = listedSlots(conf.userAllowed, skipUsers);

    const change = (kind: 'furni' | 'users', slot: number, value: number) => {
        const nextFurni = kind === 'furni' ? furni.map((entry, index) => (index === slot ? value : entry)) : furni;
        const nextUsers = kind === 'users' ? users.map((entry, index) => (index === slot ? value : entry)) : users;

        setFurni(nextFurni);
        setUsers(nextUsers);
        setSourceTypes?.({ furni: nextFurni, users: nextUsers });

        if (kind === 'furni') onFurniSourceChange?.(slot, value);
    };

    return (
        <div className="flex flex-col gap-2">
            {furniSlots.map((slot, index) => (
                <Fragment key={`furni-${slot}`}>
                    {index > 0 && <hr className="m-0 bg-dark" />}
                    <WiredSourcesSelector
                        showFurni={true}
                        furniSlot={slot}
                        furniSource={furni[slot] ?? 0}
                        furniTitle={furniTitles[slot]}
                        onChangeFurni={(value) => change('furni', slot, value)}
                    />
                </Fragment>
            ))}
            {userSlots.map((slot, index) => (
                <Fragment key={`users-${slot}`}>
                    {(furniSlots.length > 0 || index > 0) && <hr className="m-0 bg-dark" />}
                    <WiredSourcesSelector
                        showUsers={true}
                        userSlot={slot}
                        userSource={users[slot] ?? 0}
                        usersTitle={usersTitles[slot]}
                        onChangeUsers={(value) => change('users', slot, value)}
                    />
                </Fragment>
            ))}
        </div>
    );
};
