import {getJson, postJson, postMultipart} from '../../../shared/api';
import type {SessionProfile} from '../../../entities/session';

type ProfileResponse = {
  success?: boolean;
  message?: string;
  profile?: SessionProfile;
  avatar?: string;
};

export async function fetchProfile() {
  return getJson<ProfileResponse>({
    path: '/profile',
    isSecure: true,
  });
}

export async function updateProfile(data: {name?: string; avatar?: string | null}) {
  return postJson<ProfileResponse>({
    path: '/profile',
    isSecure: true,
    data,
  });
}

export async function uploadProfileAvatar(uri: string, fileName?: string, type?: string) {
  const formData = new FormData();
  formData.append('image', {
    uri,
    name: fileName || `avatar-${Date.now()}.jpg`,
    type: type || 'image/jpeg',
  } as unknown as Blob);

  return postMultipart<ProfileResponse>({
    path: '/profile/avatar',
    isSecure: true,
    formData,
  });
}
