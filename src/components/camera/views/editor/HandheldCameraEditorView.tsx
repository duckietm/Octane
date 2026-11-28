import { IRoomCameraWidgetEffect, IRoomCameraWidgetSelectedEffect } from '@octane/renderer';
import { CSSProperties, FC } from 'react';
import { CameraPictureThumbnail, LocalizeText, localizeWithFallback } from '../../../../api';
import { Slider } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { DraggableWindow } from '../../../../common/draggable-window';
import { HandheldSheetFrame } from '../../../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { ToggleButton } from '../../../../common/ToggleButton';

export interface HandheldCameraEditorViewProps {
    tabs: string[];
    currentTab: string;
    /** The effects of the tab on screen. */
    effects: IRoomCameraWidgetEffect[];
    thumbnails: CameraPictureThumbnail[];
    selectedEffects: IRoomCameraWidgetSelectedEffect[];
    selectedEffectName: string;
    /** The selected effect when it is on the picture. */
    currentEffect: IRoomCameraWidgetSelectedEffect | null;
    myLevel: number;
    pictureUrl: string;
    isZoomed: boolean;
    isRendering: boolean;
    /** The editor's own actions: close, cancel, checkout, change_tab, select_effect, remove_effect, clear_effects, download, zoom. */
    processAction: (type: string, name?: string) => void;
    /** The strength of the selected effect, 0..100. */
    onStrength: (value: number) => void;
    onDeselect: () => void;
    onHelp: () => void;
}

/**
 * The photo editor on a phone, in the phone frame (HandheldSheetFrame, HandheldCamera.css). The editor keeps the effects,
 * the rendering and every action; this shows them for a finger: the effect categories are the tabs, the picture is on top
 * (on its side: at the left), then zoom / save / clear, the selected effect with its strength and a way to take it off, the
 * effects as a grid of finger-sized tiles, and Cancel / Preview in a bar at the bottom.
 */
export const HandheldCameraEditorView: FC<HandheldCameraEditorViewProps> = (props) => {
    const {
        tabs,
        currentTab,
        effects = [],
        thumbnails = [],
        selectedEffects = [],
        selectedEffectName = null,
        currentEffect = null,
        myLevel = 1,
        pictureUrl = '',
        isZoomed = false,
        isRendering = false,
        processAction,
        onStrength,
        onDeselect,
        onHelp
    } = props;
    const strength = currentEffect ? Math.round(currentEffect.strength * 100) : 0;
    const effectName = currentEffect ? LocalizeText(`camera.effect.name.${currentEffect.effect.name}`) : '';

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="camera-editor">
                <HandheldSheetFrame
                    activeTab={currentTab}
                    className="octane-handheld-camera-editor"
                    headerExtra={
                        <BaseButton
                            aria-label={LocalizeText('generic.help')}
                            className="octane-handheld-sheet__caption-button octane-handheld-camera-editor__help"
                            onClick={onHelp}
                        >
                            ?
                        </BaseButton>
                    }
                    icon="icon-camera-small"
                    tabs={tabs.map((tab) => ({ id: tab, label: LocalizeText(`camera.effect.category.${tab}`) }))}
                    tabsLabel={localizeWithFallback('octane.handheld.camera.effects', 'Effects')}
                    title={LocalizeText('camera.editor.button.text')}
                    onClose={() => processAction('close')}
                    onTab={(tab) => processAction('change_tab', tab)}
                >
                    <div className="octane-handheld-camera-editor__layout">
                        {/* A tap on the picture lets go of the selected effect, as on the desktop. */}
                        <div aria-busy={isRendering} className="octane-handheld-camera-editor__picture" onClick={onDeselect}>
                            {pictureUrl && <img alt="" draggable={false} src={pictureUrl} />}
                        </div>

                        <div className="octane-handheld-camera-editor__controls">
                            <div className="octane-handheld-camera-editor__tools">
                                <ToggleButton className="octane-handheld-camera-editor__chip is-zoom" pressed={isZoomed} onClick={() => processAction('zoom')}>
                                    {LocalizeText('room.zoom.button.text')}
                                </ToggleButton>
                                <BaseButton
                                    className="octane-handheld-camera-editor__chip is-save"
                                    disabled={!pictureUrl}
                                    onClick={() => processAction('download')}
                                >
                                    {LocalizeText('floor.plan.editor.save')}
                                </BaseButton>
                                <BaseButton
                                    className="octane-handheld-camera-editor__chip is-clear"
                                    disabled={!selectedEffects.length}
                                    onClick={() => processAction('clear_effects')}
                                >
                                    {localizeWithFallback('octane.handheld.camera.clear', 'Clear all')}
                                </BaseButton>
                            </div>

                            <div className={`octane-handheld-camera-editor__effect${currentEffect ? '' : ' is-empty'}`}>
                                {currentEffect ? (
                                    <>
                                        <span className="octane-handheld-camera-editor__effect-name">
                                            {currentEffect.effect.type === 'frame' ? effectName : `${effectName} ${strength}%`}
                                        </span>
                                        {currentEffect.effect.type !== 'frame' && (
                                            <Slider
                                                bare
                                                className="octane-handheld-camera-editor__slider"
                                                style={{ '--hh-fill': `${strength}%` } as CSSProperties}
                                                max={100}
                                                min={0}
                                                step={1}
                                                thumbAriaLabel={effectName}
                                                value={strength}
                                                onChange={(value) => onStrength(value)}
                                            />
                                        )}
                                        <BaseButton
                                            className="octane-handheld-camera-editor__chip is-remove"
                                            onClick={() => processAction('remove_effect', currentEffect.effect.name)}
                                        >
                                            {LocalizeText('camera.delete.button.text')}
                                        </BaseButton>
                                    </>
                                ) : (
                                    <span className="octane-handheld-camera-editor__hint">
                                        {localizeWithFallback('octane.handheld.camera.effects.hint', 'Tap an effect to put it on the picture.')}
                                    </span>
                                )}
                            </div>

                            <div className="octane-handheld-camera-editor__grid">
                                {effects.map((effect) => {
                                    const isLocked = effect.minLevel > myLevel;
                                    const isActive = selectedEffects.some((selectedEffect) => selectedEffect.effect.name === effect.name);
                                    const thumbnail = thumbnails.find((entry) => entry.effectName === effect.name)?.thumbnailUrl ?? null;
                                    const title = isLocked
                                        ? `${LocalizeText('camera.effect.required.level')} ${effect.minLevel}`
                                        : LocalizeText(`camera.effect.name.${effect.name}`);

                                    return (
                                        <ToggleButton
                                            key={effect.name}
                                            aria-label={title}
                                            className={`octane-handheld-camera-editor__tile${selectedEffectName === effect.name ? ' is-selected' : ''}${isLocked ? ' is-locked' : ''}`}
                                            disabled={isLocked}
                                            pressed={isActive}
                                            onClick={() => processAction('select_effect', effect.name)}
                                        >
                                            {!isLocked && thumbnail && <img alt="" draggable={false} src={thumbnail} />}
                                            {isLocked && <span className="octane-handheld-camera-editor__level">{effect.minLevel}</span>}
                                            {isActive && <span aria-hidden="true" className="octane-handheld-camera-editor__tick" />}
                                        </ToggleButton>
                                    );
                                })}
                            </div>

                            <div className="octane-handheld-camera-editor__bar">
                                <BaseButton className="octane-handheld-camera-editor__button is-cancel" onClick={() => processAction('cancel')}>
                                    {LocalizeText('catalog.purchase_confirmation.cancel')}
                                </BaseButton>
                                <BaseButton
                                    className="octane-handheld-camera-editor__button is-primary"
                                    disabled={isRendering || !pictureUrl}
                                    onClick={() => processAction('checkout')}
                                >
                                    {LocalizeText('camera.preview.button.text')}
                                </BaseButton>
                            </div>
                        </div>
                    </div>
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
