import { CSSProperties, FC } from 'react';
import { werewolfRoleCamp, werewolfRoleName } from '../../api';
import cards from '../../assets/images/werewolf/werewolf-cards.png';
import { WerewolfRoleIcon } from './WerewolfRoleIcon';

const CARD_W = 64;
const CARD_H = 88;
const FRAMES = { village: 0, wolves: 1, alone: 2 };
const BACK = 3;

const face = (frame: number, zoom: number): CSSProperties => ({
    width: CARD_W * zoom,
    height: CARD_H * zoom,
    backgroundImage: `url(${cards})`,
    backgroundSize: `${CARD_W * 4 * zoom}px ${CARD_H * zoom}px`,
    backgroundPosition: `${-frame * CARD_W * zoom}px 0`
});

/**
 * A big role card in pixel art drawn for this game (werewolf-cards.png): the frame of the role's
 * camp, its icon at twice its size in the window, its name on the plate. Without a role, the back of the card. With
 * `flip`, it shows its back first and turns over (`hidden` keeps it on its back: a role nobody may see).
 */
export const WerewolfRoleCard: FC<{ role: string; zoom?: number; flip?: boolean; camp?: string; className?: string }> = ({ role, zoom = 3, flip = false, camp, className = '' }) => {
    const frame = FRAMES[(camp ?? werewolfRoleCamp(role)) as keyof typeof FRAMES] ?? 0;

    return (
        <div className={`ww-card ${flip ? 'is-flipping' : ''} ${role ? '' : 'is-back'} ${className}`} style={{ width: CARD_W * zoom, height: CARD_H * zoom }}>
            <div className="ww-card__inner">
                <div className="ww-card__face ww-card__front" style={face(frame, zoom)}>
                    {role && (
                        <>
                            <span className="ww-card__portrait" style={{ left: 16 * zoom, top: 16 * zoom }}>
                                <WerewolfRoleIcon role={role} zoom={2 * zoom} />
                            </span>
                            <span className="ww-card__name" data-browser-text style={{ left: 6 * zoom, top: 61 * zoom, width: 52 * zoom, height: 15 * zoom, fontSize: Math.max(9, Math.round(4.4 * zoom)) }}>
                                {werewolfRoleName(role)}
                            </span>
                        </>
                    )}
                </div>
                <div className="ww-card__face ww-card__back" style={face(BACK, zoom)} />
            </div>
        </div>
    );
};
