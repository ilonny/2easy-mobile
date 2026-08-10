import type {TextInputProps} from 'react-native';

/** Autofill props so OS can reuse credentials saved for 2easyeng.com */
export const autofill = {
  loginUsername: {
    autoComplete: 'username',
    textContentType: 'username',
    importantForAutofill: 'yes',
    keyboardType: 'email-address',
    autoCapitalize: 'none',
    autoCorrect: false,
    spellCheck: false,
  } satisfies TextInputProps,

  email: {
    autoComplete: 'email',
    textContentType: 'emailAddress',
    importantForAutofill: 'yes',
    keyboardType: 'email-address',
    autoCapitalize: 'none',
    autoCorrect: false,
    spellCheck: false,
  } satisfies TextInputProps,

  password: {
    autoComplete: 'password',
    textContentType: 'password',
    importantForAutofill: 'yes',
    autoCapitalize: 'none',
    autoCorrect: false,
    spellCheck: false,
  } satisfies TextInputProps,

  newPassword: {
    autoComplete: 'new-password',
    textContentType: 'newPassword',
    importantForAutofill: 'yes',
    autoCapitalize: 'none',
    autoCorrect: false,
    spellCheck: false,
  } satisfies TextInputProps,

  name: {
    autoComplete: 'name',
    textContentType: 'name',
    importantForAutofill: 'yes',
    autoCapitalize: 'words',
  } satisfies TextInputProps,

  phone: {
    autoComplete: 'tel',
    textContentType: 'telephoneNumber',
    importantForAutofill: 'yes',
    keyboardType: 'phone-pad',
  } satisfies TextInputProps,
} as const;
