import { uz } from './dictionaries/uz';
import { ru } from './dictionaries/ru';
import { en } from './dictionaries/en';
import { ky } from './dictionaries/ky';
import { zh } from './dictionaries/zh';
import type { Locale } from '@/store/localeStore';

export type Dictionary = typeof uz;

export const DICTIONARIES: Record<Locale, Dictionary> = { uz, ru, en, ky, zh };
