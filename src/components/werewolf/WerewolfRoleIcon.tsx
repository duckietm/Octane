import { FC } from 'react';
import { WEREWOLF_ROLES, werewolfRoleName } from '../../api';
import sheet from '../../assets/images/werewolf/werewolf-roles.png';

/** A role's icon in Habbi's pixel art (werewolf-roles.png, 16x16 each, drawn by deploy/scripts/werewolf-art.py). */
export const WerewolfRoleIcon: FC<{ role: string; zoom?: number }> = ({ role, zoom = 2 }) => {
    const index = Math.max(0, WEREWOLF_ROLES.indexOf(role as never));

    return (
        <span
            className="ww-role-icon"
            title={werewolfRoleName(role)}
            style={{
                width: 16 * zoom,
                height: 16 * zoom,
                backgroundImage: `url(${sheet})`,
                backgroundSize: `${16 * WEREWOLF_ROLES.length * zoom}px ${16 * zoom}px`,
                backgroundPosition: `${-index * 16 * zoom}px 0`
            }} />
    );
};
