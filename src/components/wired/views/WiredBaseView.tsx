import { GetRoomEngine, GetSessionDataManager } from '@octane/renderer';
import { CSSProperties, FC, PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType, WiredSelectionVisualizer } from '../../../api';
import wiredBgLeft from '../../../assets/images/wired/wired_bg_left.png';
import wiredBgRight from '../../../assets/images/wired/wired_bg_right.png';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';
import { useWired, useWiredTools } from '../../../hooks';
import { WiredFurniSelectorView } from './WiredFurniSelectorView';

export interface WiredBaseViewProps {
    wiredType: string;
    requiresFurni: number;
    hasSpecialInput: boolean;
    save: () => void;
    validate?: () => boolean;
    cardStyle?: CSSProperties;
    footer?: ReactNode;
    footerCollapsible?: boolean;
    selectionPreview?: ReactNode;
}

export const WiredBaseView: FC<PropsWithChildren<WiredBaseViewProps>> = (props) => {
    const WIRED_CARD_WIDTH = 244;
    const {
        wiredType = '',
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        validate = null,
        children = null,
        hasSpecialInput = false,
        cardStyle = undefined,
        footer = null,
        footerCollapsible = true,
        selectionPreview = null
    } = props;
    const [wiredName, setWiredName] = useState<string>(null);
    const [needsSave, setNeedsSave] = useState<boolean>(false);
    const [showFooter, setShowFooter] = useState(false);
    const {
        trigger = null,
        setTrigger = null,
        setIntParams = null,
        setStringParam = null,
        setFurniIds = null,
        setAllowsFurni = null,
        saveWired = null
    } = useWired();
    const { roomSettings } = useWiredTools();

    const clearRoomAreaSelection = () => {
        GetRoomEngine().areaSelectionManager.clearHighlight();
        GetRoomEngine().areaSelectionManager.deactivate();
    };

    const onClose = () => {
        clearRoomAreaSelection();
        WiredSelectionVisualizer.clearAllSelectionShaders();
        setTrigger(null);
    };

    const onSave = () => {
        if (!roomSettings.canModify) return;

        if (validate && !validate()) return;

        if (save) save();

        setNeedsSave(true);
    };

    useEffect(() => {
        if (!needsSave) return;

        saveWired();

        setNeedsSave(false);
    }, [needsSave, saveWired]);

    useEffect(() => {
        if (!trigger) return;

        setShowFooter(false);

        WiredSelectionVisualizer.clearAllSelectionShaders();

        const spriteId = trigger.spriteId || -1;
        const furniData = GetSessionDataManager().getFloorItemData(spriteId);

        if (!furniData) {
            setWiredName('NAME: ' + spriteId);
        } else {
            setWiredName(furniData.name);
        }

        if (hasSpecialInput) {
            setIntParams(trigger.intData);
            setStringParam(trigger.stringData);
        }
    }, [trigger, hasSpecialInput, setIntParams, setStringParam]);

    useEffect(() => {
        if (!trigger) return;

        setFurniIds((prevValue) => {
            if (prevValue && prevValue.length) WiredSelectionVisualizer.clearSelectionShaderFromFurni(prevValue);

            if (requiresFurni <= WiredFurniType.STUFF_SELECTION_OPTION_NONE) return [];

            if (trigger.selectedItems && trigger.selectedItems.length) {
                WiredSelectionVisualizer.applySelectionShaderToFurni(trigger.selectedItems);

                return trigger.selectedItems;
            }

            return [];
        });
    }, [trigger, requiresFurni, setFurniIds]);

    useEffect(() => {
        return () => clearRoomAreaSelection();
    }, []);

    useEffect(() => {
        if (!trigger) return;

        setAllowsFurni(requiresFurni);
    }, [trigger, requiresFurni, setAllowsFurni]);

    const resolvedCardStyle: CSSProperties = { ...cardStyle };

    resolvedCardStyle.width = WIRED_CARD_WIDTH;
    resolvedCardStyle.minWidth = WIRED_CARD_WIDTH;
    resolvedCardStyle.maxWidth = WIRED_CARD_WIDTH;
    resolvedCardStyle.resize = 'none';

    return (
        <OctaneCardView
            className="octane-wired max-h-[calc(100vh-16px)]"
            theme="primary-slim"
            uniqueKey="octane-wired"
            isResizable={false}
            style={resolvedCardStyle}
        >
            <OctaneCardHeaderView classNames={['octane-wired__header']} headerText={LocalizeText('wiredfurni.title')} onCloseClick={onClose} />
            <OctaneCardContentView classNames={['octane-wired__content']} gap={0}>
                <div className="octane-wired__section octane-wired__summary">
                    <img className="octane-wired__summary-bg octane-wired__summary-bg--left" src={wiredBgLeft} alt="" />
                    <img className="octane-wired__summary-bg octane-wired__summary-bg--right" src={wiredBgRight} alt="" />
                    <div className="octane-wired__summary-copy">
                        <Text bold className="octane-wired__summary-title">
                            {wiredName}
                        </Text>
                    </div>
                </div>
                <div className="octane-wired__body">
                    {!!children && <div className="octane-wired__divider" />}
                    {!!children && <div className="octane-wired__section octane-wired__section--body">{children}</div>}
                    {requiresFurni > WiredFurniType.STUFF_SELECTION_OPTION_NONE && (
                        <>
                            <div className="octane-wired__divider" />
                            <div className="octane-wired__section octane-wired__section--selector">{selectionPreview || <WiredFurniSelectorView />}</div>
                        </>
                    )}
                    {footer && (
                        <>
                            <div className="octane-wired__divider" />
                            <div className="octane-wired__section octane-wired__section--footer">
                                {footerCollapsible ? (
                                    <>
                                        <button className="octane-wired__advanced-toggle" type="button" onClick={() => setShowFooter((value) => !value)}>
                                            {LocalizeText(showFooter ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                                        </button>
                                        {showFooter && <div className="octane-wired__advanced-body">{footer}</div>}
                                    </>
                                ) : (
                                    footer
                                )}
                            </div>
                        </>
                    )}
                    <div className="octane-wired__divider" />
                    <div className="flex items-center gap-1 octane-wired__actions">
                        <Button
                            disabled={!roomSettings.canModify}
                            fullWidth
                            variant="success"
                            classNames={['octane-wired__button', 'octane-wired__button--primary']}
                            onClick={onSave}
                        >
                            {LocalizeText('wiredfurni.ready')}
                        </Button>
                        <Button fullWidth variant="secondary" classNames={['octane-wired__button', 'octane-wired__button--secondary']} onClick={onClose}>
                            {LocalizeText('cancel')}
                        </Button>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
