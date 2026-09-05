import {
    GetRoomCameraWidgetManager,
    IRoomCameraWidgetEffect,
    IRoomCameraWidgetSelectedEffect,
    OctaneLogger,
    RoomCameraWidgetSelectedEffect
} from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaDownload, FaSearchMinus, FaSearchPlus, FaTrash } from 'react-icons/fa';
import { CameraEditorTabs, CameraPicture, CameraPictureThumbnail, LocalizeText } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Slider } from '../../../../common';
import { CameraWidgetEffectListView } from './effect-list';

export interface CameraWidgetEditorViewProps {
    picture: CameraPicture;
    availableEffects: IRoomCameraWidgetEffect[];
    myLevel: number;
    onClose: () => void;
    onCancel: () => void;
    onCheckout: (pictureUrl: string) => void;
}

const TABS: string[] = [CameraEditorTabs.COLORMATRIX, CameraEditorTabs.COMPOSITE];
const DEFAULT_EFFECT_STRENGTH: number = 0.5;
const EFFECT_RENDER_DEBOUNCE: number = 50;

const getDownloadName = (): string => {
    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, '0');

    return `Habbo_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.png`;
};

export const CameraWidgetEditorView: FC<CameraWidgetEditorViewProps> = (props) => {
    const { picture = null, availableEffects = [], myLevel = 1, onClose = null, onCancel = null, onCheckout = null } = props;
    const [currentTab, setCurrentTab] = useState(TABS[0]);
    const [selectedEffectName, setSelectedEffectName] = useState<string>(null);
    const [selectedEffects, setSelectedEffects] = useState<IRoomCameraWidgetSelectedEffect[]>([]);
    const [effectsThumbnails, setEffectsThumbnails] = useState<CameraPictureThumbnail[]>([]);
    const [isZoomed, setIsZoomed] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [currentPictureUrl, setCurrentPictureUrl] = useState<string>(picture?.imageUrl ?? '');
    const requestIdRef = useRef<number>(0);
    const stableTexture = picture?.texture ?? null;

    const colorMatrixEffects = useMemo(() => availableEffects.filter((effect) => effect.colorMatrix), [availableEffects]);
    const compositeEffects = useMemo(() => availableEffects.filter((effect) => effect.texture), [availableEffects]);
    const visibleEffects = currentTab === CameraEditorTabs.COLORMATRIX ? colorMatrixEffects : compositeEffects;

    const getSelectedEffectIndex = useCallback(
        (name: string) => {
            if (!name || !selectedEffects.length) return -1;

            return selectedEffects.findIndex((effect) => effect.effect.name === name);
        },
        [selectedEffects]
    );

    const currentEffectIndex = getSelectedEffectIndex(selectedEffectName);
    const currentEffect = currentEffectIndex >= 0 ? selectedEffects[currentEffectIndex] : null;

    const setSelectedEffectAlpha = useCallback(
        (alpha: number) => {
            if (currentEffectIndex < 0) return;

            setIsRendering(true);
            setSelectedEffects((previous) => {
                const next = [...previous];
                const selectedEffect = next[currentEffectIndex];

                next[currentEffectIndex] = new RoomCameraWidgetSelectedEffect(selectedEffect.effect, alpha);

                return next;
            });
        },
        [currentEffectIndex]
    );

    const processAction = useCallback(
        (type: string, effectName: string = null) => {
            switch (type) {
                case 'close':
                    onClose();
                    return;
                case 'cancel':
                    onCancel();
                    return;
                case 'checkout':
                    if (!isRendering && currentPictureUrl) onCheckout(currentPictureUrl);
                    return;
                case 'change_tab':
                    setCurrentTab(String(effectName));
                    setSelectedEffectName(null);
                    return;
                case 'select_effect': {
                    const effect = availableEffects.find((availableEffect) => availableEffect.name === effectName);

                    if (!effect || effect.minLevel > myLevel) return;

                    setSelectedEffectName(effect.name);

                    if (getSelectedEffectIndex(effectName) >= 0) return;

                    setIsRendering(true);
                    setSelectedEffects((previous) => {
                        const effectsWithoutAnotherFrame =
                            effect.type === 'frame' ? previous.filter((selectedEffect) => selectedEffect.effect.type !== 'frame') : previous;

                        return [
                            ...effectsWithoutAnotherFrame,
                            new RoomCameraWidgetSelectedEffect(effect, effect.type === 'frame' ? 1 : DEFAULT_EFFECT_STRENGTH)
                        ];
                    });
                    return;
                }
                case 'remove_effect': {
                    const existingIndex = getSelectedEffectIndex(effectName);

                    if (existingIndex < 0) return;

                    setIsRendering(true);
                    setSelectedEffects((previous) => previous.filter((_, index) => index !== existingIndex));

                    if (selectedEffectName === effectName) setSelectedEffectName(null);
                    return;
                }
                case 'clear_effects':
                    if (!selectedEffects.length) return;

                    setIsRendering(true);
                    setSelectedEffects([]);
                    setSelectedEffectName(null);
                    return;
                case 'download': {
                    if (!currentPictureUrl) return;

                    const link = document.createElement('a');

                    link.href = currentPictureUrl;
                    link.download = getDownloadName();
                    link.rel = 'noopener';
                    link.click();
                    return;
                }
                case 'zoom':
                    setIsRendering(true);
                    setIsZoomed((previous) => !previous);
                    return;
            }
        },
        [
            availableEffects,
            currentPictureUrl,
            getSelectedEffectIndex,
            isRendering,
            myLevel,
            onCancel,
            onCheckout,
            onClose,
            selectedEffectName,
            selectedEffects.length
        ]
    );

    useEffect(() => {
        if (!stableTexture) return;

        let cancelled = false;

        const processThumbnails = async () => {
            for (const effect of availableEffects) {
                if (effect.minLevel > myLevel) continue;

                try {
                    const image = await GetRoomCameraWidgetManager().applyEffects(stableTexture, [new RoomCameraWidgetSelectedEffect(effect, 1)], false);

                    if (cancelled) return;

                    setEffectsThumbnails((previous) => [
                        ...previous.filter((thumbnail) => thumbnail.effectName !== effect.name),
                        new CameraPictureThumbnail(effect.name, image.src)
                    ]);
                } catch (error) {
                    OctaneLogger.error(`Failed to render camera effect thumbnail ${effect.name}`, error);
                }
            }
        };

        void processThumbnails();

        return () => {
            cancelled = true;
        };
    }, [stableTexture, availableEffects, myLevel]);

    useEffect(() => {
        if (!stableTexture) return;

        const requestId = ++requestIdRef.current;

        const debounceTimer = setTimeout(() => {
            if (!selectedEffects.length && !isZoomed) {
                if (requestId === requestIdRef.current) {
                    setCurrentPictureUrl(picture.imageUrl);
                    setIsRendering(false);
                }

                return;
            }

            GetRoomCameraWidgetManager()
                .applyEffects(stableTexture, selectedEffects, isZoomed)
                .then((imageElement) => {
                    if (requestId !== requestIdRef.current) return;

                    setCurrentPictureUrl(imageElement.src);
                    setIsRendering(false);
                })
                .catch((error) => {
                    if (requestId === requestIdRef.current) {
                        setCurrentPictureUrl('');
                        setIsRendering(false);
                    }

                    OctaneLogger.error('Failed to apply effects to picture', error);
                });
        }, EFFECT_RENDER_DEBOUNCE);

        return () => clearTimeout(debounceTimer);
    }, [stableTexture, selectedEffects, isZoomed, picture]);

    useEffect(() => {
        return () => {
            requestIdRef.current++;
        };
    }, []);

    return (
        <OctaneCardView className="octane-camera-editor" isResizable={false} style={{ resize: 'none' }}>
            <OctaneCardHeaderView headerText={LocalizeText('camera.editor.button.text')} onCloseClick={() => processAction('close')} />
            <OctaneCardContentView className="octane-camera-editor__content">
                <div className="octane-camera-editor__layout">
                    <div className="octane-camera-editor__effect-tabs" role="tablist">
                        {TABS.map((tab) => (
                            <button
                                type="button"
                                key={tab}
                                role="tab"
                                aria-selected={currentTab === tab}
                                className={`octane-camera-editor__effect-tab${currentTab === tab ? ' octane-camera-editor__effect-tab--active' : ''}`}
                                title={LocalizeText(`camera.effect.category.${tab}`)}
                                onClick={() => processAction('change_tab', tab)}
                            >
                                <i className={`octane-icon icon-camera-${tab}`} />
                            </button>
                        ))}
                    </div>

                    <div className="octane-camera-editor__effect-grid-frame has-classic-scrollbar">
                        <CameraWidgetEffectListView
                            myLevel={myLevel}
                            selectedEffectName={selectedEffectName}
                            selectedEffects={selectedEffects}
                            effects={visibleEffects}
                            thumbnails={effectsThumbnails}
                            processAction={processAction}
                        />
                    </div>

                    <div className="octane-camera-editor__preview" onClick={() => setSelectedEffectName(null)}>
                        {currentPictureUrl && <img alt="" src={currentPictureUrl} />}
                    </div>

                    {currentEffect && currentEffect.effect.type !== 'frame' && (
                        <div className="octane-camera-editor__slider-panel">
                            <div className="octane-camera-editor__slider-label">
                                {`${LocalizeText(`camera.effect.name.${currentEffect.effect.name}`)} ${Math.round(currentEffect.strength * 100)}%`}
                            </div>
                            <Slider
                                disabledButton
                                className="octane-camera-editor__slider"
                                min={0}
                                max={100}
                                step={1}
                                value={Math.round(currentEffect.strength * 100)}
                                onChange={(value) => setSelectedEffectAlpha(value / 100)}
                                renderThumb={({ key, ...thumbProps }) => (
                                    <div key={key} {...thumbProps} aria-label={LocalizeText(`camera.effect.name.${currentEffect.effect.name}`)} />
                                )}
                            />
                        </div>
                    )}

                    <button type="button" className="octane-camera-editor__tool octane-camera-editor__tool--save" onClick={() => processAction('download')}>
                        <FaDownload aria-hidden="true" />
                        <span>{LocalizeText('floor.plan.editor.save')}</span>
                    </button>
                    <button
                        type="button"
                        className="octane-camera-editor__tool octane-camera-editor__tool--zoom"
                        aria-pressed={isZoomed}
                        onClick={() => processAction('zoom')}
                    >
                        {isZoomed ? <FaSearchMinus aria-hidden="true" /> : <FaSearchPlus aria-hidden="true" />}
                        <span>{LocalizeText('room.zoom.button.text')}</span>
                    </button>
                    <button
                        type="button"
                        className="octane-camera-editor__tool octane-camera-editor__tool--clear"
                        disabled={!selectedEffects.length}
                        title={LocalizeText('camera.delete.button.text')}
                        aria-label={LocalizeText('camera.delete.button.text')}
                        onClick={() => processAction('clear_effects')}
                    >
                        <FaTrash aria-hidden="true" />
                    </button>

                    <div className="octane-camera-editor__button-separator" />
                    <Button className="octane-camera-editor__cancel" variant="secondary" onClick={() => processAction('cancel')}>
                        {LocalizeText('catalog.purchase_confirmation.cancel')}
                    </Button>
                    <Button
                        className="octane-camera-editor__purchase"
                        disabled={isRendering || !currentPictureUrl}
                        variant="success"
                        onClick={() => processAction('checkout')}
                    >
                        {LocalizeText('camera.preview.button.text')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
