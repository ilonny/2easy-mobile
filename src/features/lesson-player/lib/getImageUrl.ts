import {API_URL} from '../../../shared/config';

export function getImageUrl(path?: string | null): string {
  if (!path) {
    return '';
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (path.includes('608dfa18-3eae-4574-a997-0a7441c16d33.selstorage.ru')) {
    return path;
  }
  const base = API_URL.replace(/\/api$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
