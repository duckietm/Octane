import { HabboSearchComposer, HabboSearchResultData, HabboSearchResultEvent } from '@octane/renderer';
import { FC, FormEvent, useState } from 'react';
import { LocalizeText, OpenMessengerChat, SendMessageComposer } from '../../../../api';
import { LayoutAvatarImageView, UserProfileIconView } from '../../../../common';
import { useFriends, useMessageEvent } from '../../../../hooks';
import { resolveAvatarFigure } from './resolveAvatarFigure';
import { resolveAvatarGender } from './resolveAvatarGender';

export const FriendsSearchView: FC<{ className?: string }> = ({ className = '' }) => {
    const [searchValue, setSearchValue] = useState('');
    const [friendResults, setFriendResults] = useState<HabboSearchResultData[]>(null);
    const [otherResults, setOtherResults] = useState<HabboSearchResultData[]>(null);
    const { canRequestFriend = null, requestFriend = null } = useFriends();

    useMessageEvent<HabboSearchResultEvent>(HabboSearchResultEvent, (event) => {
        const parser = event.getParser();
        setFriendResults(parser.friends);
        setOtherResults(parser.others);
    });

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const value = searchValue.trim();

        if (!value.length) return;

        SendMessageComposer(new HabboSearchComposer(value));
    };

    const figure = (result: HabboSearchResultData) => {
        const typed = result as HabboSearchResultData & { figureString?: string; avatarFigure?: string; figure?: string; avatarFigureString?: string; gender?: string | number; avatarGender?: string | number };
        const gender = resolveAvatarGender(typed.avatarGender ?? typed.gender);
        return { gender, value: resolveAvatarFigure(typed.figureString || typed.avatarFigure || typed.figure || typed.avatarFigureString, gender) };
    };
    const renderResult = (result: HabboSearchResultData, other: boolean) => {
        const avatar = figure(result);
        return <div key={result.avatarId} className="hfl-search-result">
            <div className="hfl-search-avatar"><LayoutAvatarImageView figure={avatar.value} gender={avatar.gender} headOnly direction={2} /></div>
                <span className="hfl-search-profile"><UserProfileIconView userId={result.avatarId} /></span>
                <span className="hfl-search-name">{result.avatarName}</span>
            <div className="hfl-search-actions">
                {!other && result.isAvatarOnline && <button type="button" className="hfl-action chat" onClick={() => OpenMessengerChat(result.avatarId)} />}
                {other && canRequestFriend(result.avatarId) && <button type="button" className="hfl-action add" onClick={() => requestFriend(result.avatarId, result.avatarName)} />}
            </div>
        </div>;
    };

    return <div className={`hfl-search-results ${className}`}>
        <div className="hfl-search-results-scroll">
            {friendResults && <section className="hfl-search-section"><h4>{LocalizeText('friendlist.search.friendscaption', ['cnt'], [friendResults.length.toString()])}</h4>{friendResults.map((result) => renderResult(result, false))}</section>}
            {otherResults && <section className="hfl-search-section"><h4>{LocalizeText('friendlist.search.otherscaption', ['cnt'], [otherResults.length.toString()])}</h4>{otherResults.map((result) => renderResult(result, true))}</section>}
        </div>
        <form className="hfl-search-form" onSubmit={submitSearch}>
            <input maxLength={50} value={searchValue} onChange={(event) => setSearchValue(event.target.value)} />
            <button type="submit"><span />{LocalizeText('generic.search')}</button>
        </form>
    </div>;
};
