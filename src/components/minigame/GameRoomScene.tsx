import { AvatarAction, GetRoomEngine, Vector3d } from '@octane/renderer';
import { CSSProperties, FC, ReactNode, useEffect, useMemo, useState } from 'react';
import { GetSessionDataManager } from '../../api';
import { LayoutFurniImageView } from '../../common';
import { useUnoAvatar } from '../uno/useUnoAvatar';
import '../../css/minigame/GameRoom.css';

/**
 * A game played in a room of the hotel: the room's floor and walls (14 x 10 tiles), the
 * hotel's own furni drawn by its renderer, the players as the hotel's avatars (standing, sitting, holding up a sign,
 * in an effect), their names and what they say, and the game's own pieces on top. Tile (x, y) has its top corner at
 * ROOM_ORIGIN + (32 * (x - y), 16 * (x + y)).
 */
export const ROOM_W = 792;
export const ROOM_H = 536;
export const ROOM_ORIGIN = { x: 332, y: 132 };

export const roomPoint = (x: number, y: number, z = 0) => ({ left: ROOM_ORIGIN.x + 32 * (x - y), top: ROOM_ORIGIN.y + 16 * (x + y) - 32 * z });

/** A piece of the hotel's furniture: by name, or by id for a coloured one (`name*n` is not found by name). */
export interface IRoomFurni {
    name: string;
    id?: number;
    x: number;
    y: number;
    dir: number;
    /** Its size on the floor (its front corner is at x + size, y + size). */
    size?: number;
    sizeY?: number;
    state?: number;
    /** Drawn above the others at its place (a wall item, a sign). */
    lift?: number;
}

export interface IRoomAvatar {
    key: string | number;
    figure: string;
    gender: string;
    /** The tile it stands on. */
    x: number;
    y: number;
    dir: number;
    posture?: string;
    sign?: number;
    effect?: number;
    name?: string;
    you?: boolean;
    bubble?: string | null;
    /** Something shown above the head (a score, a mark). */
    above?: ReactNode;
    dimmed?: boolean;
}

const FEET_FROM_BOTTOM = 14;

const furniId = (furni: IRoomFurni): number | undefined => furni.id ?? GetSessionDataManager()?.getFloorItemDataByName?.(furni.name)?.id;

/** The renderer is asked for each furni's picture once; when they come in, the room is drawn again. */
const useFurniLoads = (furni: IRoomFurni[]): number => {
    const [ loads, setLoads ] = useState(0);
    const ids = useMemo(() => [ ...new Set(furni.map(furniId).filter((id) => id !== undefined)) ], [ furni.map((item) => item.name).join() ]);

    useEffect(() => {
        const engine = GetRoomEngine?.();
        let active = true;
        const loaded = () => active && setLoads((count) => count + 1);
        const listener = { imageReady: loaded, imageFailed: loaded };

        for (const id of ids) {
            try {
                if (engine) engine.getFurnitureFloorImage(id, new Vector3d(0), 64, listener, 0, '', -1);
            } catch {
                // The renderer is not ready: the furni ask for themselves.
            }
        }

        return () => {
            active = false;
        };
    }, [ ids.join() ]);

    return loads;
};

const Furni: FC<{ furni: IRoomFurni; loads: number }> = ({ furni, loads }) => {
    const id = furniId(furni);
    const size = furni.size ?? 1;
    const bottom = roomPoint(furni.x + size, furni.y + (furni.sizeY ?? size));

    if (id === undefined) return null;

    return (
        <div className="game-room__item" style={{ left: bottom.left, top: bottom.top - (furni.lift ?? 0), zIndex: Math.floor((furni.x + size + furni.y + (furni.sizeY ?? size)) * 10) + (furni.lift ? 500 : 0) }}>
            <LayoutFurniImageView key={`${ furni.name }-${ loads }`} productType="s" productClassId={id} direction={furni.dir * 45} state={furni.state ?? -1} style={{ position: 'absolute', transform: 'translate(-50%, -100%)' }} />
        </div>
    );
};

const Avatar: FC<{ avatar: IRoomAvatar }> = ({ avatar }) => {
    const picture = useUnoAvatar(avatar.figure, avatar.gender, avatar.dir, avatar.posture ?? AvatarAction.POSTURE_STAND, avatar.sign ?? -1, avatar.effect ?? 0);
    const centre = roomPoint(avatar.x + 0.5, avatar.y + 0.5);
    const depth = Math.floor((avatar.x + avatar.y + 1) * 10) + 6;
    const style: CSSProperties = { left: centre.left, top: centre.top + FEET_FROM_BOTTOM, zIndex: depth };

    return (
        <>
            {picture && <img className={`game-room__avatar ${ avatar.dimmed ? 'is-dimmed' : '' }`} src={picture} alt="" style={style} draggable={false} />}
            {(avatar.name || avatar.above) && (
                <div className={`game-room__tag ${ avatar.you ? 'is-you' : '' }`} style={{ left: centre.left, top: centre.top - 92, zIndex: 900 }} data-browser-text>
                    {avatar.name && <span>{avatar.name}</span>}
                    {avatar.above}
                </div>
            )}
            {avatar.bubble && (
                <div className="game-room__bubble" style={{ left: centre.left, top: centre.top - 116, zIndex: 950 }} data-browser-text>
                    {avatar.name && <strong>{avatar.name} : </strong>}{avatar.bubble}
                </div>
            )}
        </>
    );
};

export const GameRoomScene: FC<{ image: string; furni: IRoomFurni[]; avatars: IRoomAvatar[]; children?: ReactNode; className?: string }> = ({ image, furni, avatars, children, className = '' }) => {
    const loads = useFurniLoads(furni);

    return (
        <div className={`game-room ${ className }`} style={{ width: ROOM_W, height: ROOM_H }}>
            <img className="game-room__floor" src={image} alt="" width={ROOM_W} height={ROOM_H} draggable={false} />
            {furni.map((item, index) => <Furni key={`${ item.name }-${ index }`} furni={item} loads={loads} />)}
            {avatars.map((avatar) => <Avatar key={avatar.key} avatar={avatar} />)}
            {children}
        </div>
    );
};
