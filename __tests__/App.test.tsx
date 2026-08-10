/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../App';

jest.mock('@react-native-async-storage/async-storage', () => {
  const mockStore = new Map<string, string>();
  return {
    setItem: jest.fn(async (key: string, value: string) => {
      mockStore.set(key, value);
    }),
    getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    removeItem: jest.fn(async (key: string) => {
      mockStore.delete(key);
    }),
    clear: jest.fn(async () => {
      mockStore.clear();
    }),
  };
});

jest.mock('@react-navigation/native', () => {
  return {
    NavigationContainer: ({children}: {children: React.ReactNode}) => children,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

jest.mock('@react-navigation/native-stack', () => {
  const ReactLocal = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({children}: {children: React.ReactNode}) =>
        ReactLocal.createElement(ReactLocal.Fragment, null, children),
      Screen: () => null,
    }),
  };
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
    await Promise.resolve();
  });
});
