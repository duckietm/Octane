import { CreateLinkEvent } from '@octane/renderer';
import { FC, useState } from 'react';
import { localizeWithFallback } from '../../api';
import { LayoutAvatarImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { Radio } from '../../common/Radio';
import { useFirstLoginSetup } from '../../hooks/session/useFirstLoginSetup';
import { useUserDataSnapshot } from '../../hooks/session/useSessionSnapshots';

/**
 * The welcome window of an account that was made outside Octane's register screen: the look and starter room that
 * screen asks for, offered once in the client. The look opens the avatar editor; the room is one of the hotel's
 * templates or none. "Done" answers the offer; closing the window keeps it for the next login.
 */
export const FirstLoginSetupView: FC<{}> = () => {
    const { isVisible = false, templates = [], dismiss = null, finish = null } = useFirstLoginSetup();
    const userData = useUserDataSnapshot();
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

    if (!isVisible) return null;

    return (
        <NativeTextTree>
            <OctaneCardView className="octane-first-login" isResizable={false} uniqueKey="first-login-setup">
                <OctaneCardHeaderView headerText={localizeWithFallback('first_login.title', 'Welcome!')} onCloseClick={dismiss} />
                <OctaneCardContentView className="octane-first-login__content" overflow="hidden">
                    <div className="octane-first-login__intro">
                        {localizeWithFallback('first_login.intro', 'Two quick things before you start: your look and your first room.')}
                    </div>
                    <div className="octane-first-login__section octane-first-login__look">
                        <div className="octane-first-login__avatar">
                            <LayoutAvatarImageView figure={userData.figure} direction={2} />
                        </div>
                        <div className="octane-first-login__look-body">
                            <div className="octane-first-login__heading">{localizeWithFallback('first_login.look.title', 'Your look')}</div>
                            <div className="octane-first-login__text">
                                {localizeWithFallback('first_login.look.desc', 'This is how others see you. You can change it at any time.')}
                            </div>
                            <BaseButton className="octane-first-login__button" onClick={() => CreateLinkEvent('avatar-editor/show')}>
                                {localizeWithFallback('first_login.look.change', 'Change my look')}
                            </BaseButton>
                        </div>
                    </div>
                    <div className="octane-first-login__section">
                        <div className="octane-first-login__heading">{localizeWithFallback('first_login.room.title', 'Your first room')}</div>
                        <div className="octane-first-login__rooms">
                            <label className={`octane-first-login__room${selectedTemplateId === null ? ' is-selected' : ''}`}>
                                <Radio name="first-login-room" checked={selectedTemplateId === null} onCheckedChange={() => setSelectedTemplateId(null)} />
                                <div className="octane-first-login__room-body">
                                    <div className="octane-first-login__room-title">
                                        {localizeWithFallback('first_login.room.skip.title', "No room: I'll create my own")}
                                    </div>
                                    <div className="octane-first-login__text">
                                        {localizeWithFallback('first_login.room.skip.desc', 'You can create rooms from the navigator whenever you like.')}
                                    </div>
                                </div>
                            </label>
                            {templates.map((template) => (
                                <label
                                    key={template.templateId}
                                    className={`octane-first-login__room${selectedTemplateId === template.templateId ? ' is-selected' : ''}`}
                                >
                                    <Radio
                                        name="first-login-room"
                                        checked={selectedTemplateId === template.templateId}
                                        onCheckedChange={() => setSelectedTemplateId(template.templateId)}
                                    />
                                    {template.thumbnail && (
                                        <img
                                            className="octane-first-login__thumb"
                                            src={template.thumbnail}
                                            alt=""
                                            onError={(event) => {
                                                event.currentTarget.style.visibility = 'hidden';
                                            }}
                                        />
                                    )}
                                    <div className="octane-first-login__room-body">
                                        <div className="octane-first-login__room-title">{template.title}</div>
                                        {template.description && <div className="octane-first-login__text">{template.description}</div>}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="octane-first-login__footer">
                        <BaseButton className="octane-first-login__button octane-first-login__done" onClick={() => finish(selectedTemplateId)}>
                            {localizeWithFallback('first_login.done', 'Done')}
                        </BaseButton>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
