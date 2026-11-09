import { OctaneTexture, RenderRoomMessageComposer } from '@octane/renderer';

export class CameraPicture {
    constructor(
        public texture: OctaneTexture,
        public imageUrl: string,
        // camera.render.mode "server": the AIR scene captured when the shutter fired (AIR keeps one per roll slot).
        public renderRoomMessage: RenderRoomMessageComposer = null
    ) {}
}
