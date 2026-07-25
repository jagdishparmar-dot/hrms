import { Redirect } from 'expo-router';

/** Self-registration disabled — HR provisions accounts. */
export default function RegisterScreen() {
  return <Redirect href="/(auth)/login" />;
}
