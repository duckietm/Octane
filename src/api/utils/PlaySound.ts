import { MouseEventType, OctaneSoundEvent } from '@octane/renderer';
import { DispatchMainEvent } from '../events';

let canPlaySound = false;

export const PlaySound = (sampleCode: string) => {
    if (!canPlaySound) return;

    DispatchMainEvent(new OctaneSoundEvent(OctaneSoundEvent.PLAY_SOUND, sampleCode));
};

const eventTypes = [MouseEventType.MOUSE_CLICK];

const startListening = () => {
    const stopListening = () => eventTypes.forEach((type) => window.removeEventListener(type, onEvent));

    const onEvent = (event: Event) => (canPlaySound = true) && stopListening();

    eventTypes.forEach((type) => window.addEventListener(type, onEvent));
};

startListening();
