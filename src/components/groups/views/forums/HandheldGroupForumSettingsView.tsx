import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { Radio } from '../../../../common/Radio';

interface HandheldForumSettingsSection {
    label: string;
    options: { level: number; label: string }[];
}

interface HandheldGroupForumSettingsViewProps {
    /** Who may read, post messages, start threads and moderate: the four choices in that order. */
    sections: HandheldForumSettingsSection[];
    /** The level chosen per section. */
    levels: number[];
    /** The lowest level each section may take; a more open option cannot be picked. */
    minimums: number[];
    onPick: (sectionIndex: number, level: number) => void;
    onSave: () => void;
    onCancel: () => void;
}

/**
 * The forum settings on a phone: the four permission groups as cards of finger-high radio rows, and Cancel / OK.
 * GroupForumSettingsView keeps the levels, the rule that greys an option more open than the group above it, and the packet.
 */
export const HandheldGroupForumSettingsView: FC<HandheldGroupForumSettingsViewProps> = ({ sections, levels, minimums, onPick, onSave, onCancel }) => (
    <NativeTextTree>
        <div className="octane-handheld-forum__page" data-testid="forum-settings-page">
            <div className="octane-handheld-forum__scroll is-form">
                <div className="octane-handheld-forum__title">{LocalizeText('groupforum.settings.window_title')}</div>
                <div className="octane-handheld-forum__sections">
                    {sections.map((section, sectionIndex) => (
                        <div key={section.label} aria-label={section.label} className="octane-handheld-forum__section" role="group">
                            <div className="octane-handheld-forum__section-label">{section.label}</div>
                            {section.options.map((option) => {
                                const locked = option.level < minimums[sectionIndex];

                                return (
                                    <div key={option.level} className="octane-handheld-forum__option" data-locked={locked}>
                                        <Radio
                                            aria-label={`${section.label} ${option.label}`}
                                            checked={levels[sectionIndex] === option.level}
                                            className="octane-handheld-forum__radio"
                                            disabled={locked}
                                            name={`handheld-forum-permission-${sectionIndex}`}
                                            onCheckedChange={() => onPick(sectionIndex, option.level)}
                                        />
                                        <span className="octane-handheld-forum__option-label">{option.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
            <div className="octane-handheld-forum__bar">
                <BaseButton className="octane-handheld-forum__button" data-testid="forum-settings-cancel" onClick={onCancel}>
                    {LocalizeText('groupforum.settings.cancel')}
                </BaseButton>
                <BaseButton className="octane-handheld-forum__button is-primary" data-testid="forum-settings-save" onClick={onSave}>
                    {LocalizeText('groupforum.settings.ok')}
                </BaseButton>
            </div>
        </div>
    </NativeTextTree>
);
