import { FC, useState } from 'react';
import { LocalizeBadgeDescription, LocalizeBadgeName } from '../../api';
import { Flex, LayoutBadgeImageView } from '../../common';

interface BadgeInfoViewProps {
    badgeCode: string;
}

export const BadgeInfoView: FC<BadgeInfoViewProps> = (props) => {
    const { badgeCode } = props;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Flex
            center
            className="octane-card-panel w-[45px] h-[45px] relative cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <LayoutBadgeImageView badgeCode={badgeCode} />
            {isHovered && (
                <div className="absolute top-full left-1/2 z-50 mt-1 w-[180px] -translate-x-1/2 border border-[#c4cabf] bg-[#f2f2eb] px-2 py-1 text-xs text-black shadow-none pointer-events-none rounded-[6px]">
                    <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-[#c4cabf] bg-[#f2f2eb]" />
                    <div className="font-bold mb-0.5">{LocalizeBadgeName(badgeCode)}</div>
                    <div className="text-gray-600">{LocalizeBadgeDescription(badgeCode)}</div>
                </div>
            )}
        </Flex>
    );
};
