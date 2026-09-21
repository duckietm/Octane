import { RoomObjectCategory } from '@octane/renderer';
import { FC, PropsWithChildren, useEffect, useMemo, useRef } from 'react';
import { AddAnimationTickerCallback, GetRoomObjectBounds } from '../../../../api';
import { useRoom, useWiredVariableFxEvents, useWiredVariableFxStore } from '../../../../hooks';
import { groupWiredVariableFxStatuses } from './WiredVariableFxOverlay.helpers';
import { WiredVariableFxStatusView } from './WiredVariableFxStatusView';

interface WiredVariableFxEntityViewProps {
    roomId: number;
    userEntity: boolean;
    entityId: number;
}

/** A pile of fx that follows one avatar or floor furni around the room, like the object location widget. */
const WiredVariableFxEntityView: FC<PropsWithChildren<WiredVariableFxEntityViewProps>> = (props) => {
    const { roomId, userEntity, entityId, children } = props;
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const category = userEntity ? RoomObjectCategory.UNIT : RoomObjectCategory.FLOOR;

        const updatePosition = () => {
            const element = elementRef.current;

            if (!element) return;

            const bounds = GetRoomObjectBounds(roomId, entityId, category, 1);

            if (!bounds) {
                element.style.visibility = 'hidden';
                return;
            }

            element.style.visibility = 'visible';
            element.style.left = `${Math.round(bounds.left + bounds.width / 2)}px`;
            element.style.top = `${Math.round(bounds.top - element.offsetHeight - (userEntity ? 14 : 4))}px`;
        };

        updatePosition();

        return AddAnimationTickerCallback(updatePosition);
    }, [roomId, userEntity, entityId]);

    return (
        <div ref={elementRef} className="octane-wired-fx-overlay__entity" style={{ visibility: 'hidden' }} data-testid="fx-entity">
            {children}
        </div>
    );
};

/**
 * Draws the room's wired variable fx (health points, progress, levels, status and boss bars,
 * numbers) as DOM overlays above the avatars and furni holding the variables, plus boss bars
 * along the top of the room. What to draw comes from the four fx packets through the store.
 */
export const WiredVariableFxOverlayView: FC<{}> = () => {
    useWiredVariableFxEvents();

    const { roomSession = null } = useRoom();
    const configs = useWiredVariableFxStore((state) => state.configs);
    const statuses = useWiredVariableFxStore((state) => state.statuses);
    const groups = useMemo(() => groupWiredVariableFxStatuses(configs, statuses), [configs, statuses]);

    if (!roomSession || (!groups.entities.length && !groups.bosses.length)) return null;

    return (
        <div className="octane-wired-fx-overlay" data-testid="fx-overlay">
            {groups.bosses.length > 0 && (
                <div className="octane-wired-fx-overlay__bosses">
                    {groups.bosses.map((drawn) => (
                        <WiredVariableFxStatusView key={drawn.entry.key} config={drawn.config} entry={drawn.entry} />
                    ))}
                </div>
            )}
            {groups.entities.map((group) => (
                <WiredVariableFxEntityView key={group.entityKey} roomId={roomSession.roomId} userEntity={group.userEntity} entityId={group.entityId}>
                    {group.drawn.map((drawn) => (
                        <WiredVariableFxStatusView key={drawn.entry.key} config={drawn.config} entry={drawn.entry} />
                    ))}
                </WiredVariableFxEntityView>
            ))}
        </div>
    );
};
