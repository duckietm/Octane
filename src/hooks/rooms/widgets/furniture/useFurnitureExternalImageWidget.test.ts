import { describe, expect, it } from 'vitest';
import { getPhotoCreator, parsePhotoData } from './useFurnitureExternalImageWidget';

describe('parsePhotoData', () => {
    it('reads a photo item', () => {
        expect(parsePhotoData('{"w":"https://cdn/1_2.png","s":7,"u":3}')).toEqual({ w: 'https://cdn/1_2.png', s: 7, u: 3 });
    });

    it('skips broken items instead of throwing', () => {
        expect(parsePhotoData('{broken')).toBeNull();
        expect(parsePhotoData('')).toBeNull();
        expect(parsePhotoData('42')).toBeNull();
        expect(parsePhotoData('null')).toBeNull();
    });
});

describe('getPhotoCreator', () => {
    it('uses the official creator fields when the photo names its creator', () => {
        expect(getPhotoCreator({ n: 'Alice', s: 7, w: 'https://cdn/9_1.png' })).toEqual({ id: 7, name: 'Alice' });
    });

    it('takes the creator id from our file name, not the room id in s', () => {
        expect(getPhotoCreator({ s: 300, w: 'https://cdn/camera/12_1700000000.png' }, 12, 'Bob')).toEqual({ id: 12, name: 'Bob' });
        expect(getPhotoCreator({ s: 300, w: 'https://cdn/camera/12_1700000000.png' }, 13, 'Carol')).toEqual({ id: 12, name: '' });
    });

    it('falls back to the owner fields', () => {
        expect(getPhotoCreator({ o: 'Dave', oi: 5, w: 'https://cdn/photo.png' })).toEqual({ id: 5, name: 'Dave' });
        expect(getPhotoCreator(null)).toEqual({ id: 0, name: '' });
    });
});
