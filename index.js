import 'react-native-gesture-handler';
/**
 * @format
 */

import './src/shared/config/fonts';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
