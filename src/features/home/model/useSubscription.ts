import {useCallback, useEffect, useState} from 'react';

import {useAuth} from '../../../entities/session';
import {getJson} from '../../../shared/api';

export type SubscriptionInfo = {
  success?: boolean;
  subscribe_type_id?: number;
  dateEnd?: string;
  message?: string;
};

export function useSubscription() {
  const {isAuthorized, authIsLoading, profile} = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
    null,
  );
  const [resolved, setResolved] = useState(false);

  const reload = useCallback(async () => {
    if (!isAuthorized || profile?.isStudent) {
      setSubscription(null);
      setResolved(true);
      return;
    }
    setResolved(false);
    try {
      const res = await getJson<SubscriptionInfo>({
        path: '/subscription',
        isSecure: true,
      });
      setSubscription(res);
    } catch {
      setSubscription(null);
    } finally {
      setResolved(true);
    }
  }, [isAuthorized, profile?.isStudent]);

  useEffect(() => {
    if (authIsLoading) {
      return;
    }
    void reload();
  }, [authIsLoading, reload]);

  /** Same as site: any successful subscription payload. */
  const hasSubscription = !!subscription?.success;
  /** Paid plan (not free trial type 1). */
  const hasPaidTariff = !!(
    subscription?.subscribe_type_id && subscription.subscribe_type_id !== 1
  );
  const waitingForTeacherSub =
    isAuthorized && !profile?.isStudent && !resolved;

  return {
    subscription,
    loading: authIsLoading || waitingForTeacherSub,
    hasSubscription,
    hasPaidTariff,
    reload,
  };
}
