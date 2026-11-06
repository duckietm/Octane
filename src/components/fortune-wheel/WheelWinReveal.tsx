import { IWheelPrize } from '@octane/renderer';
import { FC, useEffect } from 'react';
import { LocalizeText } from '../../api';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { renderPrizeIcon } from './wheelPrizeIcon';
import { getWheelPrizeLabel } from './wheelPrizeLabel';
import { getPrizeTier } from './wheelPrizeTier';
import { WHEEL_SLICE_COLORS } from './wheelSliceColors';

interface WheelWinRevealProps {
    prize: IWheelPrize;
    onDismiss: () => void;
}

const CONFETTI_COUNT = 40;

// Precomputed once at module load (not during render) so the React Compiler
// purity rules stay happy and there's no per-mount cost. A fixed spread of
// 40 square pieces in the wheel's colours reads as a lively pixel burst.
const CONFETTI = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.8 + Math.random() * 1.4,
    drift: (Math.random() - 0.5) * 160,
    color: WHEEL_SLICE_COLORS[i % WHEEL_SLICE_COLORS.length],
    size: 4 + 2 * Math.round(Math.random() * 2)
}));

// How long each tier lingers before auto-dismissing (ms).
const AUTO_DISMISS = { none: 2000, common: 2400, rare: 4000 } as const;

export const WheelWinReveal: FC<WheelWinRevealProps> = ({ prize, onDismiss }) => {
    const tier = getPrizeTier(prize);

    useEffect(() => {
        const timer = window.setTimeout(onDismiss, AUTO_DISMISS[tier]);
        return () => window.clearTimeout(timer);
    }, [tier, onDismiss]);

    // The "nothing" slice gets a quiet, non-celebratory message.
    if (tier === 'none') {
        return (
            <NativeTextTree>
                <div className="wheel-win-reveal is-quiet absolute inset-0 z-40" onClick={onDismiss}>
                    <div className="wheel-win-card is-quiet">
                        <div className="wheel-win-icon">{renderPrizeIcon(prize, true)}</div>
                        <div className="wheel-win-copy">
                            <div className="wheel-win-title">{LocalizeText('wheel.win.nothing')}</div>
                        </div>
                    </div>
                </div>
            </NativeTextTree>
        );
    }

    const isRare = tier === 'rare';
    const label = getWheelPrizeLabel(prize);

    return (
        <NativeTextTree>
            <div className={`wheel-win-reveal absolute inset-0 z-40 ${isRare ? 'is-rare' : ''}`} onClick={onDismiss}>
                {isRare &&
                    CONFETTI.map((piece, i) => (
                        <span
                            key={i}
                            className="wheel-confetti"
                            style={{
                                left: `${piece.left}%`,
                                width: `${piece.size}px`,
                                height: `${piece.size}px`,
                                background: piece.color,
                                ['--drift' as any]: `${piece.drift}px`,
                                animation: `wheelConfettiFall ${piece.duration}s ${piece.delay}s linear forwards`
                            }}
                        />
                    ))}

                {isRare && <div className="wheel-win-jackpot">{LocalizeText('wheel.win.jackpot')}</div>}

                <div className={`wheel-win-card ${isRare ? 'is-rare' : ''}`}>
                    <div className="wheel-win-icon">{renderPrizeIcon(prize, true)}</div>

                    <div className="wheel-win-copy">
                        <div className="wheel-win-title">{LocalizeText('wheel.win.title')}</div>
                        {!!label && <div className="wheel-win-prize">{label}</div>}
                    </div>
                </div>
            </div>
        </NativeTextTree>
    );
};
