import {getJson, postJson} from '../../../shared/api';
import type {CatalogItem, CatalogItemType} from '../model/catalogTypes';

type CatalogResponse = {
  success?: boolean;
  message?: string;
  folder_id?: number | null;
  items?: CatalogItem[];
};

type FolderMutationResponse = {
  success?: boolean;
  message?: string;
  folder?: CatalogItem;
  counts?: {lessons?: number; courses?: number};
  empty?: boolean;
  status?: number;
};

export async function fetchCatalog(folderId?: number | null) {
  const params = new URLSearchParams();
  if (folderId != null) {
    params.set('folder_id', String(folderId));
  }
  const qs = params.toString();
  return getJson<CatalogResponse>({
    path: qs ? `/v2/catalog?${qs}` : '/v2/catalog',
    isSecure: true,
  });
}

export async function reorderCatalog(
  folderId: number | null,
  ordered: {type: CatalogItemType; id: number}[],
) {
  return postJson({
    path: '/v2/catalog/reorder',
    isSecure: true,
    data: {folder_id: folderId, items: ordered},
  });
}

export async function moveCatalogItem(
  type: 'lesson' | 'course',
  id: number,
  folderId: number | null,
) {
  return postJson({
    path: '/v2/catalog/move',
    isSecure: true,
    data: {type, id, folder_id: folderId},
  });
}

export async function createFolder(payload: {
  title: string;
  description?: string;
  tags?: string;
  image_id?: string | number;
}) {
  return postJson<FolderMutationResponse>({
    path: '/v2/folders',
    isSecure: true,
    data: payload,
  });
}

export async function editFolder(payload: {
  id: number;
  title?: string;
  description?: string;
  tags?: string;
  image_id?: string | number;
}) {
  return postJson<FolderMutationResponse>({
    path: '/v2/folders/edit',
    isSecure: true,
    data: payload,
  });
}

export async function checkFolderContents(id: number) {
  return postJson<FolderMutationResponse>({
    path: '/v2/folders/delete',
    isSecure: true,
    data: {id, check: true},
  });
}

export async function deleteFolder(id: number, force = false) {
  return postJson<FolderMutationResponse>({
    path: '/v2/folders/delete',
    isSecure: true,
    data: {id, force},
  });
}
