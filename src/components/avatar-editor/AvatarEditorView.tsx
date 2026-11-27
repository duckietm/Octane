import {
    AddLinkEventTracker,
    AvatarEditorFigureCategory,
    AvatarFigurePartType,
    GetSessionDataManager,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    SetClothingChangeDataMessageComposer,
    UserFigureComposer
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaDice, FaRedo, FaTrash } from 'react-icons/fa';
import { AVATAR_EDITOR_EFFECTS_TAB, AvatarEditorAction, GetConfigurationValue, LocalizeText, SendMessageComposer, localizeWithFallback } from '../../api';
import mainEffectsSrc from '../../assets/images/avatareditor/air/main-effects.png';
import mainGenericSrc from '../../assets/images/avatareditor/air/main-generic.png';
import mainHeadSrc from '../../assets/images/avatareditor/air/main-head.png';
import mainHotLooksSrc from '../../assets/images/avatareditor/air/main-hotlooks.png';
import mainLegsSrc from '../../assets/images/avatareditor/air/main-legs.png';
import mainMiscSrc from '../../assets/images/avatareditor/air/main-misc.png';
import mainTorsoSrc from '../../assets/images/avatareditor/air/main-torso.png';
import wardrobeHangerSrc from '../../assets/images/avatareditor/wardrobe-hanger.png';
import mainNftSrc from '../../assets/images/wardrobe/nft.png';
import mainPetsSrc from '../../assets/images/wardrobe/pets.png';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../common';
import { useAvatarEditor, useAvatarEffects, useHotLooks, useNftWardrobe } from '../../hooks';
import { AvatarEditorEffectsView } from './AvatarEditorEffectsView';
import { AvatarEditorFigurePreviewView } from './AvatarEditorFigurePreviewView';
import { AvatarEditorHotLooksView } from './AvatarEditorHotLooksView';
import { AvatarEditorModelView } from './AvatarEditorModelView';
import { AvatarEditorNftOutfitInfoView, AvatarEditorNftOutfitsView } from './AvatarEditorNftOutfitsView';
import { AvatarEditorPetView } from './AvatarEditorPetView';
import { AvatarEditorWardrobeView } from './AvatarEditorWardrobeView';
import { BaseButton } from '../../common/BaseButton';
import { DraggableWindow } from '../../common/draggable-window/DraggableWindow';
import { HandheldSheetFrame } from '../../common/handheld/HandheldSheetFrame';
import { ToggleButton } from '../../common/ToggleButton';
import { Hint } from '../../common/Tooltip';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useIsHandheld } from '../../hooks/handheld/useHandheldLayout';

const MAIN_TAB_ICONS: Record<string, string> = {
    [AvatarEditorFigureCategory.GENERIC]: mainGenericSrc,
    [AvatarEditorFigureCategory.HEAD]: mainHeadSrc,
    [AvatarEditorFigureCategory.TORSO]: mainTorsoSrc,
    [AvatarEditorFigureCategory.LEGS]: mainLegsSrc,
    [AvatarEditorFigureCategory.PETS]: mainPetsSrc,
    [AvatarEditorFigureCategory.MISC]: mainMiscSrc,
    [AvatarEditorFigureCategory.HOTLOOKS]: mainHotLooksSrc,
    [AvatarEditorFigureCategory.NFT]: mainNftSrc,
    [AVATAR_EDITOR_EFFECTS_TAB]: mainEffectsSrc
};

// AIR removes unavailable tabs from this sequence without reordering the
// survivors. Polaris-only categories are kept after the official tabs.
const MAIN_TAB_ORDER: string[] = [
    AvatarEditorFigureCategory.GENERIC,
    AvatarEditorFigureCategory.HEAD,
    AvatarEditorFigureCategory.TORSO,
    AvatarEditorFigureCategory.LEGS,
    AvatarEditorFigureCategory.MISC,
    AvatarEditorFigureCategory.HOTLOOKS,
    AVATAR_EDITOR_EFFECTS_TAB,
    AvatarEditorFigureCategory.NFT,
    AvatarEditorFigureCategory.PETS
];

/** What each main tab is called on the phone, where it is a picture (text key and English fallback). */
const MAIN_TAB_NAMES: Record<string, [key: string, fallback: string]> = {
    [AvatarEditorFigureCategory.GENERIC]: ['octane.handheld.looks.tab.body', 'Body'],
    [AvatarEditorFigureCategory.HEAD]: ['octane.handheld.looks.tab.head', 'Head'],
    [AvatarEditorFigureCategory.TORSO]: ['octane.handheld.looks.tab.top', 'Tops'],
    [AvatarEditorFigureCategory.LEGS]: ['octane.handheld.looks.tab.bottom', 'Bottoms'],
    [AvatarEditorFigureCategory.MISC]: ['octane.handheld.looks.tab.extras', 'Extras'],
    [AvatarEditorFigureCategory.HOTLOOKS]: ['octane.handheld.looks.tab.popular', 'Popular looks'],
    [AVATAR_EDITOR_EFFECTS_TAB]: ['octane.handheld.looks.tab.effects', 'Effects'],
    [AvatarEditorFigureCategory.NFT]: ['octane.handheld.looks.tab.collectibles', 'Collectibles'],
    [AvatarEditorFigureCategory.PETS]: ['octane.handheld.looks.tab.companions', 'Companions']
};

export const AvatarEditorView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
    // Phone layout: the editor is a sheet in the phone's own look (HandheldSheetFrame) instead of the AIR window; the
    // wardrobe takes the place of the part grid there, so it starts closed and is opened from the header.
    const isHandheld = useIsHandheld();
    const [isHandheldWardrobeOpen, setIsHandheldWardrobeOpen] = useState(false);
    // Effect picked in the effects tab; null until the user picks one.
    const [effectSelection, setEffectSelection] = useState<number>(null);
    const { activeEffectType = 0, activateEffect = null } = useAvatarEffects();
    const {
        setIsVisible: setEditorVisibility,
        clothingChangeData = null,
        setClothingChangeData = null,
        avatarModels,
        activeModelKey,
        setActiveModelKey,
        loadAvatarData,
        getFigureStringWithFace,
        gender,
        randomizeCurrentFigure = null,
        getFigureString = null,
        getValidFigureString = null
    } = useAvatarEditor();

    const isPetsOpen = activeModelKey === AvatarEditorFigureCategory.PETS;
    const isNftOpen = activeModelKey === AvatarEditorFigureCategory.NFT;
    // Official effects.in.avatar.editor; not for a clothing change booth.
    const effectsEnabled = !clothingChangeData && GetConfigurationValue<boolean>('effects.in.avatar.editor', true);
    const isEffectsOpen = effectsEnabled && activeModelKey === AVATAR_EDITOR_EFFECTS_TAB;
    // AIR HotLooksModel: not part of a clothing change booth's restricted categories.
    const hotLooksEnabled = !clothingChangeData;
    const isHotLooksOpen = hotLooksEnabled && activeModelKey === AvatarEditorFigureCategory.HOTLOOKS;
    const hotLooks = useHotLooks(isVisible && hotLooksEnabled);
    const canUseWardrobe = !clothingChangeData && !isNftOpen;
    // AIR avatar collectibles (NftAvatarsModel): the NFT tab always lists the user's collectible looks; it stays
    // empty when the hotel doesn't run collectibles.
    const nftWardrobe = useNftWardrobe(isVisible && !clothingChangeData, activeModelKey);
    const selectMainTab = (modelKey: string) => {
        nftWardrobe.onTabChange(modelKey);
        setActiveModelKey(modelKey);
    };
    const orderedModelKeys = [
        ...Object.keys(avatarModels),
        ...(hotLooksEnabled ? [AvatarEditorFigureCategory.HOTLOOKS] : []),
        ...(effectsEnabled ? [AVATAR_EDITOR_EFFECTS_TAB] : [])
    ]
        .filter((modelKey) => modelKey !== AvatarEditorFigureCategory.WARDROBE)
        .sort((left, right) => {
            const leftIndex = MAIN_TAB_ORDER.indexOf(left);
            const rightIndex = MAIN_TAB_ORDER.indexOf(right);

            if (leftIndex === -1) return rightIndex === -1 ? left.localeCompare(right) : 1;
            if (rightIndex === -1) return -1;

            return leftIndex - rightIndex;
        });

    const processAction = (action: string) => {
        switch (action) {
            case AvatarEditorAction.ACTION_RESET:
                loadAvatarData(GetSessionDataManager().figure, GetSessionDataManager().gender);
                return;
            case AvatarEditorAction.ACTION_CLEAR:
                loadAvatarData(getFigureStringWithFace(0, false), gender);
                return;
            case AvatarEditorAction.ACTION_RANDOMIZE:
                randomizeCurrentFigure();
                return;
            case AvatarEditorAction.ACTION_SAVE:
                if (clothingChangeData) {
                    SendMessageComposer(new SetClothingChangeDataMessageComposer(clothingChangeData.objectId, gender, getFigureString));
                } else {
                    // A collectible look picked in the NFT tab is worn instead (AIR saveCurrentSelection).
                    if (!nftWardrobe.save()) SendMessageComposer(new UserFigureComposer(gender, getValidFigureString));

                    if (effectSelection !== null) activateEffect(effectSelection);
                }
                setIsVisible(false);
                return;
        }
    };

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        if (parts[2] && parts[3] && (parts[2] === AvatarFigurePartType.MALE || parts[2] === AvatarFigurePartType.FEMALE)) {
                            setClothingChangeData({ objectId: Number(parts[3]), gender: parts[2] });
                            setIsWardrobeOpen(false);
                        } else {
                            setClothingChangeData(null);
                            setIsWardrobeOpen(true);
                        }
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setClothingChangeData(null);
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setClothingChangeData(null);
                        setIsVisible((prevValue) => {
                            if (!prevValue) setIsWardrobeOpen(true);

                            return !prevValue;
                        });
                        return;
                }
            },
            eventUrlPrefix: 'avatar-editor/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [setClothingChangeData]);

    useEffect(() => {
        setEditorVisibility(isVisible);

        if (!isVisible) {
            setClothingChangeData(null);
            setIsWardrobeOpen(false);
            setIsHandheldWardrobeOpen(false);
            setEffectSelection(null);
        }
    }, [isVisible, setEditorVisibility, setClothingChangeData]);

    useEffect(() => {
        if (!canUseWardrobe) {
            setIsWardrobeOpen(false);
            setIsHandheldWardrobeOpen(false);
        }
    }, [canUseWardrobe]);

    if (!isVisible) return null;

    const title = LocalizeText(clothingChangeData ? 'widget.furni.clothingchange.editor.title' : 'avatareditor.title');
    const categoryContent = (
        <>
            {activeModelKey.length > 0 && !isPetsOpen && !isNftOpen && !isEffectsOpen && !isHotLooksOpen && avatarModels[activeModelKey] && (
                <AvatarEditorModelView categories={avatarModels[activeModelKey]} name={activeModelKey} />
            )}
            {isPetsOpen && <AvatarEditorPetView categories={avatarModels[activeModelKey]} />}
            {isNftOpen && (
                <AvatarEditorNftOutfitsView
                    outfits={nftWardrobe.outfits}
                    selectedOutfit={nftWardrobe.selectedOutfit}
                    wornOutfit={nftWardrobe.wornOutfit}
                    onSelect={nftWardrobe.selectOutfit}
                />
            )}
            {isHotLooksOpen && (
                <AvatarEditorHotLooksView
                    hotLooks={hotLooks[gender === AvatarFigurePartType.FEMALE ? 'F' : 'M']}
                    onSelect={(look) => loadAvatarData(look.figure, look.gender)}
                />
            )}
            {isEffectsOpen && <AvatarEditorEffectsView selectedType={effectSelection ?? (activeEffectType > 0 ? activeEffectType : -1)} onSelect={setEffectSelection} />}
        </>
    );
    const secondaryActions: [action: string, label: string, icon: typeof FaRedo][] = [
        [AvatarEditorAction.ACTION_RESET, localizeWithFallback('octane.avatar_editor.reset_avatar', 'Reset avatar'), FaRedo],
        [AvatarEditorAction.ACTION_CLEAR, localizeWithFallback('octane.avatar_editor.clear_avatar', 'Clear avatar'), FaTrash],
        [AvatarEditorAction.ACTION_RANDOMIZE, localizeWithFallback('octane.avatar_editor.randomize_avatar', 'Randomize avatar'), FaDice]
    ];

    if (isHandheld) {
        const showWardrobe = isHandheldWardrobeOpen && canUseWardrobe;
        const wardrobeLabel = LocalizeText('avatareditor.wardrobe.title');

        return (
            <NativeTextTree>
                <DraggableWindow handheldSheet uniqueKey="avatar-editor">
                    <HandheldSheetFrame
                        activeTab={showWardrobe ? null : activeModelKey}
                        className={`octane-handheld-looks${showWardrobe ? ' is-wardrobe-open' : ''}`}
                        headerExtra={
                            canUseWardrobe && (
                                <ToggleButton
                                    aria-label={wardrobeLabel}
                                    className={`octane-handheld-looks__wardrobe-toggle${showWardrobe ? ' is-open' : ''}`}
                                    pressed={showWardrobe}
                                    onClick={() => setIsHandheldWardrobeOpen((open) => !open)}
                                >
                                    <img alt="" draggable={false} src={wardrobeHangerSrc} />
                                </ToggleButton>
                            )
                        }
                        icon="icon-me-clothing"
                        tabs={orderedModelKeys.map((modelKey) => ({
                            id: modelKey,
                            image: MAIN_TAB_ICONS[modelKey],
                            label: MAIN_TAB_NAMES[modelKey] ? localizeWithFallback(...MAIN_TAB_NAMES[modelKey]) : modelKey
                        }))}
                        tabsLabel={localizeWithFallback('octane.handheld.looks.tabs', 'Clothing categories')}
                        title={title}
                        onClose={() => setIsVisible(false)}
                        onTab={(modelKey) => {
                            setIsHandheldWardrobeOpen(false);
                            selectMainTab(modelKey);
                        }}
                    >
                        <div className="octane-handheld-looks__layout">
                            <section className="octane-handheld-looks__stage" aria-label={GetSessionDataManager().userName}>
                                <span className="octane-handheld-looks__name">{GetSessionDataManager().userName}</span>
                                <AvatarEditorFigurePreviewView effectType={effectSelection ?? 0} />
                                {isNftOpen && <AvatarEditorNftOutfitInfoView outfit={nftWardrobe.selectedOutfit} />}
                                {!clothingChangeData && !isNftOpen && (
                                    <div className="octane-handheld-looks__tools">
                                        {secondaryActions.map(([action, label, Icon]) => (
                                            <BaseButton key={action} aria-label={label} className="octane-handheld-looks__tool" onClick={() => processAction(action)}>
                                                <Icon aria-hidden="true" />
                                            </BaseButton>
                                        ))}
                                    </div>
                                )}
                            </section>
                            <div className="octane-handheld-looks__editor">{showWardrobe ? <AvatarEditorWardrobeView /> : categoryContent}</div>
                            <BaseButton className="octane-handheld-looks__save" onClick={() => processAction(AvatarEditorAction.ACTION_SAVE)}>
                                {LocalizeText('avatareditor.save')}
                            </BaseButton>
                        </div>
                    </HandheldSheetFrame>
                </DraggableWindow>
            </NativeTextTree>
        );
    }

    return (
        <NativeTextTree>
            <OctaneCardView
                className={`octane-avatar-editor${isWardrobeOpen ? ' is-wardrobe-open' : ''}`}
                frameStyle={3}
                isResizable={false}
                uniqueKey="avatar-editor"
            >
                <OctaneCardHeaderView
                    headerText={title}
                    onCloseClick={(event) => setIsVisible(false)}
                />
                <OctaneCardContentView className="octane-avatar-editor-content">
                    <div className="octane-avatar-editor-stage">
                        <div className="octane-avatar-editor-nameplate">
                            <span>{GetSessionDataManager().userName}</span>
                        </div>
                        <div className="octane-avatar-editor-tab-row">
                            <OctaneCardTabsView classNames={['avatar-editor-tabs']}>
                                {orderedModelKeys.map((modelKey) => (
                                    <OctaneCardTabsItemView
                                        key={modelKey}
                                        classNames={['octane-avatar-editor-main-tab', `is-${modelKey}`]}
                                        isActive={activeModelKey === modelKey}
                                        onClick={() => selectMainTab(modelKey)}
                                    >
                                        <img className="octane-avatar-editor-main-tab-icon" src={MAIN_TAB_ICONS[modelKey]} alt="" draggable={false} />
                                    </OctaneCardTabsItemView>
                                ))}
                            </OctaneCardTabsView>
                        </div>
                        {canUseWardrobe && (
                            <ToggleButton
                                type="button"
                                className={`octane-avatar-editor-wardrobe-toggle${isWardrobeOpen ? ' is-open' : ''}`} pressed={isWardrobeOpen}
                                aria-label={LocalizeText('avatareditor.wardrobe.title')}
                                onClick={() => setIsWardrobeOpen((open) => !open)}
                            >
                                <img alt="" draggable={false} src={wardrobeHangerSrc} />
                            </ToggleButton>
                        )}
                        <div className="octane-avatar-editor-main">
                            {categoryContent}
                            <AvatarEditorFigurePreviewView effectType={effectSelection ?? 0} />
                            {isNftOpen && <AvatarEditorNftOutfitInfoView outfit={nftWardrobe.selectedOutfit} />}
                            {!clothingChangeData && !isNftOpen && (
                                <div className="octane-avatar-editor-secondary-actions">
                                    <Hint content={localizeWithFallback('octane.avatar_editor.reset_avatar', 'Reset avatar')}>
                                        <BaseButton
                                            type="button"
                                            aria-label={localizeWithFallback('octane.avatar_editor.reset_avatar', 'Reset avatar')}
                                            onClick={() => processAction(AvatarEditorAction.ACTION_RESET)}
                                        >
                                            <FaRedo className="fa-icon" />
                                        </BaseButton>
                                    </Hint>
                                    <Hint content={localizeWithFallback('octane.avatar_editor.clear_avatar', 'Clear avatar')}>
                                        <BaseButton
                                            type="button"
                                            aria-label={localizeWithFallback('octane.avatar_editor.clear_avatar', 'Clear avatar')}
                                            onClick={() => processAction(AvatarEditorAction.ACTION_CLEAR)}
                                        >
                                            <FaTrash className="fa-icon" />
                                        </BaseButton>
                                    </Hint>
                                    <Hint content={localizeWithFallback('octane.avatar_editor.randomize_avatar', 'Randomize avatar')}>
                                        <BaseButton
                                            type="button"
                                            aria-label={localizeWithFallback('octane.avatar_editor.randomize_avatar', 'Randomize avatar')}
                                            onClick={() => processAction(AvatarEditorAction.ACTION_RANDOMIZE)}
                                        >
                                            <FaDice className="fa-icon" />
                                        </BaseButton>
                                    </Hint>
                                </div>
                            )}
                            <BaseButton type="button" className="octane-avatar-editor-save" onClick={() => processAction(AvatarEditorAction.ACTION_SAVE)}>
                                {LocalizeText('avatareditor.save')}
                            </BaseButton>
                        </div>
                    </div>
                    {isWardrobeOpen && canUseWardrobe && <AvatarEditorWardrobeView />}
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
