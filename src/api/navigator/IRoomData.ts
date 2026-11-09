import { IRoomChatSettings } from './IRoomChatSettings';
import { IRoomModerationSettings } from './IRoomModerationSettings';

export interface IRoomData {
    roomId: number;
    roomName: string;
    roomDescription: string;
    categoryId: number;
    userCount: number;
    tags: string[];
    tradeState: number;
    allowWalkthrough: boolean;
    allowUnderpass: boolean;
    muteAllPets: boolean;
    leaveOnDoorTileEnabled: boolean;
    idleSleepEnabled: boolean;
    idleSleepTimeoutSeconds: number;
    idleAutokickEnabled: boolean;
    idleAutokickTimeoutSeconds: number;
    lockState: number;
    password: string;
    allowPets: boolean;
    allowPetsEat: boolean;
    hideWalls: boolean;
    wallThickness: number;
    floorThickness: number;
    chatSettings: IRoomChatSettings;
    moderationSettings: IRoomModerationSettings;
    /** Hidden because it holds Builders Club furni while the owner has no membership. */
    hiddenByBc?: boolean;
}
