import { FC } from 'react';
import iconWiredDirE from '../../../assets/images/wired/icon_wired_dir_e.png';
import iconWiredDirN from '../../../assets/images/wired/icon_wired_dir_n.png';
import iconWiredDirNe from '../../../assets/images/wired/icon_wired_dir_ne.png';
import iconWiredDirNw from '../../../assets/images/wired/icon_wired_dir_nw.png';
import iconWiredDirS from '../../../assets/images/wired/icon_wired_dir_s.png';
import iconWiredDirSe from '../../../assets/images/wired/icon_wired_dir_se.png';
import iconWiredDirSw from '../../../assets/images/wired/icon_wired_dir_sw.png';
import iconWiredDirW from '../../../assets/images/wired/icon_wired_dir_w.png';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

export const WIRED_DIRECTION_GRID = [
    [7, 0, 1, 2],
    [6, 5, 4, 3]
];

interface WiredDirectionIconProps {
    direction: number;
    selected?: boolean;
    debugValue?: number | string;
    iconSrc?: string;
    showImage?: boolean;
}

const DIRECTION_ICON_MAP: Record<number, string> = {
    0: iconWiredDirN,
    1: iconWiredDirNe,
    2: iconWiredDirE,
    3: iconWiredDirSe,
    4: iconWiredDirS,
    5: iconWiredDirSw,
    6: iconWiredDirW,
    7: iconWiredDirNw
};

export const WiredDirectionIcon: FC<WiredDirectionIconProps> = (props) => {
    const { direction = 0, selected = false, debugValue = null, iconSrc = null, showImage = true } = props;
    const icon = iconSrc ?? DIRECTION_ICON_MAP[direction];

    return (
        <NativeTextTree>
            <span className="inline-flex flex-col items-center justify-center leading-none">
                {showImage && (
                    <img alt="" className={`h-auto w-auto object-contain ${selected ? 'brightness-100' : 'opacity-90'}`} draggable={false} src={icon} />
                )}
                {debugValue !== null && debugValue !== undefined && (
                    <span className={`${showImage ? 'mt-[1px]' : ''} text-[9px] text-black`}>{debugValue}</span>
                )}
            </span>
        </NativeTextTree>
    );
};
