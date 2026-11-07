import { FC, ReactNode } from 'react';
import battleBallThumbs from '../../assets/images/battleball/bb-thumbs.png';
import fastFoodLobby from '../../assets/images/fastfood/ff-bg-lobby.jpg';
import fastFoodLogo from '../../assets/images/fastfood/ff-logo.png';
import hallBanner from '../../assets/images/hall/hall-banner.png';
import kartBanner from '../../assets/images/kart/kart-banner.png';
import lostMonkeyBanner from '../../assets/images/lostmonkey/lm-banner.png';
import diveBanner from '../../assets/images/plongeoir/pl-banner.png';
import quizBanner from '../../assets/images/quiz/quiz-banner.png';
import snailBanner from '../../assets/images/snails/snail-banner.png';
import tetrisBanner from '../../assets/images/tetris/tetris-banner.png';
import wobbleRooftop from '../../assets/images/wobble/wobble-rooftop.png';
import wobblePool from '../../assets/images/wobblenext/wobble-pool.png';
import { UnoCardView } from '../uno/UnoCardView';
import { WerewolfRoleIcon } from '../werewolf/WerewolfRoleIcon';

/** A game of Habbi's Game Center, other than SnowStorm (it has its own card). */
export interface IGameCatalogEntry {
    /** The game's id at the Game Center (`/api/gamecenter`), its theme (`data-game-theme`). */
    id: string;
    /** The link that opens it. */
    link: string;
    /** The ui-config option that hides it. */
    option: string;
    title: string;
    description: string;
    /** The players a game takes, as shown on its card. */
    players: string;
    banner: ReactNode;
}

const Banner: FC<{ image: string; position?: string; size?: string; colour?: string }> = ({ image, position = 'center', size = 'cover', colour = 'transparent' }) => (
    <div className="game-tile__banner" style={{ backgroundImage: `url(${ image })`, backgroundPosition: position, backgroundSize: size, backgroundColor: colour }} />
);

export const GAME_CATALOG: IGameCatalogEntry[] = [
    {
        id: 'uno',
        link: 'uno/show',
        option: 'uno.enabled',
        title: 'UNO',
        description: 'The card game everybody knows, at a table of the hotel. Match the colour or the number, pile up the +2 and +4, cut in, catch a forgotten UNO... and be the first with an empty hand!',
        players: '2-6',
        banner: (
            <div className="game-tile__banner game-banner--uno">
                <UnoCardView code="R7" zoom={2} />
                <UnoCardView code="WC" zoom={2} />
                <UnoCardView code="BD" zoom={2} />
            </div>
        )
    },
    {
        id: 'werewolf',
        link: 'werewolf/show',
        option: 'werewolf.enabled',
        title: 'Werewolf',
        description: 'Night falls on the village: werewolves hide among you. Seer, witch, hunter, Cupid and twenty other roles. Talk, accuse, vote... and survive until morning. Up to 49 villagers round the fire!',
        players: '5-49',
        banner: (
            <div className="game-tile__banner game-banner--werewolf">
                <WerewolfRoleIcon role="seer" zoom={3} />
                <WerewolfRoleIcon role="werewolf" zoom={4} />
                <WerewolfRoleIcon role="witch" zoom={3} />
            </div>
        )
    },
    {
        id: 'wobble',
        link: 'wobble/show',
        option: 'wobble.enabled',
        title: 'Wobble Squabble',
        description: 'The original of 2004 on the hotel\'s rooftop: two Habbos on the buoys over the pool. Lean, push, dodge and keep your balance to send the other into the water!',
        players: '2',
        banner: <Banner image={wobbleRooftop} position="40% 62%" size="190%" colour="rgb(156, 206, 255)" />
    },
    {
        id: 'wobblenext',
        link: 'wobblenext/show',
        option: 'wobble.enabled',
        title: 'Wobble Squabble Next Gen',
        description: 'The duel on the beam in a new pool, with the hotel\'s furni all round, a balance dial and big keys. The same fall into the water, a new look!',
        players: '2',
        banner: <Banner image={wobblePool} position="50% 62%" size="150%" colour="#7fd3f0" />
    },
    {
        id: 'battleball',
        link: 'battleball/show',
        option: 'battleball.enabled',
        title: 'BattleBall: Rebound!',
        description: 'Bounce on your ball and colour the arena in your team\'s colour. Close an area to fill it, steal the others\' tiles, light bulb, cannon, bomb... the five arenas and the power-ups of the original!',
        players: '2-12',
        banner: <Banner image={battleBallThumbs} position="0 0" size="1365px 175px" colour="#2a3550" />
    },
    {
        id: 'fastfood',
        link: 'fastfood/show',
        option: 'fastfood.enabled',
        title: 'Fast Food',
        description: 'The diners are starving! Drop the plates from the top of the restaurant and open the parachute at the very last moment. Missiles, shields and big parachutes to slow the others down.',
        players: '2-3',
        banner: <div className="game-tile__banner" style={{ backgroundImage: `url(${ fastFoodLogo }), url(${ fastFoodLobby })`, backgroundPosition: 'center 40%, center', backgroundSize: '78%, cover', backgroundRepeat: 'no-repeat', backgroundColor: '#0d344d' }} />
    },
    {
        id: 'hall',
        link: 'hall/show',
        option: 'hall.enabled',
        title: 'The game hall',
        description: 'The Cunning Fox Gamehall of 2004: tic-tac-toe (five in a row), four in a row, battleships, chess and poker with jokers. A table, a friend or a robot, and off you go!',
        players: '2-4',
        banner: <Banner image={hallBanner} colour="#003163" />
    },
    {
        id: 'snails',
        link: 'snailrace/show',
        option: 'snailrace.enabled',
        title: 'The snail race',
        description: 'Six snails, six lanes, one garden. They crawl on their own, nap, or get a burst of energy: cheer yours on at the right moment to see it cross the line first!',
        players: '2-6',
        banner: <Banner image={snailBanner} colour="#5ca834" />
    },
    {
        id: 'quiz',
        link: 'habbiquiz/show',
        option: 'habbiquiz.enabled',
        title: 'The Habbi quiz',
        description: 'Lights, camera, questions! Ten questions on the hotel and the world on the studio\'s big screen. The faster your right answer, the more points you get.',
        players: '2-8',
        banner: <Banner image={quizBanner} colour="#f5b400" />
    },
    {
        id: 'tetris',
        link: 'tetrisduel/show',
        option: 'tetrisduel.enabled',
        title: 'Blocks duel',
        description: 'Each at an arcade machine, everybody plays at the same time. Clear two rows or more at once to bury the others under rubbish: the last one standing wins!',
        players: '2-4',
        banner: <Banner image={tetrisBanner} colour="#003163" />
    },
    {
        id: 'diving',
        link: 'plongeoir/show',
        option: 'plongeoir.enabled',
        title: 'The diving board',
        description: 'Climb the Lido\'s tower, run along the board, jump and chain the figures in the air before the splash. The others hold up their mark: the best total wins!',
        players: '2-8',
        banner: <Banner image={diveBanner} colour="#99ccff" />
    },
    {
        id: 'kart',
        link: 'kart/show',
        option: 'kart.enabled',
        title: 'HabboKart',
        description: 'Three laps of a circuit made of the hotel\'s track, at the wheel of a hotel car: dragster, police car, ambulance or scooter. Stay on the road, the grass slows you down!',
        players: '2-8',
        banner: <Banner image={kartBanner} colour="#5ca834" />
    },
    {
        id: 'copywriter',
        link: 'lostmonkey/show',
        option: 'lostmonkey.enabled',
        title: 'Lost Monkey',
        description: 'Habbo\'s monkey is lost on a desert island! Look after him, walk round the island, feed him bananas and play the island\'s games with him.',
        players: '1-8',
        banner: <Banner image={lostMonkeyBanner} colour="#0b3d1e" />
    }
];
