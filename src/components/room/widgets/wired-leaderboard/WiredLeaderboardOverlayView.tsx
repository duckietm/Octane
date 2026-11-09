import { FC } from 'react';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useRoom, useWiredLeaderboardEvents, useWiredLeaderboardStore } from '../../../../hooks';
import { WiredLeaderboardPanelView } from './WiredLeaderboardPanelView';

/**
 * The room's variable leaderboard panels (official wf_xtra_var_leaderboard). While a leaderboard
 * box is open in the editor its panel shows the draft and can be dragged; an unpublished box gets a
 * preview panel, and the other panels fade.
 */
export const WiredLeaderboardOverlayView: FC<{}> = () => {
    const { roomSession = null } = useRoom();
    const roomId = roomSession?.roomId ?? 0;

    useWiredLeaderboardEvents(roomId);

    const order = useWiredLeaderboardStore((state) => state.order);
    const panels = useWiredLeaderboardStore((state) => state.panels);
    const draft = useWiredLeaderboardStore((state) => state.editDraft);
    const editOverlayId = useWiredLeaderboardStore((state) => state.editOverlayId);
    const updateDraft = useWiredLeaderboardStore((state) => state.updateDraft);
    const selectVariable = useWiredLeaderboardStore((state) => state.selectVariable);
    const movePage = useWiredLeaderboardStore((state) => state.movePage);

    if (!roomId) return null;

    const editingPublished = !!draft && editOverlayId > 0 && order.includes(editOverlayId);
    const relocate = (location: { tileX: number, tileY: number, offsetX: number, altitude: number }) => updateDraft(location);

    return (
        <NativeTextTree>
            <div className="octane-wired-leaderboard-overlay" data-testid="leaderboard-overlay">
                {order.map((overlayId) => {
                    const panel = panels[overlayId];

                    if (!panel) return null;

                    const edited = editingPublished && overlayId === editOverlayId;
                    const descriptor = panel.descriptor;
                    const shown = edited ? draft : null;

                    return (
                        <WiredLeaderboardPanelView
                            key={overlayId}
                            roomId={roomId}
                            title={shown ? shown.title : descriptor.title}
                            description={shown ? shown.description : descriptor.description}
                            columns={shown ? shown.columns : descriptor.columns}
                            choices={descriptor.choices}
                            pageSizeOption={shown ? shown.pageSizeOption : descriptor.pageSizeOption}
                            location={shown ?? descriptor}
                            variableId={panel.variableId}
                            page={panel.page}
                            total={panel.total}
                            chunks={panel.chunks}
                            dimmed={!!draft && !edited}
                            onRelocate={edited ? relocate : null}
                            onSelectVariable={(variableId) => selectVariable(overlayId, variableId)}
                            onMovePage={(delta) => movePage(overlayId, delta)} />
                    );
                })}
                {draft && !editingPublished && (
                    <WiredLeaderboardPanelView
                        roomId={roomId}
                        title={draft.title}
                        description={draft.description}
                        columns={draft.columns}
                        choices={[]}
                        pageSizeOption={draft.pageSizeOption}
                        location={draft}
                        variableId={null}
                        page={0}
                        total={0}
                        chunks={{}}
                        onRelocate={relocate} />
                )}
            </div>
        </NativeTextTree>
    );
};
