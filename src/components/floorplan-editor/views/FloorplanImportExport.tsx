import { Dispatch, FC, useState } from 'react';
import { LocalizeText } from '../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { serializeTilemap } from '../state/encoding';
import { FloorplanAction, FloorplanState } from '../state/types';

type Props = {
    state: FloorplanState;
    dispatch: Dispatch<FloorplanAction>;
    onClose: () => void;
    onSaveFromText: (raw: string) => void;
    onRevertText: () => string;
};

export const FloorplanImportExport: FC<Props> = ({ state, dispatch, onClose, onSaveFromText, onRevertText }) => {
    const [raw, setRaw] = useState(() => serializeTilemap(state.tiles));

    const load = () => {
        dispatch({ type: 'IMPORT_STRING', raw, source: 'local' });
        onClose();
    };

    const save = () => {
        onSaveFromText(raw);
        onClose();
    };

    const revert = () => {
        setRaw(onRevertText());
    };

    return (
        <OctaneCardView uniqueKey="floorplan-import-export" theme="primary-slim" className="w-[630px] h-[475px]">
            <OctaneCardHeaderView headerText={LocalizeText('floor.plan.editor.import.export')} onCloseClick={onClose} />
            <OctaneCardContentView className="flex flex-col gap-2">
                <textarea className="form-control w-full flex-1 font-mono" value={raw} onChange={(e) => setRaw(e.target.value)} />
                <div className="flex gap-2 justify-end">
                    <Button data-testid="import-revert" onClick={revert}>
                        Revert
                    </Button>
                    <Button data-testid="import-load" onClick={load}>
                        Load
                    </Button>
                    <Button data-testid="import-save" onClick={save}>
                        {LocalizeText('floor.plan.editor.save')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
