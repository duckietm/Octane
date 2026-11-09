export const IsTouchDevice = (): boolean => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse), (hover: none)').matches;
