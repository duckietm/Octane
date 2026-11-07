import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { GetConfigurationValue, IGameCenterGame, IGameCenterOffer, LocalizeText, gct, getSnowWarTokenPrice } from '../../../api';
import { SNOWWAR_AIR_ASSETS } from '../../../assets/images/snowstorm/air';
import { GameTokenButton } from './GameCenterArt';
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

/** A pack's price as the catalogue writes it (credits, or the activity points of its type). */
export const priceText = (offer: IGameCenterOffer): string => {
    const price = offer.currency < 0 ? getSnowWarTokenPrice(offer.price, 0, 0) : getSnowWarTokenPrice(0, offer.price, offer.currency);

    return LocalizeText(price.key, price.parameters, price.replacements);
};

/**
 * A game's card in the Game Center: its banner with the players right now, its name and what it is about, the games
 * left today (free ones, then bought ones; unlimited for the Habbo Club when the hotel says so), the packs of games to
 * buy, the leaderboard, and Play.
 */
export const GameCardView: FC<{
    entry: IGameCatalogEntry;
    status: IGameCenterGame | null;
    club: boolean;
    onOpen: () => void;
    onLeaderboard: () => void;
    onHowTo: () => void;
    onBuy: (offer: IGameCenterOffer) => void;
}> = ({ entry, status, club, onOpen, onLeaderboard, onHowTo, onBuy }) => {
    const { showConfirm = null } = useNotification();
    const gamesLeft = status?.gamesLeft ?? -1;
    const limited = gamesLeft >= 0;
    const canPlay = !limited || gamesLeft > 0;
    const offers = status?.offers ?? [];
    const hcExtra = status?.hcExtra ?? 0;

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
                    <BaseButton className="game-tile__link" type="button" onClick={onHowTo}>{gct('howto.link', 'How to play')}</BaseButton>
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
                        <div className="game-tile__tokens">
                            <span>{gct('buy_more', 'Buy more games:')}</span>
                            <div className="game-tile__token-buttons">
                                {offers.map((offer) => <GameTokenButton key={offer.id} game={entry.id} games={offer.games} title={priceText(offer)} onClick={() => buy(offer)} />)}
                            </div>
                        </div>
                    )}
                    {limited && !club && hcExtra > 0 && (
                        <BaseButton className="game-tile__vip" type="button" onClick={openClub}>
                            <img alt="" className="game-tile__hc-icon" src={SNOWWAR_AIR_ASSETS.hc_icon} />
                            <span>{hcExtra === 1 ? gct('hc_more_one', '+1 free game every day with HC!') : gct('hc_more', '+%n% free games every day with HC!', [ 'n' ], [ String(hcExtra) ])}</span>
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
