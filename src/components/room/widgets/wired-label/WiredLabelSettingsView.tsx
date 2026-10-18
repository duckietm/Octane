import { IWiredLabel, WIRED_LABEL_COLORS, WIRED_LABEL_VISIBILITY_EVERYONE, WIRED_LABEL_VISIBILITY_WIRED_INSPECTORS, WiredLabelSaveSettingsComposer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { UbuntuDropmenuView } from '../../../../common/dropmenu/UbuntuDropmenuView';
import { wiredLabelCss } from './WiredLabelBubbleView';

const COLOR_NAMES = [ 'blue', 'teal', 'green', 'gold', 'orange', 'red', 'purple', 'charcoal' ];
const COLOR_FALLBACKS = [ 'Blue', 'Teal', 'Green', 'Gold', 'Orange', 'Red', 'Purple', 'Charcoal' ];

export interface WiredLabelSettingsViewProps {
    label: IWiredLabel;
    onClose: () => void;
}

/** The official label settings window: colour, who may see the label and whether it stays open. */
export const WiredLabelSettingsView: FC<WiredLabelSettingsViewProps> = ({ label, onClose }) => {
    const [ colorIndex, setColorIndex ] = useState(0);
    const [ visibility, setVisibility ] = useState(WIRED_LABEL_VISIBILITY_WIRED_INSPECTORS);
    const [ alwaysOpen, setAlwaysOpen ] = useState(false);

    useEffect(() => {
        const index = WIRED_LABEL_COLORS.indexOf(label.color);

        setColorIndex(index < 0 ? 0 : index);
        setVisibility(label.visibility === WIRED_LABEL_VISIBILITY_EVERYONE ? WIRED_LABEL_VISIBILITY_EVERYONE : WIRED_LABEL_VISIBILITY_WIRED_INSPECTORS);
        setAlwaysOpen(label.alwaysOpen);
    }, [ label.furnitureId ]);

    const everyone = visibility === WIRED_LABEL_VISIBILITY_EVERYONE;

    const save = () => {
        SendMessageComposer(new WiredLabelSaveSettingsComposer(label.furnitureId, WIRED_LABEL_COLORS[colorIndex] ?? WIRED_LABEL_COLORS[0], visibility, everyone && alwaysOpen));
        onClose();
    };

    return (
        <OctaneCardView className="octane-wired-label-settings" theme="primary-slim">
            <OctaneCardHeaderView headerText={localizeWithFallback('widget.furniture_label.settings.title', 'Label settings')} onCloseClick={onClose} />
            <OctaneCardContentView gap={2}>
                <Text bold>{localizeWithFallback('widget.furniture_label.settings.color', 'Label color')}</Text>
                <div className="flex items-center gap-2">
                    <UbuntuDropmenuView
                        className="octane-wired-label-settings__color"
                        label={localizeWithFallback('widget.furniture_label.settings.color', 'Label color')}
                        value={colorIndex}
                        options={COLOR_NAMES.map((name, index) => ({ value: index, label: localizeWithFallback(`widget.furniture_label.settings.color.${ name }`, COLOR_FALLBACKS[index]) }))}
                        onSelect={(value) => setColorIndex(Number(value))}
                    />
                    <div className="octane-wired-label-settings__preview" style={{ ['--octane-wired-label-color' as string]: wiredLabelCss(WIRED_LABEL_COLORS[colorIndex]) }} />
                </div>
                <Text bold>{localizeWithFallback('widget.furniture_label.settings.visibility', 'Who can see this label?')}</Text>
                <UbuntuDropmenuView
                    label={localizeWithFallback('widget.furniture_label.settings.visibility', 'Who can see this label?')}
                    value={visibility}
                    options={[
                        { value: WIRED_LABEL_VISIBILITY_EVERYONE, label: localizeWithFallback('widget.furniture_label.settings.visibility.everyone', 'Everyone') },
                        { value: WIRED_LABEL_VISIBILITY_WIRED_INSPECTORS, label: localizeWithFallback('widget.furniture_label.settings.visibility.wired', 'Users with Wired inspection rights') }
                    ]}
                    onSelect={(value) => setVisibility(Number(value) === WIRED_LABEL_VISIBILITY_EVERYONE ? WIRED_LABEL_VISIBILITY_EVERYONE : WIRED_LABEL_VISIBILITY_WIRED_INSPECTORS)}
                />
                <label className="flex items-center gap-1">
                    <input type="checkbox" className="octane-wired-label-settings__checkbox" data-testid="wired-label-always-open" disabled={!everyone} checked={everyone && alwaysOpen} onChange={(event) => setAlwaysOpen(event.target.checked)} />
                    <Text>{localizeWithFallback('widget.furniture_label.settings.always_open', 'Keep this label always open')}</Text>
                </label>
                <div className="flex justify-between gap-2">
                    <Button variant="secondary" className="octane-wired-label-settings__cancel" onClick={onClose}>{localizeWithFallback('generic.cancel', 'Cancel')}</Button>
                    <Button variant="success" className="octane-wired-label-settings__ready" onClick={save}>{localizeWithFallback('wiredfurni.ready', 'Ready')}</Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
