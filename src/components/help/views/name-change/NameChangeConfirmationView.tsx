import { ChangeUserNameMessageComposer, GetSessionDataManager, UserNameChangeMessageEvent } from '@octane/renderer';
import { FC, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../api';
import { useMessageEvent } from '../../../../hooks';
import { NameChangeLayoutViewProps } from './NameChangeView.types';
import { BaseButton } from '../../../../common/BaseButton';

export const NameChangeConfirmationView: FC<NameChangeLayoutViewProps> = (props) => {
    const { username = '', onAction = null } = props;
    const [isConfirming, setIsConfirming] = useState<boolean>(false);

    const confirm = () => {
        if (isConfirming) return;

        setIsConfirming(true);
        SendMessageComposer(new ChangeUserNameMessageComposer(username));
    };

    useMessageEvent<UserNameChangeMessageEvent>(UserNameChangeMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        if (parser.webId !== GetSessionDataManager().userId) return;

        onAction('close');
    });

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="octane-card-panel p-2 text-center">{LocalizeText('tutorial.name_change.info.confirm')}</div>
            <div className="flex flex-col items-center gap-1 h-full">
                <div>{LocalizeText('tutorial.name_change.confirm')}</div>
                <div className="font-bold	">{username}</div>
            </div>
            <div className="flex gap-2">
                <BaseButton className="btn btn-success w-full" disabled={isConfirming} onClick={confirm}>
                    {LocalizeText('generic.ok')}
                </BaseButton>
                <BaseButton className="btn btn-danger w-full" onClick={() => onAction('close')}>
                    {LocalizeText('cancel')}
                </BaseButton>
            </div>
        </div>
    );
};
