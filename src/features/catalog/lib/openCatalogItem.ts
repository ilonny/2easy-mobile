import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {RootStackParamList} from '../../../shared/navigation/types';
import type {ContentSlug} from '../model/contentRegistry';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Opens in-app content player, or Subscription when access is missing. */
export function openGatedCatalogItem(opts: {
  navigation: Nav;
  isAuthorized: boolean;
  hasSubscription: boolean;
  slug: ContentSlug;
}) {
  const {navigation, isAuthorized, hasSubscription, slug} = opts;
  if (!isAuthorized || !hasSubscription) {
    navigation.navigate('Subscription');
    return;
  }
  navigation.navigate('ContentPlayer', {slug});
}
