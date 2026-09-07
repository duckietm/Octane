import { FC } from 'react';
import { getSkillLevelStars } from '../../../../api';

/**
 * AIR GameEndingViewController.getSkillLevelImage: a 150x13 strip of ten
 * 15px stars, lit in bronze (levels 1-10), silver (11-20) or gold (21-30).
 * Team 1 (blue) fills from the left, team 2 (red) from the right. The
 * `title` carries the AIR score tooltip (`totalScore/scoreToNextLevel`).
 */
export const SnowWarSkillStars: FC<{ skillLevel: number; teamReference?: 1 | 2; title?: string }> = ({ skillLevel, teamReference = 1, title }) => {
    const stars = getSkillLevelStars(skillLevel);

    return (
        <div className={`snowwar-stars snowwar-stars--${stars.tier}${teamReference === 2 ? ' snowwar-stars--reverse' : ''}`} title={title}>
            {Array.from({ length: stars.total }, (_, index) => (
                <span key={index} className={`snowwar-stars__star${index < stars.filled ? ' snowwar-stars__star--filled' : ''}`} />
            ))}
        </div>
    );
};
