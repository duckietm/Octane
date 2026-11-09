import { FC } from 'react';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useRoom, useWiredLabelEvents, useWiredLabelStore, useWiredTools } from '../../../../hooks';
import { WiredLabelBubbleView } from './WiredLabelBubbleView';
import { WiredLabelSettingsView } from './WiredLabelSettingsView';

/**
 * The room's furniture labels (official wf_label): a bubble per label that is open, kept open or
 * under the mouse, and the settings window opened from the furni's infostand.
 */
export const WiredLabelOverlayView: FC<{}> = () => {
    useWiredLabelEvents();

    const { roomSession = null } = useRoom();
    const { roomSettings = null } = useWiredTools();
    const labels = useWiredLabelStore((state) => state.labels);
    const openIds = useWiredLabelStore((state) => state.openIds);
    const hoveredId = useWiredLabelStore((state) => state.hoveredId);
    const settingsId = useWiredLabelStore((state) => state.settingsId);
    const close = useWiredLabelStore((state) => state.close);
    const closeSettings = useWiredLabelStore((state) => state.closeSettings);

    if (!roomSession) return null;

    const canModify = !!roomSettings?.canModify;
    const settingsLabel = settingsId ? labels[settingsId] : null;

    return (
        <NativeTextTree>
            <>
                <div className="octane-wired-label-overlay" data-testid="wired-label-overlay">
                    {Object.values(labels).map((label) => (
                        <WiredLabelBubbleView
                            key={label.furnitureId}
                            roomId={roomSession.roomId}
                            label={label}
                            open={openIds.includes(label.furnitureId)}
                            hovered={hoveredId === label.furnitureId}
                            canModify={canModify}
                            onClose={() => close(label.furnitureId)} />
                    ))}
                </div>
                {settingsLabel && canModify && <WiredLabelSettingsView label={settingsLabel} onClose={closeSettings} />}
            </>
        </NativeTextTree>
    );
};
