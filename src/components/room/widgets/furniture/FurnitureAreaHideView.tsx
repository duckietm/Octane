import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, Column, Flex, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { Checkbox } from '../../../../common/Checkbox';
import { getAreaHideControlState, useFurnitureAreaHideWidget } from '../../../../hooks';
import '../../../../css/room/FurniWindowsCAir.css';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export const FurnitureAreaHideView: FC<{}> = (props) => {
    const {
        objectId = -1,
        isOn,
        wallItems,
        setWallItems,
        inverted,
        setInverted,
        invisibility,
        setInvisibility,
        selecting,
        selectionActive,
        startSelecting,
        clearSelection,
        toggleOnOff,
        onClose = null
    } = useFurnitureAreaHideWidget();

    if (objectId === -1) return null;

    const { optionsDisabled, selectDisabled, clearDisabled } = getAreaHideControlState(isOn, selecting, selectionActive);
    const lockedClass = optionsDisabled ? 'opacity-50' : '';

    return (
        <NativeTextTree>
            <OctaneCardView
                theme="primary-slim"
                className="octane-room-widget-area-hide min-w-0 w-[min(400px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            >
                <OctaneCardHeaderView headerText={LocalizeText('widget.areahide.title')} onCloseClick={onClose} />
                <OctaneCardContentView overflow="hidden" justifyContent="between">
                    <Column gap={2} classNames={[lockedClass]}>
                        <Column gap={1}>
                            <Text bold>{LocalizeText('wiredfurni.params.area_selection')}</Text>
                            <Text>{LocalizeText('wiredfurni.params.area_selection.info')}</Text>
                        </Column>
                        <Flex gap={1}>
                            <Button fullWidth variant="primary" disabled={selectDisabled} onClick={startSelecting}>
                                {LocalizeText('wiredfurni.params.area_selection.select')}
                            </Button>
                            <Button fullWidth variant="primary" disabled={clearDisabled} onClick={clearSelection}>
                                {LocalizeText('wiredfurni.params.area_selection.clear')}
                            </Button>
                        </Flex>
                    </Column>
                    <Column gap={1} classNames={[lockedClass]}>
                        <Text bold>{LocalizeText('widget.areahide.options')}</Text>
                        <Flex gap={1}>
                            <Checkbox
                                id="setInvisibility"
                                checked={invisibility}
                                disabled={optionsDisabled}
                                onCheckedChange={(nextChecked) => setInvisibility(!!nextChecked)}
                            />
                            <Column gap={1}>
                                <Text>{LocalizeText('widget.areahide.options.invisibility')}</Text>
                                <Text className="octane-area-hide__info">{LocalizeText('widget.areahide.options.invisibility.info')}</Text>
                            </Column>
                        </Flex>
                        <Flex gap={1}>
                            <Checkbox
                                id="setWallItems"
                                checked={wallItems}
                                disabled={optionsDisabled}
                                onCheckedChange={(nextChecked) => setWallItems(!!nextChecked)}
                            />
                            <Text>{LocalizeText('widget.areahide.options.wallitems')}</Text>
                        </Flex>
                        <Flex gap={1}>
                            <Checkbox
                                id="setInverted"
                                checked={inverted}
                                disabled={optionsDisabled}
                                onCheckedChange={(nextChecked) => setInverted(!!nextChecked)}
                            />
                            <Column gap={1}>
                                <Text>{LocalizeText('widget.areahide.options.invert')}</Text>
                                <Text className="octane-area-hide__info">{LocalizeText('widget.areahide.options.invert.info')}</Text>
                            </Column>
                        </Flex>
                    </Column>
                    <Button fullWidth variant="primary" onClick={toggleOnOff}>
                        {LocalizeText(isOn ? 'widget.dimmer.button.off' : 'widget.dimmer.button.on')}
                    </Button>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
