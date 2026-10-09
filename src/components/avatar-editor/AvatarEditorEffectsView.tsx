import { FC, useEffect, useState } from 'react';
import {
    AVATAR_EDITOR_NO_EFFECT,
    CreateLinkEvent,
    getAvatarEffectIconUrl,
    getAvatarEffectTimeLeftText,
    GetConfigurationValue,
    LocalizeText,
    localizeWithFallback
} from '../../api';
import effectsFxSrc from '../../assets/images/avatareditor/air/effects-fx.png';
import removeSelectionSrc from '../../assets/images/avatareditor/air/remove-selection.png';
import { ClassicScrollAreaView } from '../../common/scroll-area/ClassicScrollAreaView';
import { OwnedAvatarEffect, useAvatarEffects } from '../../hooks';

const isEffectRunning = (effect: OwnedAvatarEffect) => effect.isPermanent || effect.secondsLeft > 0;

const EffectTimeLeft: FC<{ effect: OwnedAvatarEffect }> = ({ effect }) => {
    const [secondsLeft, setSecondsLeft] = useState(effect.secondsLeft);

    useEffect(() => {
        if (effect.isPermanent) return;

        const interval = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);

        return () => clearInterval(interval);
    }, [effect.isPermanent]);

    const text = getAvatarEffectTimeLeftText(secondsLeft, effect.isPermanent);
    const progress = effect.isPermanent || effect.duration <= 0 ? 1 : Math.min(1, secondsLeft / effect.duration);

    return (
        <div className="octane-avatar-editor-effect-time">
            <div className="octane-avatar-editor-effect-time-bar" style={{ width: `${progress * 100}%` }} />
            <span>{text.parameter ? LocalizeText(text.key, [text.parameter], [text.value]) : LocalizeText(text.key)}</span>
        </div>
    );
};

/* Official avatar editor effects tab (EffectsView + EffectsParamView): a "remove" item, then the
   owned effects; picking one previews it and saving the look puts it on. */
export const AvatarEditorEffectsView: FC<{
    selectedType: number;
    onSelect: (type: number) => void;
}> = (props) => {
    const { selectedType = AVATAR_EDITOR_NO_EFFECT, onSelect = null } = props;
    const { effects = [] } = useAvatarEffects();
    const shopPage = GetConfigurationValue<string>('avatareditor.effects.buy.button.catalog.page.name', '');
    const selectedEffect = effects.find((effect) => effect.type === selectedType) ?? null;

    return (
        <div className="octane-avatar-editor-model octane-avatar-editor-effects">
            <div className="octane-avatar-editor-effects-title">
                <img alt="" src={effectsFxSrc} draggable={false} />
                <span>{LocalizeText('inventory.effects')}</span>
            </div>

            <div className="octane-avatar-editor-parts-grid">
                {!effects.length ? (
                    <div className="octane-avatar-editor-effects-empty">
                        <b>{LocalizeText('avatar.editor.content.title')}</b>
                        <span>{LocalizeText('avatar.editor.content.notification')}</span>
                    </div>
                ) : (
                    <ClassicScrollAreaView className="size-full">
                        <div className="octane-avatar-editor-effects-grid">
                            <button
                                type="button"
                                className={`avatar-parts${selectedType <= 0 ? ' part-selected' : ''}`}
                                onClick={() => onSelect(AVATAR_EDITOR_NO_EFFECT)}
                            >
                                <img alt="" src={removeSelectionSrc} draggable={false} />
                            </button>
                            {effects.map((effect) => {
                                const iconUrl = getAvatarEffectIconUrl(effect.type);

                                return (
                                    <button
                                        key={effect.type}
                                        type="button"
                                        title={localizeWithFallback(`fx_${effect.type}`, `fx_${effect.type}`)}
                                        className={`avatar-parts octane-avatar-editor-effect-item${effect.type === selectedType ? ' part-selected' : ''}`}
                                        onClick={() => onSelect(effect.type)}
                                    >
                                        {iconUrl && <img alt="" src={iconUrl} draggable={false} />}
                                        {effect.inactiveCount > 1 && <span className="octane-avatar-editor-effect-amount">{effect.inactiveCount}</span>}
                                        {isEffectRunning(effect) && (
                                            <span className="octane-avatar-editor-effect-duration">
                                                <span
                                                    style={{
                                                        width: `${effect.isPermanent || effect.duration <= 0 ? 100 : Math.min(100, (effect.secondsLeft / effect.duration) * 100)}%`
                                                    }}
                                                />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </ClassicScrollAreaView>
                )}
            </div>

            <div className="octane-avatar-editor-effects-params">
                {selectedEffect && (
                    <>
                        <b className="octane-avatar-editor-effect-name">{localizeWithFallback(`fx_${selectedEffect.type}`, `fx_${selectedEffect.type}`)}</b>
                        {isEffectRunning(selectedEffect) ? (
                            <EffectTimeLeft key={selectedEffect.type} effect={selectedEffect} />
                        ) : (
                            <span>{LocalizeText('avatareditor.save.to.activate')}</span>
                        )}
                    </>
                )}
                {shopPage && (
                    <button type="button" className="octane-avatar-editor-effects-shop" onClick={() => CreateLinkEvent(`catalog/open/${shopPage}`)}>
                        {LocalizeText('avatareditor.effects.shop')}
                    </button>
                )}
            </div>
        </div>
    );
};
