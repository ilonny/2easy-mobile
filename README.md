# 2easy-mobile

React Native CLI mobile client for the 2easy project (TypeScript, React Navigation, no Expo).

## Requirements

- Node `>= 22.11.0`
- Xcode + CocoaPods (iOS)
- Android Studio / SDK (Android)

## Setup

```sh
npm install
cd ios && bundle install && bundle exec pod install && cd ..
```

## Run

```sh
npm start
npm run ios
# or
npm run android
```

## Structure (Feature-Sliced)

```text
src/
  app/          # providers + navigation
  pages/        # login, registration, restore-password, lesson-plans
  features/     # auth forms + API calls
  entities/     # session (Context API + AsyncStorage)
  shared/       # api, ui, theme, i18n, validation
android/ ios/
```

Auth uses `https://api.2easyeng.com/api`. Session keys in AsyncStorage: `token`, `profile`, `success_registration_completed`.

Password Autofill from `2easyeng.com` needs:
1. Deploy site files: `public/.well-known/apple-app-site-association` and `assetlinks.json`
2. iOS Associated Domains entitlement (`webcredentials:2easyeng.com`) — already in the app
3. Android: add release/debug SHA-256 fingerprints into `assetlinks.json`

```sh
keytool -list -v -keystore path/to.keystore -alias yourAlias | grep SHA256
```

Native app name is `TwoEasy` (RN CLI does not allow project names starting with a digit). Launcher display name is `2EASY`. Bundle ID / package: `com.twoeasy.mobile`.

Branding assets (icons / splash) are generated from the site logo under `branding/source/`.

Tablet layouts use `src/shared/lib/layout.ts` (`useLayout`).
