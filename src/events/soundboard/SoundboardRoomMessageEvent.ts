import { OctaneEvent } from '@octane/renderer';

export class SoundboardRoomMessageEvent extends OctaneEvent {
    public static readonly ROOM_MESSAGE = 'SOUNDBOARD_ROOM_MESSAGE';

    constructor(
        public readonly username: string,
        public readonly soundName: string,
        public readonly actorUserId: number,
        public readonly actorRoomIndex: number
    ) {
        super(SoundboardRoomMessageEvent.ROOM_MESSAGE);
    }
}
