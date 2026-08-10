import {AuthScreenLayout} from '../../../shared/ui';
import {LoginForm} from '../../../features/auth';

export function LoginPage() {
  return (
    <AuthScreenLayout>
      <LoginForm />
    </AuthScreenLayout>
  );
}
