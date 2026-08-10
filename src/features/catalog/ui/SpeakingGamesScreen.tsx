import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {useSubscription} from '../../home/model/useSubscription';
import {openGatedCatalogItem} from '../lib/openCatalogItem';
import {speakingGamesCatalog} from '../model/speakingGamesData';
import {CatalogCard} from './CatalogCard';
import {CatalogPageLayout} from './CatalogPageLayout';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SpeakingGamesScreen() {
  const navigation = useNavigation<Nav>();
  const {t} = useI18n();
  const {isAuthorized} = useAuth();
  const {hasSubscription} = useSubscription();

  return (
    <CatalogPageLayout
      title={t('home.speakingGamesSection')}
      subtitle={t('home.speakingGamesSectionDesc')}
      sectionLabel={t('header.speakingGames')}>
      {speakingGamesCatalog.map(item => (
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
