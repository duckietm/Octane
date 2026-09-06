import { AddLinkEventTracker, ILinkEventTracker, IWheelPrize, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, TransitionEvent, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText } from '../../api';
import { Column, Flex, LayoutAvatarImageView, LayoutCurrencyIcon, Text } from '../../common';
import { useFortuneWheel, useHasPermission } from '../../hooks';
import { OctaneCard } from '../../layout';
import { FortuneWheelSettingsView } from './FortuneWheelSettingsView';
import { WheelWinReveal } from './WheelWinReveal';
import { renderPrizeIcon } from './wheelPrizeIcon';

// Stock UI palette (white / light-blue / grey / black). Exposed as CSS custom
// properties so a runtime theme can recolor the wheel without changing defaults
// (the fallback values keep the stock look when no theme overrides them).
const SLICE_COLORS = ['var(--wheel-slice-1, #eef2f5)', 'var(--wheel-slice-2, #c3dcec)'];
const RIM = 'var(--wheel-rim, #4c606c)';
const DIVIDER = 'var(--wheel-divider, rgba(76,96,108,0.3))';
const HUB = 'var(--wheel-hub, #eef2f5)';
const WHEEL_SIZE = 420;
const ICON_RADIUS = 150;
const FULL_TURNS = 5;

// Spin motion (wind-back → fast spin past target → settle back).
const WINDBACK_DEG = 14;
const OVERSHOOT_DEG = 16;
const WINDBACK_MS = 250;
const SPIN_MS = 4000;
const SETTLE_MS = 550;

type SpinPhase = 'idle' | 'windback' | 'spin' | 'settle';

export const FortuneWheelView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { freeSpins, extraSpins, spinCost, spinCostType, prizes, recentWins, pendingPrizeId, isSpinning, open, spin, buySpin, finishSpin } =
        useFortuneWheel();
    const canManage = useHasPermission('acc_wheeladmin');

    const [rotation, setRotation] = useState(0);
    const [phase, setPhase] = useState<SpinPhase>('idle');
    const [revealPrize, setRevealPrize] = useState<IWheelPrize | null>(null);
    const [wheelScale, setWheelScale] = useState(1);

    const rotationRef = useRef(0);
    const targetRef = useRef(0);
    const phaseRef = useRef<SpinPhase>('idle');
    const wonPrizeRef = useRef<IWheelPrize | null>(null);
    const prizesRef = useRef<IWheelPrize[]>([]);
    const wheelHostRef = useRef<HTMLDivElement>(null);
    prizesRef.current = prizes;

    const reducedMotion = useMemo(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);

    const setSpinPhase = (next: SpinPhase) => {
        phaseRef.current = next;
        setPhase(next);
    };

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');
                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prev) => !prev);
                        return;
                }
            },
            eventUrlPrefix: 'fortune-wheel/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        if (isVisible) open();
    }, [isVisible, open]);

    // Keep the wheel fitting its container on narrow viewports without
    // rewriting the px-based slice/icon math: measure the available width
    // and scale the whole wheel down to fit.
    useEffect(() => {
        const host = wheelHostRef.current;
        if (!host || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width ?? WHEEL_SIZE;
            setWheelScale(Math.min(1, width / WHEEL_SIZE));
        });
        observer.observe(host);

        return () => observer.disconnect();
    }, [isVisible]);

    // Drive the spin animation when the server reports the winning slice.
    useEffect(() => {
        if (pendingPrizeId < 0) return;

        const list = prizesRef.current;
        const idx = list.findIndex((prize) => prize.id === pendingPrizeId);

        if (!list.length || idx < 0) {
            finishSpin();
            return;
        }

        wonPrizeRef.current = list[idx];

        const sliceAngle = 360 / list.length;
        const centerAngle = (idx + 0.5) * sliceAngle;
        const current = rotationRef.current;
        const target = current - (current % 360) + FULL_TURNS * 360 + (360 - centerAngle);
        targetRef.current = target;

        if (reducedMotion) {
            // Single straightforward move to the target, no flourish.
            setSpinPhase('spin');
            rotationRef.current = target;
            setRotation(target);
            return;
        }

        // Phase 1: tiny anticipation wind-back before the spin.
        setSpinPhase('windback');
        const back = current - WINDBACK_DEG;
        rotationRef.current = back;
        setRotation(back);
    }, [pendingPrizeId, finishSpin, reducedMotion]);

    const finishReveal = () => {
        setSpinPhase('idle');
        setRevealPrize(wonPrizeRef.current);
        finishSpin();
    };

    const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
        // Only react to the wheel's own transform transition finishing. Child
        // elements (prize icons, badges) can emit their own bubbling
        // transitionend events; without this guard they'd advance the spin
        // phase machine early and reveal the prize before the wheel stops.
        if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;

        switch (phaseRef.current) {
            case 'windback':
                // Phase 2: spin fast, overshooting the target slightly.
                setSpinPhase('spin');
                rotationRef.current = targetRef.current + OVERSHOOT_DEG;
                setRotation(rotationRef.current);
                return;
            case 'spin':
                if (reducedMotion) {
                    finishReveal();
                    return;
                }
                // Phase 3: settle back from the overshoot onto the target.
                setSpinPhase('settle');
                rotationRef.current = targetRef.current;
                setRotation(rotationRef.current);
                return;
            case 'settle':
                finishReveal();
                return;
        }
    };

    const sliceAngle = prizes.length ? 360 / prizes.length : 0;

    const background = useMemo(() => {
        if (!prizes.length) return SLICE_COLORS[0];

        const stops = prizes.map((_, i) => `${SLICE_COLORS[i % 2]} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`).join(', ');
        return `conic-gradient(${stops})`;
    }, [prizes, sliceAngle]);

    const wheelTransition = useMemo(() => {
        switch (phase) {
            case 'windback':
                return `transform ${WINDBACK_MS}ms ease-in`;
            case 'spin':
                return `transform ${SPIN_MS}ms cubic-bezier(0.12,0.78,0.2,1)`;
            case 'settle':
                return `transform ${SETTLE_MS}ms ease-out`;
            default:
                return 'none';
        }
    }, [phase]);

    if (!isVisible) return null;

    const canSpin = freeSpins + extraSpins > 0 && !isSpinning && prizes.length > 0;

    return (
        <OctaneCard className="wheel-card w-[780px] max-w-[96vw]" uniqueKey="fortune-wheel">
            <OctaneCard.Header headerText={LocalizeText('wheel.title')} onCloseClick={() => setIsVisible(false)} />
            <OctaneCard.Content>
                <div className="relative">
                    <Flex gap={3} className="flex-col sm:flex-row">
                        <Column alignItems="center" gap={2} className="w-full shrink-0 sm:w-[420px]">
                            <div ref={wheelHostRef} className="relative w-full" style={{ height: WHEEL_SIZE * wheelScale }}>
                                <div
                                    className="absolute left-1/2 top-0"
                                    style={{
                                        width: WHEEL_SIZE,
                                        height: WHEEL_SIZE,
                                        transform: `translateX(-50%) scale(${wheelScale})`,
                                        transformOrigin: 'top center'
                                    }}
                                >
                                    <div
                                        className="absolute left-1/2 -top-2 z-20 -translate-x-1/2 drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]"
                                        style={{
                                            width: 0,
                                            height: 0,
                                            borderLeft: '14px solid transparent',
                                            borderRight: '14px solid transparent',
                                            borderTop: `28px solid ${RIM}`
                                        }}
                                    />
                                    <div
                                        className="absolute inset-0 rounded-full shadow-[0_0_0_4px_rgba(0,0,0,0.12),inset_0_0_18px_rgba(0,0,0,0.1)]"
                                        style={{ background, border: `8px solid ${RIM}`, transform: `rotate(${rotation}deg)`, transition: wheelTransition }}
                                        onTransitionEnd={handleTransitionEnd}
                                    >
                                        {prizes.map((_, i) => (
                                            <div
                                                key={`divider-${i}`}
                                                className="absolute bottom-1/2 left-1/2 origin-bottom"
                                                style={{
                                                    width: '2px',
                                                    height: `${WHEEL_SIZE / 2}px`,
                                                    transform: `translateX(-1px) rotate(${i * sliceAngle}deg)`,
                                                    background: DIVIDER
                                                }}
                                            />
                                        ))}
                                        {prizes.map((prize, i) => {
                                            const centerAngle = (i + 0.5) * sliceAngle;
                                            return (
                                                <div
                                                    key={prize.id}
                                                    className="absolute left-1/2 top-1/2"
                                                    style={{ transform: `rotate(${centerAngle}deg) translateY(-${ICON_RADIUS}px) rotate(-${centerAngle}deg)` }}
                                                >
                                                    <div className="wheel-slice-icon -translate-x-1/2 -translate-y-1/2">{renderPrizeIcon(prize)}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div
                                        className="absolute left-1/2 top-1/2 z-10 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.25)]"
                                        style={{ border: `4px solid ${RIM}`, background: HUB }}
                                    />
                                </div>
                            </div>
                            <Text bold className="text-[#2f6f95]">
                                {LocalizeText('wheel.free.today', ['count'], [freeSpins.toString()])}
                            </Text>
                            <Text small className="text-[#33424c]">
                                {LocalizeText('wheel.extra', ['count'], [extraSpins.toString()])}
                            </Text>
                            <Flex gap={2} alignItems="center" className="flex-wrap justify-center">
                                <button
                                    disabled={!canSpin}
                                    onClick={() => spin()}
                                    className="cursor-pointer rounded bg-[#3a7bb5] px-4 py-2 font-bold text-white hover:bg-[#336ea3] disabled:cursor-default disabled:opacity-40"
                                >
                                    {LocalizeText('wheel.spin')}
                                </button>
                                <button
                                    onClick={() => buySpin()}
                                    className="flex cursor-pointer items-center gap-1 rounded bg-[#6b7884] px-3 py-2 text-white hover:bg-[#5e6a75]"
                                >
                                    {LocalizeText('wheel.buy')} {spinCost}
                                    <LayoutCurrencyIcon type={spinCostType} />
                                </button>
                                {canManage && (
                                    <button
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="cursor-pointer rounded bg-[#8a6b3a] px-3 py-2 font-bold text-white hover:bg-[#735730]"
                                    >
                                        {LocalizeText('wheel.settings')}
                                    </button>
                                )}
                            </Flex>
                        </Column>
                        <Column gap={2} className="min-w-[300px] grow rounded-lg border border-black/10 bg-black/5 p-3">
                            <Text bold className="text-base text-[#33424c]">
                                {LocalizeText('wheel.winners')}
                            </Text>
                            <Column gap={1} overflow="auto" className="h-[440px] max-h-[60vh]">
                                {recentWins.map((win, i) => (
                                    <Flex key={i} alignItems="center" gap={2} className="rounded border-b border-black/10 py-1.5 hover:bg-black/5">
                                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-black/5">
                                            <LayoutAvatarImageView
                                                figure={win.look}
                                                headOnly
                                                direction={2}
                                                style={{ backgroundSize: 'auto', backgroundPosition: '-22px -32px' }}
                                            />
                                        </div>
                                        <Column gap={0} className="min-w-0">
                                            <Text bold truncate className="text-[#1f2d34]">
                                                {win.username}
                                            </Text>
                                            <Text small truncate className="text-[#2f6f95]">
                                                {win.prizeLabel}
                                            </Text>
                                        </Column>
                                    </Flex>
                                ))}
                                {!recentWins.length && (
                                    <Text small className="text-black/50">
                                        {LocalizeText('wheel.winners.empty')}
                                    </Text>
                                )}
                            </Column>
                        </Column>
                    </Flex>
                    {revealPrize && <WheelWinReveal prize={revealPrize} onDismiss={() => setRevealPrize(null)} />}
                </div>
            </OctaneCard.Content>
            {canManage && isSettingsOpen && <FortuneWheelSettingsView onClose={() => setIsSettingsOpen(false)} />}
        </OctaneCard>
    );
};
