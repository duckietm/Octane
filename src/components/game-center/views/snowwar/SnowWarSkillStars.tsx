import { FC } from 'react';
import { getSkillLevelStars } from '../../../../api';
import { SNOWWAR_AIR_ASSETS } from '../../../../assets/images/snowstorm/air';

/**
 * AIR GameEndingViewController / GameLoadingViewController.getSkillLevelImage:
 * a 150x13 strip of ten 15px stars (`star_empty`, `star_filled_bronze` for
 * levels 1-10, `_silver` 11-20, `_gold` 21-30). Team 1 (blue) fills from the
 * left, team 2 (red) from the right. The `title` carries the AIR score
 * tooltip (`totalScore/scoreToNextLevel`).
 */
export const SnowWarSkillStars: FC<{ skillLevel: number; teamReference?: 1 | 2; title?: string }> = ({ skillLevel, teamReference = 1, title }) =>
{
    const stars = getSkillLevelStars(skillLevel);
    const filledAsset = SNOWWAR_AIR_ASSETS[`star_filled_${ stars.tier }`];

    return (
        <div className={ `snowwar-stars snowwar-stars--${ stars.tier }${ (teamReference === 2) ? ' snowwar-stars--reverse' : '' }` } title={ title }>
            { Array.from({ length: stars.total }, (_, index) =>
            {
                const filled = (index < stars.filled) && !!filledAsset;

                return (
                    <img
                        key={ index }
                        alt=""
                        className={ `snowwar-stars__star${ filled ? ' snowwar-stars__star--filled' : '' }` }
                        draggable={ false }
                        src={ filled ? filledAsset : SNOWWAR_AIR_ASSETS.star_empty } />
                );
            }) }
        </div>
    );
};
