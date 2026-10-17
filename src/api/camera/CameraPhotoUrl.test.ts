import { describe, expect, it } from 'vitest';
import { formatCameraPhotoDate, getCameraPhotoCreatorId, getCameraPhotoUrl } from './CameraPhotoUrl';

const BASES = ['https://hotel.example/usercontent/camera/', 'https://cdn.example/stories'];

describe('getCameraPhotoUrl', () => {
    it('accepts stored photos under a configured folder', () => {
        expect(getCameraPhotoUrl('https://hotel.example/usercontent/camera/12_1700000000.png', BASES)).toBe(
            'https://hotel.example/usercontent/camera/12_1700000000.png'
        );
        expect(getCameraPhotoUrl('https://cdn.example/stories/12_1700000000_small.png', BASES)).toBe('https://cdn.example/stories/12_1700000000_small.png');
    });

    it('resolves a bare file name against the first folder', () => {
        expect(getCameraPhotoUrl('12_1700000000', BASES)).toBe('https://hotel.example/usercontent/camera/12_1700000000.png');
    });

    it('rejects other hosts, folders, file names and schemes', () => {
        expect(getCameraPhotoUrl('https://evil.example/usercontent/camera/12_1700000000.png', BASES)).toBe('');
        expect(getCameraPhotoUrl('https://hotel.example/usercontent/camera/sub/12_1700000000.png', BASES)).toBe('');
        expect(getCameraPhotoUrl('https://hotel.example/usercontent/camera/photo.png', BASES)).toBe('');
        expect(getCameraPhotoUrl('https://hotel.example/usercontent/camera/12_1700000000.png?x=1', BASES)).toBe('');
        expect(getCameraPhotoUrl('https://hotel.example/usercontent/camera/../12_1700000000.png', BASES)).toBe('');
        expect(getCameraPhotoUrl('javascript:alert(1)', BASES)).toBe('');
        expect(getCameraPhotoUrl('../12_1700000000.png', BASES)).toBe('');
        expect(getCameraPhotoUrl('', BASES)).toBe('');
    });

    it('without configured folders only checks the scheme and file name', () => {
        expect(getCameraPhotoUrl('http://localhost/camera/3_17.png', ['', null])).toBe('http://localhost/camera/3_17.png');
        expect(getCameraPhotoUrl('http://localhost/camera/image.png', [])).toBe('');
        expect(getCameraPhotoUrl('3_17.png', [])).toBe('');
    });
});

describe('getCameraPhotoCreatorId', () => {
    it('reads the user id from the file name', () => {
        expect(getCameraPhotoCreatorId('https://hotel.example/camera/42_1700000000.png')).toBe(42);
        expect(getCameraPhotoCreatorId('https://hotel.example/camera/42_1700000000_small.png')).toBe(42);
        expect(getCameraPhotoCreatorId('https://hotel.example/camera/photo.png')).toBe(0);
        expect(getCameraPhotoCreatorId(undefined)).toBe(0);
    });
});

describe('formatCameraPhotoDate', () => {
    it('formats d-m-yyyy from seconds or milliseconds', () => {
        const date = new Date(2024, 0, 5, 12);
        const expected = '5-1-2024';

        expect(formatCameraPhotoDate(Math.floor(date.getTime() / 1000))).toBe(expected);
        expect(formatCameraPhotoDate(date.getTime())).toBe(expected);
        expect(formatCameraPhotoDate(0)).toBe('');
        expect(formatCameraPhotoDate(Number.NaN)).toBe('');
    });
});
