import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {useSubscription} from '../../home/model/useSubscription';
import {openGatedCatalogItem} from '../lib/openCatalogItem';
import {discussionCardsCatalog} from '../model/cardsData';
import {CatalogCard} from './CatalogCard';
import {CatalogPageLayout} from './CatalogPageLayout';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DiscussionCardsScreen() {
  const navigation = useNavigation<Nav>();
  const {t} = useI18n();
  const {isAuthorized} = useAuth();
  const {hasSubscription} = useSubscription();

  return (
    <CatalogPageLayout
      title={t('home.discussionCardsSection')}
      subtitle={t('home.discussionCardsSectionDesc')}
      sectionLabel={t('header.discussionCards')}>
      {discussionCardsCatalog.map(item => (
        <CatalogCard
          key={item.id}
          title={t(item.titleKey)}
          description={t(item.descriptionKey)}
          image={item.image}
          onPress={() =>
            openGatedCatalogItem({
              navigation,
              isAuthorized,
              hasSubscription,
              slug: item.slug,
            })
          }
        />
      ))}
    </CatalogPageLayout>
  );
}
