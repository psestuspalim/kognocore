import { useEffect, useRef } from 'react';
import { client } from '@/api/client';

export default function FeatureTracker({ featureName, category, currentUser }) {
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!currentUser || !featureName) return;

    const trackUsage = async () => {
      try {
        await client.entities.FeatureUsage.create({
          feature_name: featureName,
          feature_category: category || 'general',
          user_email: currentUser.email,
          user_role: currentUser.role,
          session_duration: 0,
          action_type: 'view'
        });
      } catch (error) {
        console.error('Error tracking feature:', error);
      }
    };

    trackUsage();

    return () => {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (duration > 2) {
        client.entities.FeatureUsage.create({
          feature_name: featureName,
          feature_category: category || 'general',
          user_email: currentUser.email,
          user_role: currentUser.role,
          session_duration: duration,
          action_type: 'view'
        }).catch(() => { });
      }
    };
  }, [featureName, category, currentUser]);

  return null;
}