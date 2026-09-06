import { CreateLinkEvent, Dispose, DropBounce, EaseOut, FindNewFriendsMessageComposer, JumpBy, Motions, OctaneToolbarAnimateIconEvent, PerkAllowancesMessageEvent, PerkEnum, Queue, Wait, YouTubeRoomSettingsEvent } from '@octane/renderer';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { CSSProperties, FC, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GetConfigurationValue, isHousekeepingEnabled, localizeWithFallback, MessengerIconState, OpenMessengerChat, SendMessageComposer, setYoutubeRoomEnabled, VisitDesktop } from '../../api';
import collapseLeftImg from '../../assets/images/toolbar/air/collapse-left.png';
import collapseRightImg from '../../assets/images/toolbar/air/collapse-right.png';
import dividerImg from '../../assets/images/toolbar/air/divider.png';
import memenuBgImg from '../../assets/images/toolbar/air/memenu-bg.png';
import memenuCircleImg from '../../assets/images/toolbar/air/memenu-circle.png';
import { Flex, LayoutAvatarImageView, LayoutItemCountView } from '../../common';
import { SoundboardRoomMessageEvent } from '../../events';
import { useAchievements, useBuildHeight, useFriends, useHasPermission, useInventoryUnseenTracker, useMentionsSnapshot, useMessageEvent, useMessenger, useModTools, useOctaneEvent, useSessionInfo, useSoundboard, useUiEvent, useWiredTools } from '../../hooks';
import { BottomDockLayout, resolveBottomDockLayout } from './bottomDockLayout';
import { ToolbarItemView } from './ToolbarItemView';
import { ToolbarMeView } from './ToolbarMeView';
import { YouTubePlayerView } from './YouTubePlayerView';

const containerVariants: Variants = {
    hidden: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
    visible: { transition: { staggerChildren: 0.025 } }
};
const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.8 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 22 } }
};

const shellVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 }
};

const SHELL_TRANSITION = { type: 'spring' as const, stiffness: 260, damping: 26 };
const NAV_TRANSITION = { type: 'spring' as const, stiffness: 300, damping: 28 };
const ME_POPOVER_TRANSITION = { type: 'spring' as const, stiffness: 420, damping: 28 };
const LEFT_COLLAPSED_STORAGE_KEY = 'nitro.toolbar.leftCollapsed';
const RIGHT_COLLAPSED_STORAGE_KEY = 'nitro.toolbar.rightCollapsed';


const readCollapsedPreference = (key: string): boolean =>
{
    if(typeof window === 'undefined') return false;

    try
    {
        return window.localStorage.getItem(key) === '1';
    }
    catch
    {
        return false;
    }
};

export const ToolbarView: FC<{ isInRoom: boolean }> = props =>
{
    const { isInRoom } = props;
    const [ isMeExpanded, setMeExpanded ] = useState(false);
    const [ isTouchLayout, setIsTouchLayout ] = useState(false);
    const [ leftCollapsed, setLeftCollapsed ] = useState(() => readCollapsedPreference(LEFT_COLLAPSED_STORAGE_KEY));
    const [ rightCollapsed, setRightCollapsed ] = useState(() => readCollapsedPreference(RIGHT_COLLAPSED_STORAGE_KEY));
    const [ dockLayout, setDockLayout ] = useState<BottomDockLayout>({ chatRaised: false, chatBottom: 7 });
    const [ staffStackBottom, setStaffStackBottom ] = useState<number | null>(null);
    const [ useGuideTool, setUseGuideTool ] = useState(false);
    const [ youtubeEnabled, setYoutubeEnabled ] = useState(false);
    const [ soundboardPulse, setSoundboardPulse ] = useState(false);
    const soundboardPulseTimerRef = useRef<number | null>(null);
    const leftDockRef = useRef<HTMLDivElement>(null);
    const rightDockRef = useRef<HTMLDivElement>(null);
    const { userFigure = null } = useSessionInfo();
    const { getFullCount = 0 } = useInventoryUnseenTracker();
    const { getTotalUnseen = 0 } = useAchievements();
    const { requests = [] } = useFriends();
    const { iconState = MessengerIconState.HIDDEN } = useMessenger();
    const { unreadCount: mentionsUnread = 0 } = useMentionsSnapshot();
    const mentionsEnabled = useMemo(() => GetConfigurationValue<boolean>('mentions_ui.enabled', true), []);
    const buildersClubEnabled = useMemo(() => GetConfigurationValue<boolean>('buildersclub.enabled', GetConfigurationValue<boolean>('toolbar.buildersclub.enabled', true)), []);
    const fortuneWheelEnabled = useMemo(() => GetConfigurationValue<boolean>('toolbar.fortunewheel.enabled', true), []);
    const { openMonitor, showToolbarButton } = useWiredTools();
    const { enabled: soundboardEnabled, reset: resetSoundboard } = useSoundboard();
    const { available: buildHeightAvailable, toggle: toggleBuildHeight } = useBuildHeight();
    const isMod = useHasPermission('acc_supporttool');
    const isHk = useHasPermission('acc_housekeeping');
    const hkEnabled = useMemo(() => isHousekeepingEnabled(), []);
    const { tickets = [] } = useModTools();
    const openTicketsCount = useMemo(
        () => isMod ? tickets.filter(ticket => ticket && (ticket.state === 1)).length : 0,
        [ isMod, tickets ]
    );
    const visibilityVariant = 'visible';
    const touchLayout = isTouchLayout;
    const mobileOnlyClasses = touchLayout ? '' : 'hidden';
    const desktopBlockClasses = touchLayout ? 'hidden' : 'block';
    const desktopFlexClasses = touchLayout ? 'hidden' : 'flex';
    const socialInSideStack = touchLayout;
    const sideStackClasses = touchLayout ? '' : 'hidden';
    const storiesEnabled = useMemo(() => GetConfigurationValue<boolean>('toolbar.stories.enabled', false), []);
    const [ messengerNotifyFrame, setMessengerNotifyFrame ] = useState(0);
    const chatFrameStyle = useMemo<CSSProperties | undefined>(() =>
    {
        if(touchLayout) return undefined;

        return { bottom: `${ dockLayout.chatBottom }px` };
    }, [ dockLayout.chatBottom, touchLayout ]);

    const railMaxWidthClass = (isInRoom && !dockLayout.chatRaised) ? 'max-w-[calc(50vw-242px)]' : 'max-w-[calc(50vw-12px)]';
    const chatFramePositionClass = touchLayout ? 'bottom-[90px]' : '';
    const leftNavVariants = useMemo<Variants>(() => ({
        hidden: { opacity: 0, x: isInRoom ? -10 : 0, y: isInRoom ? 0 : 8, pointerEvents: 'none' },
        visible: { opacity: 1, x: 0, y: 0, pointerEvents: 'auto' }
    }), [ isInRoom ]);
    const rightNavVariants = useMemo<Variants>(() => ({
        hidden: { opacity: 0, x: 10, pointerEvents: 'none' },
        visible: { opacity: 1, x: 0, pointerEvents: 'auto' }
    }), []);
    const mobileNavVariants = useMemo<Variants>(() => ({
        hidden: { opacity: 0, y: 8, pointerEvents: 'none' },
        visible: { opacity: 1, y: 0, pointerEvents: 'auto' }
    }), []);

    useMessageEvent<YouTubeRoomSettingsEvent>(YouTubeRoomSettingsEvent, event =>
    {
        const enabled = event.getParser().youtubeEnabled;
        setYoutubeEnabled(enabled);
        setYoutubeRoomEnabled(enabled);
    });

    useUiEvent<SoundboardRoomMessageEvent>(SoundboardRoomMessageEvent.ROOM_MESSAGE, () =>
    {
        setSoundboardPulse(true);
        if(soundboardPulseTimerRef.current !== null) window.clearTimeout(soundboardPulseTimerRef.current);
        soundboardPulseTimerRef.current = window.setTimeout(() =>
        {
            setSoundboardPulse(false);
            soundboardPulseTimerRef.current = null;
        }, 700);
    });

    useEffect(() => () =>
    {
        if(soundboardPulseTimerRef.current !== null) window.clearTimeout(soundboardPulseTimerRef.current);
    }, []);

    useEffect(() =>
    {
        if(!isInRoom)
        {
            setYoutubeEnabled(false);
            setYoutubeRoomEnabled(false);
            resetSoundboard();
        }
    }, [ isInRoom, resetSoundboard ]);

    useEffect(() =>
    {
        const query = window.matchMedia('(pointer: coarse), (hover: none)');
        const updateTouchLayout = () => setIsTouchLayout(query.matches);

        updateTouchLayout();
        query.addEventListener('change', updateTouchLayout);

        return () => query.removeEventListener('change', updateTouchLayout);
    }, []);

    useEffect(() =>
    {
        if(iconState !== MessengerIconState.UNREAD)
        {
            setMessengerNotifyFrame(0);
            return;
        }

        const interval = window.setInterval(() => setMessengerNotifyFrame(value => (value === 0 ? 1 : 0)), 500);

        return () => window.clearInterval(interval);
    }, [ iconState ]);

    useEffect(() =>
    {
        try
        {
            window.localStorage.setItem(LEFT_COLLAPSED_STORAGE_KEY, leftCollapsed ? '1' : '0');
        }
        catch
        {
        }
    }, [ leftCollapsed ]);

    useEffect(() =>
    {
        try
        {
            window.localStorage.setItem(RIGHT_COLLAPSED_STORAGE_KEY, rightCollapsed ? '1' : '0');
        }
        catch
        {
        }
    }, [ rightCollapsed ]);

    useLayoutEffect(() =>
    {
        if(touchLayout || !isInRoom) return;

        const leftDock = leftDockRef.current;
        const rightDock = rightDockRef.current;

        if(!leftDock || !rightDock) return;

        let frame = 0;

        const applyMeasurement = () =>
        {
            const leftRect = leftDock.getBoundingClientRect();
            const rightRect = rightDock.getBoundingClientRect();
            const leftEdge = leftRect.left + Math.max(leftRect.width, leftDock.scrollWidth);
            const rightEdge = rightRect.right - Math.max(rightRect.width, rightDock.scrollWidth);
            const next = resolveBottomDockLayout({
                viewportWidth: window.innerWidth,
                leftEdge,
                rightEdge
            });

            setDockLayout(previous => (
                previous.chatRaised === next.chatRaised && previous.chatBottom === next.chatBottom
                    ? previous
                    : next
            ));
        };

        const measure = () =>
        {
            window.cancelAnimationFrame(frame);
            frame = window.requestAnimationFrame(applyMeasurement);
        };

        applyMeasurement();

        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);

        observer?.observe(leftDock);
        observer?.observe(rightDock);
        observer?.observe(document.body);
        window.addEventListener('resize', measure);

        return () =>
        {
            window.cancelAnimationFrame(frame);
            observer?.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [
        buildHeightAvailable,
        buildersClubEnabled,
        fortuneWheelEnabled,
        hkEnabled,
        iconState,
        isHk,
        isInRoom,
        isMod,
        leftCollapsed,
        mentionsEnabled,
        rightCollapsed,
        showToolbarButton,
        soundboardEnabled,
        touchLayout,
        youtubeEnabled
    ]);

    useEffect(() =>
    {
        const measure = () =>
        {
            const roomTools = document.querySelector('.octane-room-tools-container') as HTMLElement | null;
            const next = roomTools
                ? Math.max(8, Math.round(window.innerHeight - roomTools.getBoundingClientRect().top + 15))
                : null;

            setStaffStackBottom(prevValue => (prevValue === next ? prevValue : next));
        };

        measure();

        const interval = window.setInterval(measure, 400);
        window.addEventListener('resize', measure);

        return () =>
        {
            window.clearInterval(interval);
            window.removeEventListener('resize', measure);
        };
    }, [ isInRoom ]);

    const openYouTubePlayer = () => window.dispatchEvent(new CustomEvent('youtube:toggle'));

    useMessageEvent<PerkAllowancesMessageEvent>(PerkAllowancesMessageEvent, event =>
    {
        setUseGuideTool(event.getParser().isAllowed(PerkEnum.USE_GUIDE_TOOL));
    });

    useOctaneEvent<OctaneToolbarAnimateIconEvent>(OctaneToolbarAnimateIconEvent.ANIMATE_ICON, event =>
    {
        const animationIconToToolbar = (iconName: string, image: HTMLImageElement, x: number, y: number) =>
        {
            const target = (document.body.getElementsByClassName(iconName)[0] as HTMLElement);

            if(!target) return;

            image.className = 'toolbar-icon-animation';
            image.style.visibility = 'visible';
            image.style.left = (x + 'px');
            image.style.top = (y + 'px');

            document.body.append(image);

            const targetBounds = target.getBoundingClientRect();
            const imageBounds = image.getBoundingClientRect();
            const left = (imageBounds.x - targetBounds.x);
            const top = (imageBounds.y - targetBounds.y);
            const squared = Math.sqrt(((left * left) + (top * top)));
            const wait = (500 - Math.abs(((((1 / squared) * 100) * 500) * 0.5)));
            const height = 20;
            const motionName = (`ToolbarBouncing[${ iconName }]`);

            if(!Motions.getMotionByTag(motionName))
            {
                Motions.runMotion(new Queue(new Wait((wait + 8)), new DropBounce(target, 400, 12))).tag = motionName;
            }

            const motion = new Queue(new EaseOut(new JumpBy(image, wait, ((targetBounds.x - imageBounds.x) + height), (targetBounds.y - imageBounds.y), 100, 1), 1), new Dispose(image));

            Motions.runMotion(motion);
        };

        animationIconToToolbar('icon-inventory', event.image, event.x, event.y);
    });

    return (
        <>
            { youtubeEnabled && <YouTubePlayerView /> }

            { isInRoom &&
                <div
                    data-chat-raised={ dockLayout.chatRaised ? 'true' : 'false' }
                    style={ chatFrameStyle }
                    className={ `tb-frame absolute ${ chatFramePositionClass } left-1/2 -translate-x-1/2 z-[71] flex h-[38px] w-[466px] max-w-[95vw] items-center p-0 pointer-events-none` }>
                    <Flex
                        alignItems="center"
                        justifyContent="center"
                        className="pointer-events-auto h-full w-full min-w-0 flex-1"
                        id="toolbar-chat-input-container" />
                </div> }

            <motion.div
                initial="visible"
                animate={ visibilityVariant }
                variants={ shellVariants }
                transition={ SHELL_TRANSITION }
                className={ `octane-toolbar octane-toolbar-hobba absolute bottom-0 left-0 right-0 z-[70] h-[46px] ${ desktopBlockClasses }` } />

            <motion.div
                ref={ leftDockRef }
                initial="visible"
                animate={ visibilityVariant }
                variants={ leftNavVariants }
                transition={ NAV_TRANSITION }
                className={ `tb-nav-clip absolute bottom-0 left-0 z-[71] h-[46px] ${ railMaxWidthClass } items-center ${ desktopFlexClasses }` }>
                <button
                    type="button"
                    onClick={ () => setLeftCollapsed(value => !value) }
                    aria-label={ localizeWithFallback('toolbar.icons.toggle', 'Show/hide icons') }
                    className="tb-collapse pointer-events-auto">
                    <img src={ leftCollapsed ? collapseRightImg : collapseLeftImg } alt="" />
                </button>
                <motion.div
                    variants={ containerVariants }
                    className="tb-open-shell flex h-[46px] max-w-full items-start overflow-visible bg-transparent">
                    { !leftCollapsed && (<>
                    <motion.div variants={ itemVariants } className="tb-slot">
                        { isInRoom
                            ? <ToolbarItemView icon="habbo" onClick={ () => VisitDesktop() } className="tb-icon" />
                            : <ToolbarItemView icon="house" onClick={ () => CreateLinkEvent('navigator/goto/home') } className="tb-icon" /> }
                    </motion.div>
                    <motion.div variants={ itemVariants } className="tb-slot">
                        <ToolbarItemView icon="rooms" onClick={ () => CreateLinkEvent('navigator/toggle') } className="tb-icon" />
                    </motion.div>
                    { isInRoom &&
                        <motion.div variants={ itemVariants } className="tb-slot">
                            <ToolbarItemView icon="progression" onClick={ () => CreateLinkEvent('achievements/toggle') } className="tb-icon" />
                        </motion.div> }
                    { GetConfigurationValue('game.center.enabled') &&
                        <motion.div variants={ itemVariants } className="tb-slot">
                            <ToolbarItemView icon="game" onClick={ () => CreateLinkEvent('games/toggle') } className="tb-icon" />
                        </motion.div> }
                    { (!isInRoom && storiesEnabled) &&
                        <motion.div variants={ itemVariants } className="tb-slot">
                            <ToolbarItemView icon="stories" onClick={ () => CreateLinkEvent('stories/toggle') } className="tb-icon" />
                        </motion.div> }
                    </>) }
                    <motion.div variants={ itemVariants } className="tb-slot">
                        <ToolbarItemView icon="catalog" onClick={ () => CreateLinkEvent('catalog/toggle/normal') } className="tb-icon" />
                    </motion.div>
                    { (!leftCollapsed && buildersClubEnabled) &&
                        <motion.div variants={ itemVariants } className="tb-slot">
                            <ToolbarItemView icon="buildersclub" onClick={ () => CreateLinkEvent('catalog/toggle/builder') } className="tb-icon" />
                        </motion.div> }
                    { (!leftCollapsed && isInRoom) &&
                        <motion.div variants={ itemVariants } className="relative tb-slot tb-slot-inventory">
                            <ToolbarItemView icon="inventory" onClick={ () => CreateLinkEvent('inventory/toggle') } className="tb-icon" />
                            { (getFullCount > 0) &&
                                <LayoutItemCountView count={ getFullCount } className="absolute -right-1 top-0" /> }
                        </motion.div> }
                    { !leftCollapsed &&
                    <motion.div variants={ itemVariants } className="relative tb-slot tb-slot-tall tb-slot-memenu">
                        <img src={ memenuBgImg } alt="" className="tb-memenu-bg" />
                        <AnimatePresence>
                            { isMeExpanded &&
                                <motion.div
                                    initial={ { opacity: 0, y: 6, scale: 0.97 } }
                                    animate={ { opacity: 1, y: 0, scale: 1 } }
                                    exit={ { opacity: 0, y: 6, scale: 0.97 } }
                                    transition={ ME_POPOVER_TRANSITION }
                                    className="pointer-events-auto absolute bottom-[calc(100%+8px)] left-1/2 z-50 -translate-x-1/2">
                                    <ToolbarMeView setMeExpanded={ setMeExpanded } unseenAchievementCount={ getTotalUnseen } useGuideTool={ useGuideTool } />
                                </motion.div> }
                        </AnimatePresence>
                        <motion.div
                            className="tb-memenu-avatar"
                            onClick={ event =>
                            {
                                setMeExpanded(value => !value);
                                event.stopPropagation();
                            } }>
                            <LayoutAvatarImageView airMeMenu={ true } direction={ 3 } figure={ userFigure } />
                        </motion.div>
                        <img src={ memenuCircleImg } alt="" className="tb-memenu-circle" />
                        { (getTotalUnseen > 0) &&
                            <LayoutItemCountView count={ getTotalUnseen } className="pointer-events-none absolute -right-1 -top-1 z-10" /> }
                    </motion.div> }
                    { (!leftCollapsed && isInRoom && showToolbarButton) &&
                        <motion.div variants={ itemVariants } className="tb-slot tb-slot-tall">
                            <ToolbarItemView icon="wired-tools" onClick={ openMonitor } className="tb-icon" />
                        </motion.div> }
                    { isInRoom &&
                        <motion.div variants={ itemVariants } className="tb-slot tb-slot-tall">
                            <ToolbarItemView icon="camera" onClick={ () => CreateLinkEvent('camera/toggle') } className="tb-icon" />
                        </motion.div> }
                    <img src={ dividerImg } alt="" className="tb-divider" />
                    { !leftCollapsed && (<>
                    { fortuneWheelEnabled &&
                        <motion.div variants={ itemVariants } className="tb-slot">
                            <ToolbarItemView icon="fortune-wheel" onClick={ () => CreateLinkEvent('fortune-wheel/toggle') } className="tb-icon" />
                        </motion.div> }
                    { (isInRoom && youtubeEnabled) &&
                        <motion.div variants={ itemVariants } className="tb-slot">
                            <ToolbarItemView icon="youtube" onClick={ openYouTubePlayer } className="tb-icon" />
                        </motion.div> }
                    { (isInRoom && soundboardEnabled) &&
                        <motion.div variants={ itemVariants } className="tb-slot">
                            <ToolbarItemView icon="soundboard" onClick={ () => CreateLinkEvent('soundboard/toggle') } className={ `tb-icon ${ soundboardPulse ? 'animate-pulse' : '' }` } />
                        </motion.div> }
                    { (isInRoom && buildHeightAvailable) &&
                        <motion.div variants={ itemVariants } className="tb-slot">
                            <ToolbarItemView icon="buildheight" onClick={ toggleBuildHeight } className="tb-icon" />
                        </motion.div> }
                    { isMod &&
                        <motion.div variants={ itemVariants } className="relative tb-slot">
                            <ToolbarItemView icon="modtools" onClick={ () => CreateLinkEvent('mod-tools/toggle') } className="tb-icon" />
                            { (openTicketsCount > 0) &&
                                <LayoutItemCountView count={ openTicketsCount } className="pointer-events-none absolute -right-1 -top-1 z-10" /> }
                        </motion.div> }
                    { (isHk && hkEnabled) &&
                        <motion.div variants={ itemVariants } className="tb-slot">
                            <ToolbarItemView icon="housekeeping" onClick={ () => CreateLinkEvent('housekeeping/toggle') } className="tb-icon" />
                        </motion.div> }
                    </>) }
                </motion.div>
            </motion.div>
            <motion.div
                ref={ rightDockRef }
                initial="visible"
                animate={ visibilityVariant }
                variants={ rightNavVariants }
                transition={ NAV_TRANSITION }
                className={ `tb-nav-clip absolute bottom-0 z-[71] h-[46px] ${ railMaxWidthClass } items-center ${ desktopFlexClasses } ${ isInRoom ? 'right-0' : 'right-3' }` }>
                <motion.div
                    variants={ containerVariants }
                    className="tb-open-shell tb-open-shell-right flex h-[46px] max-w-full items-start overflow-visible bg-transparent">
                    <img src={ dividerImg } alt="" className="tb-divider" />
                    <motion.div variants={ itemVariants } className="relative tb-slot">
                        <ToolbarItemView icon="friendall" onClick={ () => CreateLinkEvent('friends/toggle') } className="tb-icon" />
                        { (requests.length > 0) &&
                            <LayoutItemCountView count={ requests.length } className="absolute -right-2 -top-1" /> }
                    </motion.div>
                    <motion.div variants={ itemVariants } className="tb-slot">
                        <ToolbarItemView icon="friendsearch" onClick={ () => SendMessageComposer(new FindNewFriendsMessageComposer()) } className="tb-icon" />
                    </motion.div>
                    <motion.div variants={ itemVariants } className="tb-slot tb-slot-messenger">
                        <ToolbarItemView className={ `tb-icon ${ iconState === MessengerIconState.UNREAD ? (messengerNotifyFrame === 1 ? 'is-notify-1' : 'is-notify-0') : '' }` } icon="message" onClick={ () => OpenMessengerChat() } />
                    </motion.div>
                    { !rightCollapsed && (<>
                    { mentionsEnabled &&
                        <motion.div variants={ itemVariants } className="relative tb-slot">
                            <ToolbarItemView icon="mentions" onClick={ () => CreateLinkEvent('mentions/toggle') } className="tb-icon" />
                            { (mentionsUnread > 0) &&
                                <LayoutItemCountView count={ mentionsUnread } className="absolute -right-2 -top-1" /> }
                        </motion.div> }
                    <div className={ `h-full shrink-0 ${ desktopBlockClasses }` } id="toolbar-friend-bar-container-desktop" />
                    </>) }
                </motion.div>
                <button
                    type="button"
                    onClick={ () => setRightCollapsed(value => !value) }
                    aria-label={ localizeWithFallback('toolbar.icons.toggle', 'Show/hide icons') }
                    className="tb-collapse pointer-events-auto">
                    <img src={ rightCollapsed ? collapseLeftImg : collapseRightImg } alt="" />
                </button>
            </motion.div>
            <motion.div
                initial="visible"
                animate={ visibilityVariant }
                variants={ mobileNavVariants }
                transition={ NAV_TRANSITION }
                className={ `absolute left-1/2 bottom-0 z-[71] flex w-[95vw] -translate-x-1/2 items-center overflow-visible ${ mobileOnlyClasses } ${ isInRoom ? 'octane-toolbar-mobile-hobba px-[6px] py-[4px] mb-[3px]' : '' }` }>
                <motion.div
                    variants={ containerVariants }
                    className="tb-bar-scroll flex h-full min-w-0 flex-1 items-center gap-2 overflow-x-auto overflow-y-visible px-1">
                    <motion.div variants={ itemVariants }>
                        { isInRoom
                            ? <ToolbarItemView icon="habbo" onClick={ () => VisitDesktop() } className="tb-icon" />
                            : <ToolbarItemView icon="house" onClick={ () => CreateLinkEvent('navigator/goto/home') } className="tb-icon" /> }
                    </motion.div>
                    <motion.div variants={ itemVariants }>
                        <ToolbarItemView icon="rooms" onClick={ () => CreateLinkEvent('navigator/toggle') } className="tb-icon" />
                    </motion.div>
                    { GetConfigurationValue('game.center.enabled') &&
                        <motion.div variants={ itemVariants }>
                            <ToolbarItemView icon="game" onClick={ () => CreateLinkEvent('games/toggle') } className="tb-icon" />
                        </motion.div> }
                    <motion.div variants={ itemVariants }>
                        <ToolbarItemView icon="catalog" onClick={ () => CreateLinkEvent('catalog/toggle/normal') } className="tb-icon" />
                    </motion.div>
                    <motion.div variants={ itemVariants } className="relative tb-slot tb-slot-tall tb-slot-memenu shrink-0">
                        <img src={ memenuBgImg } alt="" className="tb-memenu-bg" />
                        <AnimatePresence>
                            { isMeExpanded &&
                                <motion.div
                                    initial={ { opacity: 0, y: 6, scale: 0.97 } }
                                    animate={ { opacity: 1, y: 0, scale: 1 } }
                                    exit={ { opacity: 0, y: 6, scale: 0.97 } }
                                    transition={ ME_POPOVER_TRANSITION }
                                    className="pointer-events-auto fixed bottom-[calc(100%+10px)] left-1/2 z-[70] -translate-x-1/2">
                                    <ToolbarMeView setMeExpanded={ setMeExpanded } unseenAchievementCount={ getTotalUnseen } useGuideTool={ useGuideTool } />
                                </motion.div> }
                        </AnimatePresence>
                        <motion.div
                            className="tb-memenu-avatar"
                            onClick={ event =>
                            {
                                setMeExpanded(value => !value);
                                event.stopPropagation();
                            } }>
                            <LayoutAvatarImageView airMeMenu={ true } direction={ 3 } figure={ userFigure } />
                        </motion.div>
                        <img src={ memenuCircleImg } alt="" className="tb-memenu-circle" />
                        { (getTotalUnseen > 0) &&
                            <LayoutItemCountView count={ getTotalUnseen } className="pointer-events-none absolute -right-1 -top-1 z-10" /> }
                    </motion.div>
                    { isInRoom &&
                        <motion.div variants={ itemVariants } className="relative">
                            <ToolbarItemView icon="inventory" onClick={ () => CreateLinkEvent('inventory/toggle') } className="tb-icon" />
                            { (getFullCount > 0) &&
                                <LayoutItemCountView count={ getFullCount } className="absolute -right-1 top-0" /> }
                        </motion.div> }
                    { fortuneWheelEnabled &&
                        <motion.div variants={ itemVariants }>
                            <ToolbarItemView icon="fortune-wheel" onClick={ () => CreateLinkEvent('fortune-wheel/toggle') } className="tb-icon" />
                        </motion.div> }
                </motion.div>
                <motion.div
                    variants={ containerVariants }
                    className="tb-bar-scroll flex h-full items-center gap-2 overflow-x-auto overflow-y-visible px-1">
                    { (isInRoom && showToolbarButton) &&
                        <motion.div variants={ itemVariants }>
                            <ToolbarItemView icon="wired-tools" onClick={ openMonitor } className="tb-icon" />
                        </motion.div> }
                    { (isInRoom && youtubeEnabled) &&
                        <motion.div variants={ itemVariants }>
                            <ToolbarItemView icon="youtube" onClick={ openYouTubePlayer } className="tb-icon" />
                        </motion.div> }
                    { (isInRoom && soundboardEnabled) &&
                        <motion.div variants={ itemVariants }>
                            <ToolbarItemView icon="soundboard" onClick={ () => CreateLinkEvent('soundboard/toggle') } className={ `tb-icon ${ soundboardPulse ? 'animate-pulse' : '' }` } />
                        </motion.div> }
                    { (isInRoom && buildHeightAvailable) &&
                        <motion.div variants={ itemVariants }>
                            <ToolbarItemView icon="buildheight" onClick={ toggleBuildHeight } className="tb-icon" />
                        </motion.div> }
                    { /* On narrow desktop windows the social icons live in the
                         left side stack — only real touch devices get them here. */ }
                    { !socialInSideStack &&
                        <motion.div variants={ itemVariants } className="relative">
                            <ToolbarItemView icon="friendall" onClick={ () => CreateLinkEvent('friends/toggle') } className="tb-icon" />
                            { (requests.length > 0) &&
                                <LayoutItemCountView count={ requests.length } className="absolute -right-2 -top-1" /> }
                        </motion.div> }
                    { (!socialInSideStack && mentionsEnabled) &&
                        <motion.div variants={ itemVariants } className="relative">
                            <ToolbarItemView icon="mentions" onClick={ () => CreateLinkEvent('mentions/toggle') } className="tb-icon" />
                            { (mentionsUnread > 0) &&
                                <LayoutItemCountView count={ mentionsUnread } className="absolute -right-2 -top-1" /> }
                        </motion.div> }
                </motion.div>
            </motion.div>
            { /* Mobile side tools — moved out of the bottom bar into a
                 vertical pill stack on the left edge so the bottom bar has
                 room. Optional Builders Club, plus camera in-room
                 and the staff-only tools when permitted. */ }
            <motion.div
                initial="visible"
                animate={ visibilityVariant }
                variants={ mobileNavVariants }
                transition={ NAV_TRANSITION }
                style={ staffStackBottom != null ? { top: 'auto', bottom: `${ staffStackBottom }px` } : undefined }
                className={ `absolute left-1 z-[71] flex flex-col items-center gap-[2px] bg-[#55534e] px-[2px] py-[4px] ${ staffStackBottom == null ? 'top-1/2 -translate-y-1/2' : '' } ${ sideStackClasses }` }>
                { touchLayout && buildersClubEnabled &&
                    <motion.div variants={ itemVariants }>
                        <ToolbarItemView icon="buildersclub" onClick={ () => CreateLinkEvent('catalog/toggle/builder') } className="tb-icon" />
                    </motion.div> }
                { isInRoom &&
                    <motion.div variants={ itemVariants }>
                        <ToolbarItemView icon="camera" onClick={ () => CreateLinkEvent('camera/toggle') } className="tb-icon" />
                    </motion.div> }
                { isMod &&
                    <motion.div variants={ itemVariants } className="relative">
                        <ToolbarItemView icon="modtools" onClick={ () => CreateLinkEvent('mod-tools/toggle') } className="tb-icon" />
                        { (openTicketsCount > 0) &&
                            <LayoutItemCountView count={ openTicketsCount } className="pointer-events-none absolute -right-1 -top-1 z-10" /> }
                    </motion.div> }
                { (isHk && hkEnabled) &&
                    <motion.div variants={ itemVariants }>
                        <ToolbarItemView icon="housekeeping" onClick={ () => CreateLinkEvent('housekeeping/toggle') } className="tb-icon" />
                    </motion.div> }
                { /* Below the compact breakpoint the right rail's social icons
                     live in the stack — on narrow desktop windows too, so they
                     don't jump back into the bottom bar. Real touch devices
                     keep friends + mentions in the mobile bar instead. */ }
                { socialInSideStack &&
                    <motion.div variants={ itemVariants } className="relative">
                        <ToolbarItemView icon="friendall" onClick={ () => CreateLinkEvent('friends/toggle') } className="tb-icon" />
                        { (requests.length > 0) &&
                            <LayoutItemCountView count={ requests.length } className="pointer-events-none absolute -right-1 -top-1 z-10" /> }
                    </motion.div> }
                { socialInSideStack &&
                    <motion.div variants={ itemVariants }>
                        <ToolbarItemView icon="friendsearch" onClick={ () => SendMessageComposer(new FindNewFriendsMessageComposer()) } className="tb-icon" />
                    </motion.div> }
                { (socialInSideStack && mentionsEnabled) &&
                    <motion.div variants={ itemVariants } className="relative">
                        <ToolbarItemView icon="mentions" onClick={ () => CreateLinkEvent('mentions/toggle') } className="tb-icon" />
                        { (mentionsUnread > 0) &&
                            <LayoutItemCountView count={ mentionsUnread } className="pointer-events-none absolute -right-1 -top-1 z-10" /> }
                    </motion.div> }
                { (socialInSideStack && ((iconState === MessengerIconState.SHOW) || (iconState === MessengerIconState.UNREAD))) &&
                    <motion.div variants={ itemVariants }>
                        <ToolbarItemView className={ `tb-icon ${ iconState === MessengerIconState.UNREAD ? (messengerNotifyFrame === 1 ? 'is-notify-1' : 'is-notify-0') : '' }` } icon="message" onClick={ () => OpenMessengerChat() } />
                    </motion.div> }
            </motion.div>
        </>
    );
};
