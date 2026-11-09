import { AddLinkEventTracker, ILinkEventTracker, IWheelPrize, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, TransitionEvent, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText, localizeWithFallback } from '../../api';
import { Button, LayoutAvatarImageView, LayoutCurrencyIcon } from '../../common';
import { useFortuneWheel, useHasPermission } from '../../hooks';
import { OctaneCard } from '../../layout';
import { FortuneWheelSettingsView } from './FortuneWheelSettingsView';
import { WheelWinReveal } from './WheelWinReveal';
import { renderPrizeIcon } from './wheelPrizeIcon';
import { getWinCurrencyType, getWinLabel } from './wheelPrizeLabel';
import { getSliceColorIndexes, WHEEL_SLICE_COLORS } from './wheelSliceColors';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

// Habbo's bright slice palette, each colour overridable by a runtime theme
// through --wheel-slice-<n> (the fallback values keep the stock look).
const sliceColor = (index: number) => `var(--wheel-slice-${index + 1}, ${WHEEL_SLICE_COLORS[index]})`;
const WHEEL_SIZE = 360;
const DISC_INSET = 22;
const DISC_RADIUS = WHEEL_SIZE / 2 - DISC_INSET;
const ICON_RADIUS = 104;
const BULB_COUNT = 16;
const BULB_RADIUS = WHEEL_SIZE / 2 - DISC_INSET / 2;
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
    const { freeSpins, extraSpins, spinCost, spinCostType, prizes, recentWins, pendingPrizeId, isSpinning, isRequestPending, open, spin, buySpin, finishSpin } =
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

        // A closed window has no wheel whose transition could end the spin, so it ended never: the spin button
        // stayed disabled until a reload. Land on the prize at once; the reveal waits for the next open.
        if (!isVisible) {
            setSpinPhase('idle');
            rotationRef.current = target;
            setRotation(target);
            setRevealPrize(list[idx]);
            finishSpin();
            return;
        }

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
    }, [pendingPrizeId, finishSpin, reducedMotion, isVisible]);

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
        if (!prizes.length) return sliceColor(0);

        const colors = getSliceColorIndexes(prizes.length);
        const stops = prizes.map((_, i) => `${sliceColor(colors[i])} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`).join(', ');

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

    // The server sends the new spin counts with the result: shown at once, a won "+2" would read on the
    // counters before the wheel stops. They follow the server again once the spin is over.
    const isSettled = phase === 'idle' && pendingPrizeId < 0;
    const [shownSpins, setShownSpins] = useState({ free: freeSpins, extra: extraSpins });

    if (isSettled && (shownSpins.free !== freeSpins || shownSpins.extra !== extraSpins)) setShownSpins({ free: freeSpins, extra: extraSpins });

    if (!isVisible) return null;

    const canSpin = freeSpins + extraSpins > 0 && !isSpinning && !isRequestPending && prizes.length > 0;
    const isTurning = phase !== 'idle';

    return (
        <NativeTextTree>
            <OctaneCard className="wheel-card w-[684px] max-w-[96vw]" uniqueKey="fortune-wheel">
                <OctaneCard.Header headerText={LocalizeText('wheel.title')} onCloseClick={() => setIsVisible(false)} />
                <OctaneCard.Content className="wheel-content">
                    <div className="relative">
                        <div className="wheel-layout">
                            <div ref={wheelHostRef} className="wheel-stage-host" style={{ height: WHEEL_SIZE * wheelScale }}>
                                <div
                                    className={`wheel-stage ${isTurning ? 'is-turning' : ''}`}
                                    style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, transform: `translateX(-50%) scale(${wheelScale})` }}
                                >
                                    <div className="wheel-rim" />
                                    {Array.from({ length: BULB_COUNT }, (_, i) => {
                                        const angle = (i * 360) / BULB_COUNT;

                                        return (
                                            <span
                                                key={`bulb-${i}`}
                                                className={`wheel-bulb ${i % 2 ? 'is-alt' : ''}`}
                                                style={{ transform: `rotate(${angle}deg) translateY(-${BULB_RADIUS}px)` }}
                                            />
                                        );
                                    })}
                                    {/* A turned square box grows past its circle and would scroll the window: the still frame clips it. */}
                                    <div className="wheel-disc-frame" style={{ inset: DISC_INSET }}>
                                        <div
                                            className="wheel-disc"
                                            style={{ background, transform: `rotate(${rotation}deg)`, transition: wheelTransition }}
                                            onTransitionEnd={handleTransitionEnd}
                                        >
                                            {prizes.map((_, i) => (
                                                <div
                                                    key={`divider-${i}`}
                                                    className="wheel-divider"
                                                    style={{ height: DISC_RADIUS, transform: `translateX(-1px) rotate(${i * sliceAngle}deg)` }}
                                                />
                                            ))}
                                            {prizes.map((prize, i) => {
                                                const centerAngle = (i + 0.5) * sliceAngle;

                                                return (
                                                    <div
                                                        key={prize.id}
                                                        className="wheel-slice-anchor"
                                                        style={{ transform: `rotate(${centerAngle}deg) translateY(-${ICON_RADIUS}px) rotate(-${centerAngle}deg)` }}
                                                    >
                                                        {/* Turned back by the wheel's own angle, on the same curve, so the prizes stay upright while it spins. */}
                                                        <div className="wheel-slice-plate" style={{ transform: `translate(-50%, -50%) rotate(${-rotation}deg)`, transition: wheelTransition }}>
                                                            {renderPrizeIcon(prize)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="wheel-hub" />
                                    <svg className="wheel-pointer" width="32" height="38" viewBox="0 0 32 38" aria-hidden="true">
                                        <path d="M3 3 H29 V13 L16 35 L3 13 Z" />
                                        <path className="wheel-pointer-shine" d="M7 7 H25 V11 H7 Z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="wheel-side">
                                <div className="wheel-panel wheel-spins">
                                    <div className="wheel-spins-row">
                                        <span>{localizeWithFallback('wheel.spins.free', 'Free spins today')}</span>
                                        <span className="wheel-spins-count">{shownSpins.free}</span>
                                    </div>
                                    <div className="wheel-spins-row">
                                        <span>{localizeWithFallback('wheel.spins.extra', 'Extra spins')}</span>
                                        <span className="wheel-spins-count">{shownSpins.extra}</span>
                                    </div>
                                </div>
                                <Button variant="primary" size="lg" disabled={!canSpin} onClick={() => spin()} classNames={['wheel-spin-button']}>
                                    {LocalizeText('wheel.spin')}
                                </Button>
                                <div className="wheel-actions">
                                    <Button variant="secondary" disabled={isRequestPending} onClick={() => buySpin()} classNames={['wheel-buy-button']}>
                                        <span>{LocalizeText('wheel.buy')}</span>
                                        <span className="wheel-buy-cost">
                                            {spinCost}
                                            <LayoutCurrencyIcon type={spinCostType} />
                                        </span>
                                    </Button>
                                    {canManage && (
                                        <Button variant="secondary" onClick={() => setIsSettingsOpen(true)}>
                                            {LocalizeText('wheel.settings')}
                                        </Button>
                                    )}
                                </div>
                                <div className="wheel-panel wheel-winners">
                                    <div className="wheel-winners-title">{LocalizeText('wheel.winners')}</div>
                                    <div className="wheel-winners-list">
                                        {recentWins.map((win, i) => {
                                            const currencyType = getWinCurrencyType(win.prizeLabel, prizes);

                                            return (
                                                <div key={i} className="wheel-winner">
                                                    <div className="wheel-winner-avatar">
                                                        <LayoutAvatarImageView figure={win.look} headOnly direction={2} style={{ backgroundSize: 'auto', backgroundPosition: '-22px -32px' }} />
                                                    </div>
                                                    <div className="wheel-winner-copy">
                                                        <span className="wheel-winner-name">{win.username}</span>
                                                        <span className="wheel-winner-prize">
                                                            {currencyType !== null && <LayoutCurrencyIcon type={currencyType} />}
                                                            <span>{getWinLabel(win.prizeLabel, prizes)}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {!recentWins.length && <div className="wheel-winners-empty">{LocalizeText('wheel.winners.empty')}</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {revealPrize && <WheelWinReveal prize={revealPrize} onDismiss={() => setRevealPrize(null)} />}
                    </div>
                </OctaneCard.Content>
                {canManage && isSettingsOpen && <FortuneWheelSettingsView onClose={() => setIsSettingsOpen(false)} />}
            </OctaneCard>
        </NativeTextTree>
    );
};
