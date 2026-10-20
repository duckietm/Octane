import { describe, expect, it } from 'vitest';
import { getTreasureHuntFailText, getTreasureHuntName, getTreasureHuntUpdateText, getTreasureHuntWinnerText, TreasureHuntLocalizer } from './TreasureHuntNotifications';

const fill = (text: string, parameters: string[] = [], replacements: string[] = []) =>
    parameters.reduce((value, parameter, index) => value.split(`%${parameter}%`).join(replacements[index]), text);

/** The Dutch external texts the official client ships. */
const TEXTS: Record<string, string> = {
    'treasure_hunt.wf15.name': '15 jaar Wired',
    'treasure_hunt.progress.desc': 'Goed zo! Je hebt %current%/%total% stappen van de %hunt_name% voltooid!',
    'treasure_hunt.won.desc': 'Gefeliciteerd, je hebt de %hunt_name% voltooid!',
    'treasure_hunt.level_fail.desc': 'Je moet minimaal bij level %level% zijn om deze speurtocht te voltooien of level %level_paying% voor betalende habbo´s',
    'treasure_hunt.winner.desc': '%user_name% is de eerste Habbo die de %hunt_name% heeft gewonnen!'
};

const dutch: TreasureHuntLocalizer = (key, parameters, replacements) => (key in TEXTS ? fill(TEXTS[key], parameters, replacements) : key);
const missing: TreasureHuntLocalizer = (key) => key;

describe('treasure hunt notification texts', () => {
    it('names the hunt from treasure_hunt.<code>.name, falling back to the code', () => {
        expect(getTreasureHuntName('wf15', dutch)).toBe('15 jaar Wired');
        expect(getTreasureHuntName('easter', dutch)).toBe('easter');
    });

    it('shows the progress while the hunt runs and the won text once it is completed', () => {
        expect(getTreasureHuntUpdateText('wf15', 2, 5, false, dutch)).toBe('Goed zo! Je hebt 2/5 stappen van de 15 jaar Wired voltooid!');
        expect(getTreasureHuntUpdateText('wf15', 5, 5, true, dutch)).toBe('Gefeliciteerd, je hebt de 15 jaar Wired voltooid!');
    });

    it('lists both level thresholds when the find is refused', () => {
        expect(getTreasureHuntFailText(10, 5, dutch)).toBe('Je moet minimaal bij level 10 zijn om deze speurtocht te voltooien of level 5 voor betalende habbo´s');
    });

    it('names the first winner', () => {
        expect(getTreasureHuntWinnerText('Frank', 'wf15', dutch)).toBe('Frank is de eerste Habbo die de 15 jaar Wired heeft gewonnen!');
    });

    it('falls back to English when the external texts lack the keys', () => {
        expect(getTreasureHuntUpdateText('egg', 1, 3, false, missing)).toBe('Well done! You have completed 1/3 steps of the egg!');
        expect(getTreasureHuntWinnerText('Frank', 'egg', missing)).toBe('Frank is the first Habbo to win the egg!');
    });
});
