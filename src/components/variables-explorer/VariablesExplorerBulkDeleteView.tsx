import { FC, useState } from 'react';
import { expandLocalizedText, localizeWithFallback } from '../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

export interface VariablesExplorerBulkDeleteViewProps {
    variableName: string;
    busy: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/** Bulk delete wipes a variable from every holder, so the name has to be typed to go ahead. */
export const VariablesExplorerBulkDeleteView: FC<VariablesExplorerBulkDeleteViewProps> = ({ variableName, busy, onConfirm, onCancel }) => {
    const [typed, setTyped] = useState('');
    const matches = typed === variableName;
    const warning = expandLocalizedText(
        localizeWithFallback(
            'wiredfurni.params.web_api.permissions.bulk_delete.warning.desc',
            'Accidentally calling the "/variables/bulk-delete" endpoint irreversibly deletes all contents of variables.'
        ),
        (key) => localizeWithFallback(key, '') || null
    );

    return (
        <NativeTextTree>
            <OctaneCardView
                className="min-w-[360px] max-w-[360px] octane-variables-explorer-window"
                theme="primary-slim"
                uniqueKey="variables-explorer-bulk-delete"
                windowPosition={DraggableWindowPosition.CENTER}
                isResizable={false}
            >
                <OctaneCardHeaderView
                    headerText={localizeWithFallback('wiredmenu.variable_overview.delete_all.title', 'Clear this variable')}
                    onCloseClick={onCancel}
                />
                <OctaneCardContentView className="text-black bg-[#f4efe3] p-3 flex flex-col gap-3">
                    <div className="rounded border border-[#d9a3a3] bg-[#fbeaea] p-3 flex flex-col gap-2">
                        <Text bold>Delete {variableName} from every holder in this room?</Text>
                        <Text className="whitespace-pre-line">{warning}</Text>
                    </div>
                    <label className="flex flex-col gap-1">
                        <Text small>
                            Type <b>{variableName}</b> to confirm:
                        </Text>
                        <input
                            aria-label="Variable name"
                            autoComplete="off"
                            className="rounded border border-[#b8b2a4] bg-white px-2 py-[4px] text-[12px]"
                            spellCheck={false}
                            type="text"
                            value={typed}
                            onChange={(event) => setTyped(event.target.value)}
                        />
                    </label>
                    <div className="flex gap-2">
                        <Button fullWidth variant="secondary" onClick={onCancel}>
                            {localizeWithFallback('generic.cancel', 'Cancel')}
                        </Button>
                        <Button disabled={!matches || busy} fullWidth variant="danger" onClick={() => matches && onConfirm()}>
                            {localizeWithFallback('wiredmenu.variable_management.delete', 'Delete')}
                        </Button>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
