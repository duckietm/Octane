import { RoomObjectCategory } from '@nitrots/nitro-renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { Column, DraggableWindow, Text } from '../../../../common';
import { useFurnitureHighScoreWidget } from '../../../../hooks';
import { ContextMenuHeaderView } from '../context-menu/ContextMenuHeaderView';
import { ContextMenuListView } from '../context-menu/ContextMenuListView';

export const FurnitureHighScoreView: FC<{}> = (props) => {
    const { stuffDatas = null, getScoreType = null, getClearType = null, isConfigured = null, isTimeScore = null, formatScore = null } = useFurnitureHighScoreWidget();

    if (!stuffDatas || !stuffDatas.size) return null;

    return (
        <>
            {Array.from(stuffDatas.entries()).map(([objectId, stuffData], index) => {
                const configured = isConfigured(stuffData.scoreType, stuffData.clearType);
                const timeScore = configured && isTimeScore(stuffData.scoreType);

                return (
                    <DraggableWindow key={index} uniqueKey={`high-score-${objectId}`}>
                        <Column className="nitro-widget-high-score nitro-context-menu bg-[#1e1f23] p-2 w-[280px] max-w-[280px] h-[320px]" gap={0}>
                            <ContextMenuHeaderView classNames={['drag-handler cursor-move']}>
                                {configured
                                    ? LocalizeText(
                                        'high.score.display.caption',
                                        ['scoretype', 'cleartype'],
                                        [
                                            LocalizeText(`high.score.display.scoretype.${getScoreType(stuffData.scoreType)}`),
                                            LocalizeText(`high.score.display.cleartype.${getClearType(stuffData.clearType)}`)
                                        ]
                                    )
                                    : LocalizeText('high.score.display.users.header')}
                            </ContextMenuHeaderView>
                            <ContextMenuListView className="!h-auto" gap={1} overflow="hidden">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <Text bold center className="col-span-8" variant="white">
                                            {LocalizeText('high.score.display.users.header')}
                                        </Text>
                                        <Text bold center className="col-span-4" variant="white">
                                            {LocalizeText(timeScore ? 'high.score.display.time.header' : 'high.score.display.score.header')}
                                        </Text>
                                    </div>
                                    <hr className="m-0" />
                                </div>
                                <Column className="overflow-y-scroll" gap={1} overflow="auto">
                                    {stuffData.entries.map((entry, index) => {
                                        return (
                                            <div key={index} className="flex items-center justify-between">
                                                <Text center className="col-span-8" variant="white">
                                                    {entry.users.join(', ')}
                                                </Text>
                                                <Text center className="col-span-4" variant="white">
                                                    {formatScore(entry.score, stuffData.scoreType)}
                                                </Text>
                                            </div>
                                        );
                                    })}
                                </Column>
                            </ContextMenuListView>
                        </Column>
                    </DraggableWindow>
                );
            })}
        </>
    );
};
