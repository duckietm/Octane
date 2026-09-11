import { CSSProperties, FC } from 'react';
import { getHabbiconsBaseUrl } from '../../api/habbicons/habbiconCatalog';

export const STAFF_CHAT_FRANK_HABBICON_ID = 50;
export const STAFF_CHAT_FRANK_SPRITE = { x: 42, y: 126, cellSize: 42, sheetSize: 294 } as const;

export const getStaffChatFrankIconStyle = (size: number, baseUrl: string): CSSProperties => {
    const scale = size / STAFF_CHAT_FRANK_SPRITE.cellSize;

    return {
        display: 'block',
        flex: '0 0 auto',
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: `url("${baseUrl}habbicons_spritesheet.png")`,
        backgroundPosition: `-${STAFF_CHAT_FRANK_SPRITE.x * scale}px -${STAFF_CHAT_FRANK_SPRITE.y * scale}px`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${STAFF_CHAT_FRANK_SPRITE.sheetSize * scale}px ${STAFF_CHAT_FRANK_SPRITE.sheetSize * scale}px`,
        imageRendering: 'pixelated'
    };
};

export const StaffChatFrankIconView: FC<{ size: number; className?: string }> = ({ size, className = '' }) => {
    const baseUrl = getHabbiconsBaseUrl() || '/habbicons/default/';

    return <span aria-hidden="true" className={`staff-chat-frank-icon ${className}`.trim()} style={getStaffChatFrankIconStyle(size, baseUrl)} />;
};
