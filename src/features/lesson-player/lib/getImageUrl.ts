import {resolveMediaUri} from '../../../shared/lib/mediaUri';

export function getImageUrl(path?: string | null): string {
  return resolveMediaUri(path);
}

export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
