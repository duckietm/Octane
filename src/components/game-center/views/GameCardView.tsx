import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { GetConfigurationValue, IGameCenterGame, IGameCenterOffer, LocalizeText, gct } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { useNotification } from '../../../hooks';
import { IGameCatalogEntry } from '../GameCatalog';

/** "N players right now" over a game's banner. */
export const PlayingNow: FC<{ count: number }> = ({ count }) => (
    <span className={`game-card__playing ${ count > 0 ? 'is-busy' : '' }`} data-browser-text>
        <span className="game-card__dot" />
        {count === 0
            ? gct('playing.none', 'Nobody playing right now')
            : count === 1 ? gct('playing.one', '1 player right now') : gct('playing.many', '%n% players right now', [ 'n' ], [ String(count) ])}
    </span>
);

const priceText = (offer: IGameCenterOffer): string => {
    if (offer.credits > 0 && offer.points > 0) return gct('price.both', '%c% credits + %p% duckets', [ 'c', 'p' ], [ String(offer.credits), String(offer.points) ]);
    if (offer.points > 0) return gct('price.points', '%p% duckets', [ 'p' ], [ String(offer.points) ]);

    return gct('price.credits', '%c% credits', [ 'c' ], [ String(offer.credits) ]);
};

/**
 * A game's card in the Game Center: its banner with the players right now, its name and what it is about, the games
 * left today (free ones, then bought ones; unlimited for the Habbo Club when the hotel says so), the packs of games to
 * buy, the leaderboard, and Play.
 */
export const GameCardView: FC<{
    entry: IGameCatalogEntry;
    status: IGameCenterGame | null;
    offers: IGameCenterOffer[];
    club: boolean;
    onOpen: () => void;
    onLeaderboard: () => void;
    onBuy: (offer: IGameCenterOffer) => void;
}> = ({ entry, status, offers, club, onOpen, onLeaderboard, onBuy }) => {
    const { showConfirm = null } = useNotification();
    const gamesLeft = status?.gamesLeft ?? -1;
    const limited = gamesLeft >= 0;
    const canPlay = !limited || gamesLeft > 0;

    const play = () => {
        onOpen();
        CreateLinkEvent(entry.link);
    };

    const buy = (offer: IGameCenterOffer) => {
        const title = gct(`${ entry.id }.title`, entry.title);
        const message = LocalizeText('catalog.purchase.confirmation.dialog.costs', [ 'offer_name', 'price' ], [ `${ offer.games }x ${ title }`, priceText(offer) ]);

        if (!showConfirm) return onBuy(offer);

        showConfirm(message, () => onBuy(offer), null, null, null, gct('buy.title', 'Buy games'));
    };

    const openClub = () => {
        const links = GetConfigurationValue<Record<string, string>>('catalog.links', {});

        CreateLinkEvent(`catalog/open/${ links?.['hc.buy_hc'] ?? 'habbo_club' }`);
    };

    return (
        <div className={`game-tile game-card game-tile--${ entry.id }`} data-game-theme={entry.id}>
            <div className="game-card__banner-box">
                {entry.banner}
                <PlayingNow count={status?.playing ?? 0} />
                <span className="game-card__players" data-browser-text>{gct('players_count', '%n% players', [ 'n' ], [ entry.players ])}</span>
            </div>
            <div className="game-tile__body game-card__body">
                <div className="game-tile__title">{gct(`${ entry.id }.title`, entry.title)}</div>
                <div className="game-card__desc" data-browser-text>{gct(`${ entry.id }.description`, entry.description)}</div>
                <div className="game-tile__links">
                    <BaseButton className="game-tile__link" type="button" onClick={onLeaderboard}>{gct('leaderboard.link', 'Leaderboard')}</BaseButton>
                </div>
                <div className="game-tile__footer game-card__footer">
                    {limited
                        ? (
                            <div className="game-tile__games-left">
                                <span>{gct('games_left', 'Games left today:')}</span>
                                <span className={`game-tile__games-left-count game-tile__games-left-count--${ gamesLeft === 0 ? 'red' : 'blue' }`}>{gamesLeft}</span>
                            </div>
                        )
                        : <div className="game-card__unlimited">{gct('unlimited', 'Unlimited games')}</div>}
                    {limited && offers.length > 0 && (
                        <div className="game-card__offers" data-browser-text>
                            {offers.map((offer) => (
                                <BaseButton key={offer.id} className="game-card__offer" type="button" title={priceText(offer)} onClick={() => buy(offer)}>
                                    <strong>+{offer.games}</strong>
                                    <span>{priceText(offer)}</span>
                                </BaseButton>
                            ))}
                        </div>
                    )}
                    {limited && !club && (
                        <BaseButton className="game-tile__vip game-card__vip" type="button" onClick={openClub}>
                            {gct('more_with_hc', 'More free games every day with the Habbo Club!')}
                        </BaseButton>
                    )}
                    <div className="game-tile__actions">
                        <BaseButton className={`snowwar-button game-tile__play ${ canPlay ? '' : 'game-tile__play--blocked' }`} disabled={!canPlay} type="button" onClick={play}>
                            {canPlay ? gct('play', 'Play!') : gct('no_games', 'No game left')}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </div>
    );
};
