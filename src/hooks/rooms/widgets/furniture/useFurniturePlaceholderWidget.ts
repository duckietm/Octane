import { RoomEngineTriggerWidgetEvent } from '@octane/renderer';
import { useState } from 'react';
import { useOctaneEvent } from '../../../events';

/**
 * `PlaceholderWidget`: furniture whose logic is `furniture_placeholder` opens a fixed
 * "not yet available" window. Nothing is read from the object and nothing is sent.
 */
const useFurniturePlaceholderWidgetState = () => {
    const [isVisible, setIsVisible] = useState(false);

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_PLACEHOLDER, () => setIsVisible(true));

    return { isVisible, onClose: () => setIsVisible(false) };
};

export const useFurniturePlaceholderWidget = useFurniturePlaceholderWidgetState;
