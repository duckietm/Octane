import { FC, ReactNode } from 'react';
import { localizeWithFallback } from '../../../api';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { Radio } from '../../../common/Radio';
import { Select } from '../../../common/Select';
import { HandheldModButton, HandheldModHeading, HandheldModPage } from './HandheldModPage';

const TemplateSelect: FC<{ caption: string; templates: string[]; selected?: number; onTemplate: (index: number) => void }> = ({
    caption,
    templates,
    selected = -1,
    onTemplate
}) => (
    <Select
        aria-label={caption}
        className="octane-handheld-modtools__select"
        value={String(selected)}
        onChange={(event) => {
            const index = Number(event.target.value);

            if (index >= 0) onTemplate(index);
        }}
    >
        <option value="-1">{caption}</option>
        {templates.map((template, index) => (
            <option key={index} value={String(index)}>
                {template}
            </option>
        ))}
    </Select>
);

interface HandheldModActionViewProps {
    title: string;
    topicLabel: string;
    topicCaption: string;
    topics: string[];
    topicIndex: number;
    onTopic: (index: number) => void;
    sanctionLabel: string;
    sanctionCaption: string;
    sanctions: string[];
    sanctionIndex: number;
    onSanction: (index: number) => void;
    infoText: string;
    message: string;
    onMessage: (value: string) => void;
    templates: string[];
    templateCaption: string;
    onTemplate: (index: number) => void;
    defaultLabel: string;
    /** The default sanction the server proposes for this user ("(not available)" until it does). */
    defaultText: string;
    defaultEnabled: boolean;
    onDefault: () => void;
    customLabel: string;
    onCustom: () => void;
    applied: { key: string; text: string }[];
    appliedTitle: string;
    onClose: () => void;
}

/**
 * The mod action window on a phone (ModActionView's twin): the CFH topic (choosing one picks its configured sanction, as on
 * the desktop), the sanctions as radio rows, the optional message (typed or from a template), and Default / Custom sanction
 * in the bar at the bottom. Ban, kick, mute and trade lock still ask first: ModActionView shows its confirmation.
 */
export const HandheldModActionView: FC<HandheldModActionViewProps> = (props) => {
    const { title, topicLabel, topicCaption, topics, topicIndex, onTopic, sanctionLabel, sanctionCaption, sanctions, sanctionIndex, onSanction } = props;
    const {
        infoText,
        message,
        onMessage,
        templates,
        templateCaption,
        onTemplate,
        defaultLabel,
        defaultText,
        defaultEnabled,
        onDefault,
        customLabel,
        onCustom
    } = props;
    const { applied, appliedTitle, onClose } = props;

    return (
        <NativeTextTree>
            <HandheldModPage
                className="is-sanction"
                footer={
                    <>
                        <HandheldModButton disabled={!defaultEnabled} label={defaultLabel} testId="mod-action-default" onClick={onDefault} />
                        <HandheldModButton label={customLabel} testId="mod-action-custom" tone="danger" onClick={onCustom} />
                    </>
                }
                title={title}
                onClose={onClose}
            >
                <HandheldModHeading text={topicLabel} />
                <Select
                    aria-label={topicLabel}
                    className="octane-handheld-modtools__select"
                    data-testid="mod-action-topic"
                    value={String(topicIndex)}
                    onChange={(event) => {
                        const index = Number(event.target.value);

                        if (index >= 0) onTopic(index);
                    }}
                >
                    <option value="-1">{topicCaption}</option>
                    {topics.map((topic, index) => (
                        <option key={index} value={String(index)}>
                            {topic}
                        </option>
                    ))}
                </Select>
                <p className="octane-handheld-modtools__proposed">{`${defaultLabel}: ${defaultText}`}</p>
                <HandheldModHeading
                    text={sanctionLabel}
                    extra={sanctionIndex < 0 ? <span className="octane-handheld-modtools__heading-hint">{sanctionCaption}</span> : null}
                />
                <div className="octane-handheld-modtools__card octane-handheld-modtools__radios" role="radiogroup" aria-label={sanctionLabel}>
                    {sanctions.map((sanction, index) => (
                        <label key={sanction} className="octane-handheld-modtools__radio-row">
                            <Radio checked={index === sanctionIndex} name="octane-handheld-mod-sanction" onCheckedChange={() => onSanction(index)} />
                            <span>{sanction}</span>
                        </label>
                    ))}
                </div>
                <HandheldModHeading text={infoText} />
                {templates.length > 0 && <TemplateSelect caption={templateCaption} templates={templates} onTemplate={onTemplate} />}
                <textarea
                    aria-label={infoText}
                    className="octane-handheld-modtools__field is-area"
                    data-testid="mod-action-text"
                    value={message}
                    onChange={(event) => onMessage(event.target.value)}
                />
                {applied.length > 0 && (
                    <div className="octane-handheld-modtools__card octane-handheld-modtools__applied">
                        <span className="octane-handheld-modtools__applied-title">{appliedTitle}</span>
                        {applied.map((entry) => (
                            <span key={entry.key}>{entry.text}</span>
                        ))}
                    </div>
                )}
            </HandheldModPage>
        </NativeTextTree>
    );
};

interface HandheldModSendMessageViewProps {
    title: string;
    message: string;
    placeholder: string;
    countText: string;
    templates: string[];
    selectedTemplate: number;
    templateCaption: string;
    sendLabel: string;
    onMessage: (value: string) => void;
    onFocus: () => void;
    onTemplate: (index: number) => void;
    onSend: () => void;
    onClose: () => void;
}

/** The message window on a phone (SendMessageView's twin): a template or a typed message, its length, and Send at the bottom. */
export const HandheldModSendMessageView: FC<HandheldModSendMessageViewProps> = (props) => {
    const { title, message, placeholder, countText, templates, selectedTemplate, templateCaption, sendLabel, onMessage, onFocus, onTemplate, onSend, onClose } =
        props;

    return (
        <NativeTextTree>
            <HandheldModPage
                className="is-message"
                footer={<HandheldModButton label={sendLabel} testId="mod-message-send" tone="primary" onClick={onSend} />}
                title={title}
                onClose={onClose}
            >
                {templates.length > 0 && <TemplateSelect caption={templateCaption} selected={selectedTemplate} templates={templates} onTemplate={onTemplate} />}
                <textarea
                    aria-label={placeholder}
                    className="octane-handheld-modtools__field is-area is-tall"
                    data-testid="mod-message-text"
                    placeholder={placeholder}
                    value={message}
                    onChange={(event) => onMessage(event.target.value)}
                    onFocus={onFocus}
                />
                {countText && <span className="octane-handheld-modtools__find-count">{countText}</span>}
            </HandheldModPage>
        </NativeTextTree>
    );
};

interface HandheldModCardProps {
    title: string;
    message: string;
    testId: string;
    children?: ReactNode;
}

const OverlayCard: FC<HandheldModCardProps> = ({ title, message, testId, children = null }) => (
    <NativeTextTree>
        <div className="octane-handheld-modtools__overlay" data-testid={testId}>
            <div aria-label={title} aria-modal="true" className="octane-handheld-modtools__dialog" role="alertdialog">
                <span className="octane-handheld-modtools__dialog-title">{title}</span>
                <p className="octane-handheld-modtools__dialog-text">{message}</p>
                <div className="octane-handheld-modtools__dialog-actions">{children}</div>
            </div>
        </div>
    </NativeTextTree>
);

/** ModConfirmView on a phone: who and what, with Cancel and Apply. */
export const HandheldModConfirmView: FC<{
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel }) => (
    <OverlayCard message={message} testId="mod-confirm" title={title}>
        <HandheldModButton label={cancelLabel} testId="mod-confirm-cancel" onClick={onCancel} />
        <HandheldModButton label={confirmLabel} testId="mod-confirm-apply" tone="danger" onClick={onConfirm} />
    </OverlayCard>
);

/** A moderator alert on a phone (NativeAlertView): its title, text and Ok. */
export const HandheldModAlertView: FC<{ title: string; message: string; onClose: () => void }> = ({ title, message, onClose }) => (
    <OverlayCard message={message} testId="mod-alert" title={title || localizeWithFallback('octane.handheld.mod_tools.title', 'Mod tools')}>
        <HandheldModButton label="Ok" testId="mod-alert-ok" tone="primary" onClick={onClose} />
    </OverlayCard>
);
