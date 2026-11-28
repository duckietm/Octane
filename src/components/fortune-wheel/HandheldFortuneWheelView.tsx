import { IWheelPrize, IWheelRecentWin } from '@octane/renderer';
import { CSSProperties, FC, ReactNode, RefObject } from 'react';
import { localizeWithFallback } from '../../api';
import { LayoutAvatarImageView, LayoutCurrencyIcon } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { DraggableWindow } from '../../common/draggable-window';
import { HandheldSheetFrame } from '../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { renderPrizeIcon } from './wheelPrizeIcon';
import { getWheelPrizeLabel, getWinCurrencyType, getWinLabel } from './wheelPrizeLabel';
import { getPrizeTier } from './wheelPrizeTier';
import { getSliceColorIndexes, sliceColor } from './wheelSliceColors';

export interface HandheldFortuneWheelViewProps {
    /** The wheel as FortuneWheelView draws it (rim, disc, prizes, pointer), already scaled to `wheelSize`. */
    stage: ReactNode;
    /** The box FortuneWheelView measures to scale the wheel. */
    wheelHostRef: RefObject<HTMLDivElement>;
    /** The drawn size of the wheel in CSS px. */
    wheelSize: number;
    freeSpins: number;
    extraSpins: number;
    spinCost: number;
    spinCostType: number;
    prizes: IWheelPrize[];
    recentWins: IWheelRecentWin[];
    canSpin: boolean;
    isTurning: boolean;
    isRequestPending: boolean;
    canManage: boolean;
    /** The win card, or null. */
    reveal: ReactNode;
    /** The staff settings (FortuneWheelSettingsView), or null while closed. */
    settings: ReactNode;
    onSpin: () => void;
    onBuySpin: () => void;
    onOpenSettings: () => void;
    onClose: () => void;
}

/**
 * The wheel of fortune on a phone (HandheldFortuneWheel.css): a sheet with the wheel as wide as the screen, the green
 * Spin button and the spins left under it, buying a spin, the prizes as cards and the recent winners. On its side the
 * wheel stands at the left, everything else scrolls at the right. FortuneWheelView keeps every state, packet and check
 * and hands them here; the staff settings are a page of the same sheet. The wheel page stays mounted (and drawn) under
 * that page, so a spin that is running lands and ends as it would on screen.
 */
export const HandheldFortuneWheelView: FC<HandheldFortuneWheelViewProps> = (props) => {
    const {
        stage,
        wheelHostRef,
        wheelSize,
        freeSpins,
        extraSpins,
        spinCost,
        spinCostType,
        prizes,
        recentWins,
        canSpin,
        isTurning,
        isRequestPending,
        canManage,
        reveal,
        settings,
        onSpin,
        onBuySpin,
        onOpenSettings,
        onClose
    } = props;
    const covered = !!settings;
    const colors = getSliceColorIndexes(prizes.length);
    const noSpins = !isTurning && freeSpins + extraSpins <= 0;

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="fortune-wheel">
                <HandheldSheetFrame
                    className="octane-handheld-wheel"
                    icon="icon-fortune-wheel"
                    title={localizeWithFallback('wheel.title', 'Wheel of Fortune')}
                    onClose={onClose}
                >
                    <div
                        aria-hidden={covered || undefined}
                        className="octane-handheld-wheel__page is-wheel"
                        data-covered={covered}
                        data-testid="wheel-page"
                        inert={covered}
                    >
                        <div ref={wheelHostRef} className="octane-handheld-wheel__stage">
                            <div className="octane-handheld-wheel__stage-box" style={{ width: wheelSize, height: wheelSize }}>
                                {stage}
                            </div>
                        </div>
                        <div className="octane-handheld-wheel__side">
                            <BaseButton className="octane-handheld-wheel__spin" data-testid="wheel-spin" disabled={!canSpin} onClick={onSpin}>
                                {isTurning
                                    ? localizeWithFallback('octane.handheld.fortune_wheel.spinning', 'Spinning...')
                                    : localizeWithFallback('wheel.spin', 'Spin')}
                            </BaseButton>
                            <div className="octane-handheld-wheel__spins">
                                <span className="octane-handheld-wheel__count" data-testid="wheel-free-spins">
                                    <span className="octane-handheld-wheel__count-label">{localizeWithFallback('wheel.spins.free', 'Free spins today')}</span>
                                    <strong className="octane-handheld-wheel__count-value">{freeSpins}</strong>
                                </span>
                                <span className="octane-handheld-wheel__count" data-testid="wheel-extra-spins">
                                    <span className="octane-handheld-wheel__count-label">{localizeWithFallback('wheel.spins.extra', 'Extra spins')}</span>
                                    <strong className="octane-handheld-wheel__count-value">{extraSpins}</strong>
                                </span>
                            </div>
                            {noSpins && (
                                <div className="octane-handheld-wheel__note">
                                    {localizeWithFallback('octane.handheld.fortune_wheel.no_spins', 'No spins left today. Buy a spin to play again.')}
                                </div>
                            )}
                            <div className="octane-handheld-wheel__actions">
                                <BaseButton
                                    className="octane-handheld-wheel__button is-buy"
                                    data-testid="wheel-buy"
                                    disabled={isRequestPending}
                                    onClick={onBuySpin}
                                >
                                    <span>{localizeWithFallback('wheel.buy', 'Buy a spin')}</span>
                                    <span className="octane-handheld-wheel__cost">
                                        <span>{spinCost}</span>
                                        <LayoutCurrencyIcon type={spinCostType} />
                                    </span>
                                </BaseButton>
                                {canManage && (
                                    <BaseButton
                                        className="octane-handheld-wheel__button is-settings"
                                        data-testid="wheel-settings-open"
                                        onClick={onOpenSettings}
                                    >
                                        {localizeWithFallback('wheel.settings', 'Settings')}
                                    </BaseButton>
                                )}
                            </div>
                            {prizes.length > 0 && (
                                <section className="octane-handheld-wheel__section">
                                    <div className="octane-handheld-wheel__heading">
                                        {localizeWithFallback('octane.handheld.fortune_wheel.prizes', 'Prizes on the wheel')}
                                    </div>
                                    <div className="octane-handheld-wheel__prizes" data-testid="wheel-prizes">
                                        {prizes.map((prize, index) => (
                                            <div
                                                key={prize.id}
                                                className="octane-handheld-wheel__prize"
                                                data-tier={getPrizeTier(prize)}
                                                style={{ '--wheel-prize-slice': sliceColor(colors[index]) } as CSSProperties}
                                            >
                                                <span className="octane-handheld-wheel__prize-icon">{renderPrizeIcon(prize)}</span>
                                                <span className="octane-handheld-wheel__prize-label">{getWheelPrizeLabel(prize)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                            <section className="octane-handheld-wheel__section">
                                <div className="octane-handheld-wheel__heading">{localizeWithFallback('wheel.winners', 'Recent winners')}</div>
                                <div className="octane-handheld-wheel__winners" data-testid="wheel-winners">
                                    {recentWins.map((win, index) => {
                                        const currencyType = getWinCurrencyType(win.prizeLabel, prizes);

                                        return (
                                            <div key={index} className="octane-handheld-wheel__winner">
                                                <span className="octane-handheld-wheel__winner-head">
                                                    <LayoutAvatarImageView
                                                        headOnly
                                                        compactHead
                                                        compactHeadPadding={0}
                                                        compactHeadSize={33}
                                                        direction={2}
                                                        figure={win.look}
                                                    />
                                                </span>
                                                <span className="octane-handheld-wheel__winner-text">
                                                    <span className="octane-handheld-wheel__winner-name">{win.username}</span>
                                                    <span className="octane-handheld-wheel__winner-prize">
                                                        {currencyType !== null && <LayoutCurrencyIcon type={currencyType} />}
                                                        <span>{getWinLabel(win.prizeLabel, prizes)}</span>
                                                    </span>
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {!recentWins.length && (
                                        <div className="octane-handheld-wheel__empty">{localizeWithFallback('wheel.winners.empty', 'Nobody has won yet.')}</div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                    {covered && <div className="octane-handheld-wheel__page is-settings">{settings}</div>}
                    {reveal}
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
