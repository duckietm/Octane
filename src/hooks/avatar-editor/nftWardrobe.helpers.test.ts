import { describe, expect, it } from 'vitest';
import {
    findNftOutfitByToken,
    formatNftOutfitLabel,
    getNftCollectionStyle,
    NFT_CONTRACT_AVATAR,
    NFT_CONTRACT_GENESIS,
    normalizeNftGender,
    resolveNftTabSwitch,
    toNftOutfits
} from './nftWardrobe.helpers';

const item = (id: string, figureString: string, gender = 'M', contractKey = NFT_CONTRACT_AVATAR) => ({ id, figureString, gender, tokenId: id, contractKey });

describe('avatar collectibles (AIR NftAvatarsModel)', () => {
    it('maps the wardrobe items and drops looks without a figure', () => {
        expect(toNftOutfits([item('41', 'hd-180-1'), item('42', '', 'F'), item('43', 'hd-600-1', 'f', NFT_CONTRACT_GENESIS)])).toEqual([
            { id: '41', figure: 'hd-180-1', gender: 'M', tokenId: '41', contractKey: NFT_CONTRACT_AVATAR },
            { id: '43', figure: 'hd-600-1', gender: 'F', tokenId: '43', contractKey: NFT_CONTRACT_GENESIS }
        ]);
    });

    it('reads genders the way loadAvatarInEditor does', () => {
        expect(normalizeNftGender('f')).toBe('F');
        expect(normalizeNftGender('F')).toBe('F');
        expect(normalizeNftGender('m')).toBe('M');
        expect(normalizeNftGender('x')).toBe('M');
        expect(normalizeNftGender(null)).toBe('M');
    });

    it('finds the worn look by its token', () => {
        const outfits = toNftOutfits([item('41', 'hd-180-1'), item('42', 'hd-185-1')]);

        expect(findNftOutfitByToken(outfits, '42')?.figure).toBe('hd-185-1');
        expect(findNftOutfitByToken(outfits, '99')).toBeNull();
        expect(findNftOutfitByToken(outfits, '')).toBeNull();
    });

    it('switches looks between tabs like AvatarEditorView.windowEventProc', () => {
        const base = { toNft: false, toEffects: false, toHotLooks: false, hasWorn: false, hasPending: false };

        expect(resolveNftTabSwitch({ ...base, toNft: true, hasWorn: true })).toBe('loadWorn');
        expect(resolveNftTabSwitch({ ...base, hasWorn: true })).toBe('loadFallback');
        expect(resolveNftTabSwitch({ ...base, toEffects: true, hasWorn: true })).toBe('loadWorn');
        expect(resolveNftTabSwitch({ ...base, toEffects: true, hasPending: true })).toBe('none');
        expect(resolveNftTabSwitch({ ...base, hasPending: true })).toBe('restorePrevious');
        expect(resolveNftTabSwitch({ ...base, toNft: true, hasPending: true })).toBe('none');
        expect(resolveNftTabSwitch({ ...base, toHotLooks: true, hasWorn: true, hasPending: true })).toBe('none');
        expect(resolveNftTabSwitch(base)).toBe('none');
    });

    it('labels a look with its collection and id (NftWardrobeParamView)', () => {
        const [outfit] = toNftOutfits([item('41', 'hd-180-1')]);

        expect(getNftCollectionStyle(NFT_CONTRACT_AVATAR)?.textColor).toBe('#ff8823');
        expect(getNftCollectionStyle('unknown')).toBeNull();
        expect(formatNftOutfitLabel('Habbo Avatar', outfit)).toBe('Habbo Avatar #41');
    });
});
