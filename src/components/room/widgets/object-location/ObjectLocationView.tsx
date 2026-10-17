import { FC, useEffect, useRef, useState } from 'react';
import { AddAnimationTickerCallback, GetRoomObjectBounds, GetRoomSession } from '../../../../api';
import { BaseProps } from '../../../../common';

interface ObjectLocationViewProps extends BaseProps<HTMLDivElement> {
    objectId: number;
    category: number;
    noFollow?: boolean;
}

export const ObjectLocationView: FC<ObjectLocationViewProps> = (props) => {
    const { objectId = -1, category = -1, noFollow = false, ...rest } = props;
    const [pos, setPos] = useState<{ x: number; y: number }>({ x: -1, y: -1 });
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let remove: () => void = null;

        const getObjectLocation = () => {
            const roomSession = GetRoomSession();

            if (!roomSession) return null;

            const objectBounds = GetRoomObjectBounds(roomSession.roomId, objectId, category, 1);

            return objectBounds;
        };

        const updatePosition = () => {
            const bounds = getObjectLocation();

            if (!bounds || !elementRef.current) return;

            const x = Math.round(bounds.left + bounds.width / 2 - elementRef.current.offsetWidth / 2);
            const y = Math.round(bounds.top - elementRef.current.offsetHeight + 10);

            // Runs every ticker frame: keep the old object when nothing moved so React skips the render.
            setPos((previous) => (previous.x === x && previous.y === y ? previous : { x, y }));
        };

        if (noFollow) {
            updatePosition();
        } else {
            remove = AddAnimationTickerCallback(updatePosition);
        }

        return () => {
            if (remove) remove();
        };
    }, [objectId, category, noFollow]);

    return (
        <div
            ref={elementRef}
            className="object-location absolute"
            style={{ left: pos.x, top: pos.y, visibility: pos.x + (elementRef.current ? elementRef.current.offsetWidth : 0) > -1 ? 'visible' : 'hidden' }}
            {...rest}
        />
    );
};
