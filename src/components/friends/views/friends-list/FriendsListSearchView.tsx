import { HabboSearchComposer, HabboSearchResultData } from '@octane/renderer';
import { FC, FormEvent, useState } from 'react';
import { GetConfigurationValue, GetUserProfile, LocalizeText, OpenMessengerChat, SendMessageComposer } from '../../../../api';
import { LayoutAvatarImageView, UserProfileIconView } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { Hint } from '../../../../common/Tooltip';
import { useFriends, useNotification } from '../../../../hooks';
import { resolveAvatarFigure } from './resolveAvatarFigure';
import { resolveAvatarGender } from './resolveAvatarGender';

interface FriendsSearchViewProps {
    className?: string;
    friendResults: HabboSearchResultData[];
    otherResults: HabboSearchResultData[];
}

/** AIR SearchView: the results of the last search (kept by the friend list) and the search footer. */
export const FriendsSearchView: FC<FriendsSearchViewProps> = ({ className = '', friendResults = null, otherResults = null }) => {
    const [searchValue, setSearchValue] = useState('');
    const [askedIds, setAskedIds] = useState<number[]>([]);
    const { canRequestFriend = null, requestFriend = null, isFriendListFull = null, showFriendListFullAlert = null } = useFriends();
    const { simpleAlert = null } = useNotification();
    const messagesPersisted = GetConfigurationValue<boolean>('friend_list.persistent_message_status.enabled', true) !== false;

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const value = searchValue.trim();

        if (!value.length) return;

        SendMessageComposer(new HabboSearchComposer(value));
    };

    // AIR onAskForFriend: refused when the list is full, otherwise the "request sent" alert and the add icon goes.
    const askForFriend = (result: HabboSearchResultData) => {
        if (isFriendListFull?.() || requestFriend?.(result.avatarId, result.avatarName) === false) {
            showFriendListFullAlert?.();
            return;
        }

        setAskedIds((prev) => [...prev, result.avatarId]);
        simpleAlert?.(
            LocalizeText('friendlist.friendrequestsent.text', ['user_name'], [result.avatarName]),
            null,
            null,
            null,
            LocalizeText('friendlist.friendrequestsent.title')
        );
    };

    const figure = (result: HabboSearchResultData) => {
        const typed = result as HabboSearchResultData & {
            figureString?: string;
            avatarFigure?: string;
            figure?: string;
            avatarFigureString?: string;
            gender?: string | number;
            avatarGender?: string | number;
        };
        const gender = resolveAvatarGender(typed.avatarGender ?? typed.gender);

        return { gender, value: resolveAvatarFigure(typed.figureString || typed.avatarFigure || typed.figure || typed.avatarFigureString, gender) };
    };

    const renderResult = (result: HabboSearchResultData, other: boolean, row: number) => {
        const avatar = figure(result);
        const canChat = !other && (result.isAvatarOnline || messagesPersisted);
        const canAsk = other && askedIds.indexOf(result.avatarId) === -1 && canRequestFriend?.(result.avatarId);

        return (
            <div
                key={result.avatarId}
                className={`hfl-search-result${row % 2 === 1 ? ' hfl-row-odd' : ''}`}
                onClick={() => GetUserProfile(result.avatarId)}
            >
                <div className="hfl-search-avatar">
                    <LayoutAvatarImageView figure={avatar.value} gender={avatar.gender} headOnly direction={2} />
                </div>
                <span className="hfl-search-profile" onClick={(event) => event.stopPropagation()}>
                    <UserProfileIconView userId={result.avatarId} />
                </span>
                <span className="hfl-search-name">{result.avatarName}</span>
                <div className="hfl-search-actions" onClick={(event) => event.stopPropagation()}>
                    {canChat && (
                        <Hint content={LocalizeText('friendlist.tip.im')}>
                            <BaseButton aria-label={LocalizeText('friendlist.tip.im')} type="button" className="hfl-action chat" onClick={() => OpenMessengerChat(result.avatarId)} />
                        </Hint>
                    )}
                    {canAsk && (
                        <Hint content={LocalizeText('friendlist.tip.addfriend')}>
                            <BaseButton aria-label={LocalizeText('friendlist.tip.addfriend')} type="button" className="hfl-action add" onClick={() => askForFriend(result)} />
                        </Hint>
                    )}
                </div>
            </div>
        );
    };

    // AIR getFriendsCaption / getOthersCaption.
    const caption = (results: HabboSearchResultData[], key: string, emptyKey: string) =>
        results.length ? LocalizeText(key, ['cnt'], [results.length.toString()]) : LocalizeText(emptyKey);

    // AIR SearchView.refreshShading: one stripe over the friends caption, the friends, the others caption, the others.
    const othersCaptionRow = 1 + (friendResults?.length ?? 0);
    const rowClass = (row: number) => (row % 2 === 1 ? 'hfl-row-odd' : undefined);

    return (
        <NativeTextTree>
            <div className={`hfl-search-results ${className}`}>
                <div className="hfl-search-results-scroll">
                    {friendResults && (
                        <section className="hfl-search-section">
                            <h4 className={rowClass(0)}>{caption(friendResults, 'friendlist.search.friendscaption', 'friendlist.search.nofriendsfound')}</h4>
                            {friendResults.map((result, index) => renderResult(result, false, 1 + index))}
                        </section>
                    )}
                    {otherResults && (
                        <section className="hfl-search-section">
                            <h4 className={rowClass(othersCaptionRow)}>
                                {caption(otherResults, 'friendlist.search.otherscaption', 'friendlist.search.noothersfound')}
                            </h4>
                            {otherResults.map((result, index) => renderResult(result, true, othersCaptionRow + 1 + index))}
                        </section>
                    )}
                </div>
                <form className="hfl-search-form" onSubmit={submitSearch}>
                    <input maxLength={50} value={searchValue} onChange={(event) => setSearchValue(event.target.value)} />
                    <BaseButton type="submit">
                        <span />
                        {LocalizeText('generic.search')}
                    </BaseButton>
                </form>
            </div>
        </NativeTextTree>
    );
};
