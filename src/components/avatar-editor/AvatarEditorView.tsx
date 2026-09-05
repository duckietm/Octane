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
import { AvatarEditorAction, LocalizeText, SendMessageComposer } from '../../api';
import mainGenericSrc from '../../assets/images/avatareditor/air/main-generic.png';
import mainHeadSrc from '../../assets/images/avatareditor/air/main-head.png';
import mainLegsSrc from '../../assets/images/avatareditor/air/main-legs.png';
import mainMiscSrc from '../../assets/images/avatareditor/air/main-misc.png';
import mainTorsoSrc from '../../assets/images/avatareditor/air/main-torso.png';
import wardrobeHangerSrc from '../../assets/images/avatareditor/wardrobe-hanger.png';
import mainNftSrc from '../../assets/images/wardrobe/nft.png';
import mainPetsSrc from '../../assets/images/wardrobe/pets.png';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../common';
import { useAvatarEditor } from '../../hooks';
import { AvatarEditorFigurePreviewView } from './AvatarEditorFigurePreviewView';
import { AvatarEditorModelView } from './AvatarEditorModelView';
import { AvatarEditorNftView } from './AvatarEditorNftView';
import { AvatarEditorPetView } from './AvatarEditorPetView';
import { AvatarEditorWardrobeView } from './AvatarEditorWardrobeView';

const MAIN_TAB_ICONS: Record<string, string> = {
    [AvatarEditorFigureCategory.GENERIC]: mainGenericSrc,
    [AvatarEditorFigureCategory.HEAD]: mainHeadSrc,
    [AvatarEditorFigureCategory.TORSO]: mainTorsoSrc,
    [AvatarEditorFigureCategory.LEGS]: mainLegsSrc,
    [AvatarEditorFigureCategory.PETS]: mainPetsSrc,
    [AvatarEditorFigureCategory.MISC]: mainMiscSrc,
    [AvatarEditorFigureCategory.NFT]: mainNftSrc
};

// AIR removes unavailable tabs from this sequence without reordering the
// survivors. Polaris-only categories are kept after the official tabs.
const MAIN_TAB_ORDER: string[] = [
    AvatarEditorFigureCategory.GENERIC,
    AvatarEditorFigureCategory.HEAD,
    AvatarEditorFigureCategory.TORSO,
    AvatarEditorFigureCategory.LEGS,
    AvatarEditorFigureCategory.MISC,
    AvatarEditorFigureCategory.NFT,
    AvatarEditorFigureCategory.PETS
];

export const AvatarEditorView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
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
        getFigureString = null
    } = useAvatarEditor();

    const isPetsOpen = activeModelKey === AvatarEditorFigureCategory.PETS;
    const isNftOpen = activeModelKey === AvatarEditorFigureCategory.NFT;
    const canUseWardrobe = !clothingChangeData && !isNftOpen;
    const orderedModelKeys = Object.keys(avatarModels)
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
                    SendMessageComposer(new UserFigureComposer(gender, getFigureString));
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
        }
    }, [isVisible, setEditorVisibility, setClothingChangeData]);

    useEffect(() => {
        if (!canUseWardrobe) setIsWardrobeOpen(false);
    }, [canUseWardrobe]);

    if (!isVisible) return null;

    return (
        <OctaneCardView
            className={`octane-avatar-editor${isWardrobeOpen ? ' is-wardrobe-open' : ''}`}
            frameStyle={3}
            isResizable={false}
            uniqueKey="avatar-editor"
        >
            <OctaneCardHeaderView
                headerText={LocalizeText(clothingChangeData ? 'widget.furni.clothingchange.editor.title' : 'avatareditor.title')}
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
                                    onClick={() => setActiveModelKey(modelKey)}
                                >
                                    <img className="octane-avatar-editor-main-tab-icon" src={MAIN_TAB_ICONS[modelKey]} alt="" draggable={false} />
                                </OctaneCardTabsItemView>
                            ))}
                        </OctaneCardTabsView>
                    </div>
                    {canUseWardrobe && (
                        <button
                            type="button"
                            className={`octane-avatar-editor-wardrobe-toggle${isWardrobeOpen ? ' is-open' : ''}`}
                            aria-pressed={isWardrobeOpen}
                            aria-label={LocalizeText('avatareditor.wardrobe.title')}
                            onClick={() => setIsWardrobeOpen((open) => !open)}
                        >
                            <img alt="" draggable={false} src={wardrobeHangerSrc} />
                        </button>
                    )}
                    <div className="octane-avatar-editor-main">
                        {activeModelKey.length > 0 && !isPetsOpen && !isNftOpen && (
                            <AvatarEditorModelView categories={avatarModels[activeModelKey]} name={activeModelKey} />
                        )}
                        {isPetsOpen && <AvatarEditorPetView categories={avatarModels[activeModelKey]} />}
                        {isNftOpen && <AvatarEditorNftView categories={avatarModels[activeModelKey]} />}
                        <AvatarEditorFigurePreviewView />
                        {!clothingChangeData && (
                            <div className="octane-avatar-editor-secondary-actions">
                                <button
                                    type="button"
                                    aria-label="Reset avatar"
                                    title="Reset avatar"
                                    onClick={() => processAction(AvatarEditorAction.ACTION_RESET)}
                                >
                                    <FaRedo className="fa-icon" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Clear avatar"
                                    title="Clear avatar"
                                    onClick={() => processAction(AvatarEditorAction.ACTION_CLEAR)}
                                >
                                    <FaTrash className="fa-icon" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Randomize avatar"
                                    title="Randomize avatar"
                                    onClick={() => processAction(AvatarEditorAction.ACTION_RANDOMIZE)}
                                >
                                    <FaDice className="fa-icon" />
                                </button>
                            </div>
                        )}
                        <button type="button" className="octane-avatar-editor-save" onClick={() => processAction(AvatarEditorAction.ACTION_SAVE)}>
                            {LocalizeText('avatareditor.save')}
                        </button>
                    </div>
                </div>
                {isWardrobeOpen && canUseWardrobe && <AvatarEditorWardrobeView />}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
