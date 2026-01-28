'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to My Profile by default
    router.replace('/setting/my-profile');
  }, [router]);

  return null;
}
