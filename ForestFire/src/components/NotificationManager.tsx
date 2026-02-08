import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import api, { authService } from '../services/api';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

const NotificationManager: React.FC = () => {
  const { user } = useAuth();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!user) return;

    registerForPushNotificationsAsync().then(token => {
      if (token) {
        console.log('Sending push token to backend:', token);
        // Send to backend
        api.post('/auth/push-token', { userId: user.id, expoPushToken: token })
           .catch(err => console.error('Failed to send push token', err));
      }
    });

    // Start location tracking
    let locationSubscription: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return;
      }

      // Update immediately
      const currentLoc = await Location.getCurrentPositionAsync({});
      authService.updateLocation(currentLoc.coords.latitude, currentLoc.coords.longitude);

      // Watch for changes (every 5km or 15 min?? No, maybe every 1km for nearby alerts? 
      // Let's do substantial changes to save battery: 500 meters)
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 500, // 500 meters
        },
        (location) => {
          authService.updateLocation(location.coords.latitude, location.coords.longitude);
        }
      );
    })();

    // Notification Listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification Received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification Clicked:', response);
      // TODO: Navigate to specific screen based on data
      // const data = response.notification.request.content.data;
      // if (data.reportId) navigation.navigate('History', { reportId: data.reportId });
    });

    return () => {
      notificationListener.current && notificationListener.current.remove();
      responseListener.current && responseListener.current.remove();
      if (locationSubscription) locationSubscription.remove();
    };
  }, [user]);

  return null; // This component doesn't render anything
};

async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    // alert('Failed to get push token for push notification!');
    console.warn('Failed to get push token');
    return;
  }
  
  // Get the token utilizing the proper projectId if configured, else default
  // token = (await Notifications.getExpoPushTokenAsync({ projectId: '...' })).data;
  try {
    const projectHeader = Constants.expoConfig?.extra?.eas?.projectId; 
    // If you have EAS project ID, use it. Otherwise, let it try default or fail gracefully.
    token = (await Notifications.getExpoPushTokenAsync({ projectId: projectHeader })).data;
  } catch (e) {
    console.warn('Failed to get push token. This is expected in Expo Go on Android.', e);
    return null;
  }

  return token;
}

export default NotificationManager;
