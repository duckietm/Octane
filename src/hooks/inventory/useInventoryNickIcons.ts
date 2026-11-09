import { RequestNickIconsComposer, SetActiveNickIconComposer, UserNickIconsEvent } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { INickIconItem, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { useSharedVisibility } from '../useSharedVisibility';

const useInventoryNickIconsState = () => {
    const [needsUpdate, setNeedsUpdate] = useState(true);
    const [nickIcons, setNickIcons] = useState<INickIconItem[]>([]);
    const [activeNickIcon, setActiveNickIcon] = useState<INickIconItem | null>(null);
    const [selectedNickIcon, setSelectedNickIcon] = useState<INickIconItem | null>(null);
    const { isVisible = false, activate = null, deactivate = null } = useSharedVisibility();

    useMessageEvent<UserNickIconsEvent>(UserNickIconsEvent, (event) => {
        const parser = event.getParser();
        const ownedNickIcons = parser.nickIcons
            .filter((icon) => icon.owned)
            .map((icon) => ({
                id: icon.id,
                iconKey: icon.iconKey,
                displayName: icon.displayName,
                points: icon.points,
                pointsType: icon.pointsType,
                owned: true,
                active: icon.active
            }));

        setNickIcons(ownedNickIcons);
        setActiveNickIcon(ownedNickIcons.find((icon) => icon.active) || null);
    });

    const activateNickIcon = (nickIconId: number) => {
        SendMessageComposer(new SetActiveNickIconComposer(nickIconId));
    };

    const deactivateNickIcon = () => {
        SendMessageComposer(new SetActiveNickIconComposer(0));
    };

    useEffect(() => {
        if (!nickIcons.length) {
            setSelectedNickIcon(null);
            return;
        }

        setSelectedNickIcon((prevValue) => {
            if (prevValue && nickIcons.find((icon) => icon.id === prevValue.id)) return prevValue;
            return nickIcons[0];
        });
    }, [nickIcons]);

    useEffect(() => {
        if (!isVisible || !needsUpdate) return;

        SendMessageComposer(new RequestNickIconsComposer());
        setNeedsUpdate(false);
    }, [isVisible, needsUpdate]);

    return {
        nickIcons,
        activeNickIcon,
        selectedNickIcon,
        setSelectedNickIcon,
        activateNickIcon,
        deactivateNickIcon,
        activate,
        deactivate
    };
};

export const useInventoryNickIcons = () => useSharedHook(useInventoryNickIconsState);

registerSharedHook(useInventoryNickIconsState);
