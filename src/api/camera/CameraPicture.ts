import { OctaneTexture } from '@octane/renderer';

export class CameraPicture {
    constructor(
        public texture: OctaneTexture,
        public imageUrl: string
    ) {}
}
