import {useSession} from '@/contexts/session';
import { Redirect } from 'expo-router';
import {Text} from 'react-native';

export default function HomePage() {
  const { session } = useSession();

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(app)" />;
}
