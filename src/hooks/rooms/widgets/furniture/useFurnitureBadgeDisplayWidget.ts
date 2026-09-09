import {
    BadgeInfoEvent,
    GetBadgeInfoComposer,
    GetRoomEngine,
    GetSessionDataManager,
    RoomEngineTriggerWidgetEvent,
    RoomObjectVariable,
    StringDataType
} from '@octane/renderer';
import { useState } from 'react';
import { GetConfigurationValue, LocalizeBadgeDescription, LocalizeBadgeName, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../api';
import {
    formatBadgeOwnerCount,
    getBadgeRarityLabelKey,
    rememberBadgeRarityFromPacket,
    shouldShowBadgeOwnerCount
} from '../../../../api/badges/badgeRarity';
import { useMessageEvent, useOctaneEvent } from '../../../events';
import { useNotification } from '../../../notification';
import { useFurniRemovedEvent } from '../../engine';

const BADGE_RARITY_LABEL_FALLBACKS: Record<string, string> = {
    'badge.rarity.common': 'Common',
    'badge.rarity.uncommon': 'Uncommon',
    'badge.rarity.rare': 'Rare',
    'badge.rarity.epic': 'Epic',
    'badge.rarity.mythical': 'Mythical',
    'badge.rarity.legendary': 'Legendary',
    'badge.rarity.unique': 'Unique'
};

/**
 * Official `FurnitureBadgeDisplayWidgetHandler.getBadgeDisplayMessage` (AIR 13): the engraving is
 * the badge description, then the rarity line, then the owner count when it is still meaningful.
 */
const buildEngraving = (badgeDesc: string, tier: number, ownerCount: number): string => {
    const uncommonEnabled = GetConfigurationValue<boolean>('badge_rarity.uncommon', false) === true;
    const labelKey = getBadgeRarityLabelKey(tier, uncommonEnabled);
    const rarityLabel = localizeWithFallback(labelKey, BADGE_RARITY_LABEL_FALLBACKS[labelKey] ?? labelKey);

    const parts: string[] = [];

    if (badgeDesc) parts.push(`${ badgeDesc }


`);

    parts.push(localizeWithFallback('badge.rarity.badge', `${ rarityLabel } badge`, ['rarity'], [rarityLabel]));

    if (shouldShowBadgeOwnerCount(ownerCount))
    {
        const ownerCountText = formatBadgeOwnerCount(ownerCount);

        parts.push(` - ${ localizeWithFallback('badge.owner_count', `Owned by ${ ownerCountText } Habbos`, ['count'], [ownerCountText]) }`);
    }

    return parts.join('');
};

const useFurnitureBadgeDisplayWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [category, setCategory] = useState(-1);
    const [color, setColor] = useState('1');
    const [badgeName, setBadgeName] = useState('');
    const [badgeDesc, setBadgeDesc] = useState('');
    const [date, setDate] = useState('');
    const [senderName, setSenderName] = useState('');
    const [pendingBadgeCode, setPendingBadgeCode] = useState<string>(null);
    const { simpleAlert = null } = useNotification();

    const onClose = () => {
        setObjectId(-1);
        setCategory(-1);
        setColor('1');
        setBadgeName('');
        setBadgeDesc('');
        setDate('');
        setSenderName('');
        setPendingBadgeCode(null);
    };

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(
        [RoomEngineTriggerWidgetEvent.REQUEST_BADGE_DISPLAY_ENGRAVING, RoomEngineTriggerWidgetEvent.REQUEST_ACHIEVEMENT_RESOLUTION_ENGRAVING],
        (event) => {
            const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

            if (!roomObject) return;

            const stringStuff = new StringDataType();

            stringStuff.initializeFromRoomObjectModel(roomObject.model);

            // Official `handleEngravingRequest`: value 1 is the badge code, value 2 the owner and
            // value 3 the date the plate was engraved.
            const badgeCode = stringStuff.getValue(1);
            const isBadgeDisplay = event.type === RoomEngineTriggerWidgetEvent.REQUEST_BADGE_DISPLAY_ENGRAVING;

            setObjectId(event.objectId);
            setCategory(event.category);
            setColor('1');
            setBadgeName(LocalizeBadgeName(badgeCode));
            setBadgeDesc(LocalizeBadgeDescription(badgeCode));
            setSenderName(stringStuff.getValue(2));
            setDate(stringStuff.getValue(3));
            setPendingBadgeCode(isBadgeDisplay ? badgeCode : null);

            // Official: only the badge display asks the server for the rarity engraving; the
            // achievement resolution plate is drawn straight from the stuff data.
            if (isBadgeDisplay && badgeCode) SendMessageComposer(new GetBadgeInfoComposer(badgeCode));
        }
    );

    // Official `onBadgeInfo`: the reply re-engraves the plate with the rarity tier and, while it is
    // still meaningful, how many Habbos own the badge.
    useMessageEvent<BadgeInfoEvent>(BadgeInfoEvent, (event) => {
        const parser = event.getParser();

        rememberBadgeRarityFromPacket([{ badgeCode: parser.badgeCode, ownerCount: parser.ownerCount, badgeRarityId: parser.badgeRarityId }]);

        if (!pendingBadgeCode || parser.badgeCode !== pendingBadgeCode) return;

        setBadgeDesc((prevValue) => buildEngraving(LocalizeBadgeDescription(parser.badgeCode) || prevValue, parser.badgeRarityId, parser.ownerCount));
        setPendingBadgeCode(null);
    });

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_ACHIEVEMENT_RESOLUTION_FAILED, (event) => {
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject) return;

        const ownerId = roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_OWNER_ID);

        if (ownerId !== GetSessionDataManager().userId) return;

        simpleAlert(
            `${LocalizeText('resolution.failed.subtitle')} ${LocalizeText('resolution.failed.text')}`,
            null,
            null,
            null,
            LocalizeText('resolution.failed.title')
        );
    });

    useFurniRemovedEvent(objectId !== -1 && category !== -1, (event) => {
        if (event.id !== objectId || event.category !== category) return;

        onClose();
    });

    return { objectId, category, color, badgeName, badgeDesc, date, senderName, onClose };
};

export const useFurnitureBadgeDisplayWidget = useFurnitureBadgeDisplayWidgetState;
