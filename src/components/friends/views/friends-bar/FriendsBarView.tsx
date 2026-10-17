import { AnimatePresence, motion, Variants } from 'framer-motion';
import { FC, useLayoutEffect, useRef, useState } from 'react';
import friendsBrowseArrowLeft from '../../../../assets/images/toolbar/air/friend-browse-arrow-left.png';
import friendsBrowseArrowRight from '../../../../assets/images/toolbar/air/friend-browse-arrow-right.png';
import friendsBrowseBg from '../../../../assets/images/toolbar/air/friends-browse-bg.png';
import { LocalizeText, localizeWithFallback, MessengerFriend } from '../../../../api';
import { AIR_RAIL_CHAT_RESERVED_HALF, AIR_RAIL_EDGE_GAP, resolveAirFriendTabCapacity } from '../../../toolbar/bottomDockLayout';
import { FriendBarItemView } from './FriendBarItemView';
import { BaseButton } from '../../../../common/BaseButton';

const AIR_TAB_WIDTH = 127;
const AIR_TAB_SPACING = 3;
const AIR_MIN_VISIBLE_SLOTS = 3;
const BASE_PAD = 8;
const RIGHT_SAFE = 24;

const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
    exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.8 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 22 } },
    exit: { opacity: 0, y: 6, scale: 0.85, transition: { duration: 0.1 } }
};

export const FriendBarView: FC<{ onlineFriends: MessengerFriend[]; requestsCount?: number }> = (props) => {
    const { onlineFriends = [], requestsCount = 0 } = props;
    const [indexOffset, setIndexOffset] = useState(0);
    const [maxVisible, setMaxVisible] = useState(AIR_MIN_VISIBLE_SLOTS);
    const elementRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const element = elementRef.current;

        if (!element) return;

        const rail = element.closest('.tb-nav-clip') as HTMLElement | null;

        const measure = () => {
            const requestWidth = BASE_PAD + (requestsCount > 0 ? AIR_TAB_WIDTH + AIR_TAB_SPACING : 0);
            let next: number;

            if (rail) {
                const railRect = rail.getBoundingClientRect();
                const barRect = element.getBoundingClientRect();
                const contentWidth = Math.max(railRect.width, rail.scrollWidth);
                const preceding = Math.max(0, barRect.left - railRect.left);
                const trailing = Math.max(0, railRect.left + contentWidth - barRect.right);
                const reserved = document.querySelector('.tb-frame') ? AIR_RAIL_CHAT_RESERVED_HALF : AIR_RAIL_EDGE_GAP;
                const available = Math.max(0, window.innerWidth / 2 - reserved) - preceding - trailing;

                next = available - requestWidth < AIR_TAB_WIDTH ? 0 : resolveAirFriendTabCapacity(available, requestWidth, AIR_TAB_SPACING);
            } else {
                const left = element.getBoundingClientRect().left;
                const available = window.innerWidth - left - RIGHT_SAFE;

                next = Math.max(AIR_MIN_VISIBLE_SLOTS, resolveAirFriendTabCapacity(available, requestWidth, AIR_TAB_SPACING));
            }

            setMaxVisible((prev) => (prev === next ? prev : next));
        };

        measure();

        const observer = new ResizeObserver(measure);

        observer.observe(document.documentElement);
        if (rail) observer.observe(rail);
        window.addEventListener('resize', measure);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [requestsCount, onlineFriends.length]);

    const validFriends = onlineFriends.filter(Boolean);
    const maxOffset = maxVisible > 0 ? Math.max(0, validFriends.length - maxVisible) : 0;
    const safeOffset = Math.min(indexOffset, maxOffset);
    const canScrollLeft = safeOffset > 0;
    const canScrollRight = safeOffset < maxOffset;
    const showArrows = maxOffset > 0;
    const visibleFriends = validFriends.slice(safeOffset, safeOffset + maxVisible);
    const findFriendsSlotCount = Math.max(0, Math.min(AIR_MIN_VISIBLE_SLOTS, maxVisible) - visibleFriends.length);

    return (
        <motion.div
            ref={elementRef}
            className="friend-bar flex h-[40px] items-center gap-[3px] px-[2px] py-[3px]"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
        >
            {maxVisible > 0 && requestsCount > 0 && (
                <motion.div variants={itemVariants}>
                    <div className="friend-bar-item friend-bar-request find-friends-active flex h-[34px] items-center px-[10px] text-[0.83rem] whitespace-nowrap text-white">
                        {requestsCount} {LocalizeText('friendbar.requests.title')}
                    </div>
                </motion.div>
            )}
            {showArrows && (
                <motion.div variants={itemVariants}>
                    <BaseButton
                        type="button"
                        disabled={!canScrollLeft}
                        aria-label={localizeWithFallback('friendbar.scroll.left', 'Previous friends')}
                        className={`friend-bar-button left ${!canScrollLeft ? 'is-disabled' : ''}`}
                        onClick={() => setIndexOffset(safeOffset - 1)}
                    >
                        <img src={friendsBrowseBg} alt="" className="friend-bar-browse-bg" />
                        <img src={friendsBrowseArrowLeft} alt="" className="friend-bar-browse-arrow" />
                    </BaseButton>
                </motion.div>
            )}

            <AnimatePresence mode="popLayout">
                {visibleFriends.map((friend) => (
                    <motion.div key={friend.id} variants={itemVariants} layout initial="hidden" animate="visible" exit="exit">
                        <FriendBarItemView friend={friend} />
                    </motion.div>
                ))}
                {Array.from({ length: findFriendsSlotCount }, (_, index) => (
                    <motion.div key={`friend-search-${index}`} variants={itemVariants} layout initial="hidden" animate="visible" exit="exit">
                        <FriendBarItemView friend={null} />
                    </motion.div>
                ))}
            </AnimatePresence>

            {showArrows && (
                <motion.div variants={itemVariants}>
                    <BaseButton
                        type="button"
                        disabled={!canScrollRight}
                        aria-label={localizeWithFallback('friendbar.scroll.right', 'Next friends')}
                        className={`friend-bar-button right ${!canScrollRight ? 'is-disabled' : ''}`}
                        onClick={() => setIndexOffset(safeOffset + 1)}
                    >
                        <img src={friendsBrowseBg} alt="" className="friend-bar-browse-bg" />
                        <img src={friendsBrowseArrowRight} alt="" className="friend-bar-browse-arrow" />
                    </BaseButton>
                </motion.div>
            )}
        </motion.div>
    );
};
