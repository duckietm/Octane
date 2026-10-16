import { GetRoomEngine } from '@octane/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, Column, Flex, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useFurnitureAreaHideWidget } from '../../../../hooks';
import { Checkbox } from '../../../../common/Checkbox';

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
        saveChanges = null,
        onClose = null
    } = useFurnitureAreaHideWidget();

    if (objectId === -1) return null;

    return (
        <OctaneCardView
            theme="primary-slim"
            className="octane-room-widget-area-hide min-w-0 w-[min(400px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
        >
            <OctaneCardHeaderView headerText={LocalizeText('widget.areahide.title')} onCloseClick={onClose} />
            <OctaneCardContentView overflow="hidden" justifyContent="between">
                <Column gap={2}>
                    <Column gap={1}>
                        <Text bold>{LocalizeText('wiredfurni.params.area_selection')}</Text>
                        <Text bold>{LocalizeText('wiredfurni.params.area_selection.info')}</Text>
                    </Column>
                    <Flex gap={1}>
                        <Button fullWidth variant="primary" onClick={(event) => GetRoomEngine().areaSelectionManager.startSelecting()}>
                            {LocalizeText('wiredfurni.params.area_selection.select')}
                        </Button>
                        <Button fullWidth variant="primary" onClick={(event) => GetRoomEngine().areaSelectionManager.clearHighlight()}>
                            {LocalizeText('wiredfurni.params.area_selection.clear')}
                        </Button>
                    </Flex>
                </Column>
                <Column gap={1}>
                    <Text bold>{LocalizeText('widget.areahide.options')}</Text>
                    <Flex gap={1}>
                        <Checkbox id="setWallItems" checked={wallItems} onCheckedChange={(nextChecked) => setWallItems(nextChecked ? true : false)} />
                        <Text>{LocalizeText('widget.areahide.options.wallitems')}</Text>
                    </Flex>
                    <Flex gap={1}>
                        <Checkbox id="setInverted" checked={inverted} onCheckedChange={(nextChecked) => setInverted(nextChecked ? true : false)} />
                        <Column gap={1}>
                            <Text>{LocalizeText('widget.areahide.options.invert')}</Text>
                            <Text>{LocalizeText('widget.areahide.options.invert.info')}</Text>
                        </Column>
                    </Flex>
                    <Flex gap={1}>
                        <Checkbox id="setInvisibility" checked={invisibility} onCheckedChange={(nextChecked) => setInvisibility(nextChecked ? true : false)} />
                        <Column gap={1}>
                            <Text>{LocalizeText('widget.areahide.options.invisibility')}</Text>
                            <Text>{LocalizeText('widget.areahide.options.invisibility.info')}</Text>
                        </Column>
                    </Flex>
                </Column>
                <Button fullWidth variant="primary" onClick={saveChanges}>
                    {LocalizeText(isOn ? 'widget.dimmer.button.off' : 'widget.dimmer.button.on')}
                </Button>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
