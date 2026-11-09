// AIR's loading screen (splash.PhotoSplashScreen): the frame's background and top, and the 30 user photos one of
// which shows between them. The imports are URLs, so the browser only fetches the photo that is shown.
import splashBg from './splash_bg.png';
import splashTop from './splash_top.png';

const rawUserPhotos = import.meta.glob('./userphoto_*.png', { eager: true, import: 'default' }) as Record<string, string>;

export const AIR_SPLASH_BG = splashBg;
export const AIR_SPLASH_TOP = splashTop;
export const AIR_USER_PHOTOS: readonly string[] = Object.keys(rawUserPhotos)
    .sort((a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10))
    .map((key) => rawUserPhotos[key]);
