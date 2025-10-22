import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import { fireReportService } from '../services/api';

interface ProfileScreenProps {
  navigation?: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [userReportsCount, setUserReportsCount] = useState<number>(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [locationEnabled, setLocationEnabled] = useState<boolean>(false);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(false);

  useEffect(() => {
    loadUserStats();
    checkPermissions();
  }, []);

  const loadUserStats = async () => {
    try {
      const reports = await fireReportService.getReports();
      const userReports = reports.filter(report => report.userId === user?.id);
      setUserReportsCount(userReports.length);
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  const checkPermissions = async () => {
    try {
      // Check notification permissions
      const notifSettings = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(notifSettings.granted);

      // Check location permissions
      const locationStatus = await Location.getForegroundPermissionsAsync();
      setLocationEnabled(locationStatus.granted);

      // Check camera permissions
      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
      setCameraEnabled(cameraStatus.granted);
    } catch (error) {
      console.error('Failed to check permissions:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Services',
      'Call emergency services immediately?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Call 911',
          style: 'destructive',
          onPress: async () => {
            const phoneNumber = Platform.OS === 'ios' ? 'telprompt:911' : 'tel:911';
            const canCall = await Linking.canOpenURL(phoneNumber);
            if (canCall) {
              Linking.openURL(phoneNumber);
            } else {
              Alert.alert('Error', 'Unable to make phone calls on this device');
            }
          },
        },
      ]
    );
  };

  const handleFireSafetyTips = () => {
    Alert.alert(
      'Fire Safety Tips',
      ' Prevention:\n• Clear dry vegetation around property\n• Properly dispose of cigarettes\n• Never leave fires unattended\n\n If You See a Fire:\n• Call 911 immediately\n• Report exact location\n• Evacuate if nearby\n• Do not attempt to fight large fires\n\n Evacuation:\n• Have an escape plan\n• Keep important documents ready\n• Alert neighbors\n• Follow official evacuation orders',
      [{ text: 'Got it', style: 'default' }]
    );
  };

  const handleNotificationSettings = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    
    if (status === 'granted') {
      Alert.alert(
        'Notifications',
        'Notifications are currently enabled. You can disable them in your device settings.',
        [
          { text: 'OK' },
          { 
            text: 'Open Settings', 
            onPress: () => Linking.openSettings() 
          }
        ]
      );
    } else {
      Alert.alert(
        'Enable Notifications',
        'Get alerts about nearby fires and important updates.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              const { status: newStatus } = await Notifications.requestPermissionsAsync();
              setNotificationsEnabled(newStatus === 'granted');
              if (newStatus === 'granted') {
                Alert.alert('Success', 'Notifications enabled successfully');
              }
            }
          }
        ]
      );
    }
  };

  const handleLocationSettings = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    
    if (status === 'granted') {
      Alert.alert(
        'Location Services',
        'Location access is currently enabled. You can change this in your device settings.',
        [
          { text: 'OK' },
          { 
            text: 'Open Settings', 
            onPress: () => Linking.openSettings() 
          }
        ]
      );
    } else {
      Alert.alert(
        'Enable Location',
        'Location access is needed to report fires and get weather data.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
              setLocationEnabled(newStatus === 'granted');
              if (newStatus === 'granted') {
                Alert.alert('Success', 'Location access enabled successfully');
              }
            }
          }
        ]
      );
    }
  };

  const handleCameraSettings = async () => {
    const { status } = await ImagePicker.getCameraPermissionsAsync();
    
    if (status === 'granted') {
      Alert.alert(
        'Camera Permissions',
        'Camera access is currently enabled. You can change this in your device settings.',
        [
          { text: 'OK' },
          { 
            text: 'Open Settings', 
            onPress: () => Linking.openSettings() 
          }
        ]
      );
    } else {
      Alert.alert(
        'Enable Camera',
        'Camera access is needed to take photos of fires when reporting.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              const { status: newStatus } = await ImagePicker.requestCameraPermissionsAsync();
              setCameraEnabled(newStatus === 'granted');
              if (newStatus === 'granted') {
                Alert.alert('Success', 'Camera access enabled successfully');
              }
            }
          }
        ]
      );
    }
  };

  const handleHelp = () => {
    Alert.alert(
      'Help & FAQ',
      'How can we help you?\n\n• How to report a fire\n• Understanding fire risk levels\n• Using the map feature\n• Account settings\n• Emergency procedures',
      [{ text: 'Close' }]
    );
  };

  const handleContactSupport = () => {
    const email = 'support@forestfire.com';
    const subject = 'Support Request';
    const body = `Hello,\n\nI need help with:\n\n[Describe your issue here]\n\n---\nUser: ${user?.name}\nEmail: ${user?.email}`;
    
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Unable to open email client. Please email us at support@forestfire.com');
        }
      });
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Forest Fire Detection App Privacy Policy\n\n• We collect location data only when reporting fires\n• Photos are stored securely\n• Personal information is encrypted\n• We do not share data with third parties\n• You can delete your account anytime\n\nFor full privacy policy, visit: forestfire.com/privacy',
      [{ text: 'Close' }]
    );
  };

  const getPermissionStatus = (enabled: boolean) => {
    return enabled ? ' Enabled' : ' Disabled';
  };

  const getPermissionColor = (enabled: boolean) => {
    return enabled ? '#00CC00' : '#FF8800';
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'ranger':
        return 'Forest Ranger';
      case 'user':
        return 'General User';
      default:
        return role;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#FF6B35" />
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {getRoleDisplayName(user?.role || 'user')}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleEmergencyCall}>
          <View style={styles.actionIcon}>
            <Ionicons name="call" size={24} color="#FF4444" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Emergency Services</Text>
            <Text style={styles.actionSubtitle}>Call 911 immediately</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleFireSafetyTips}>
          <View style={styles.actionIcon}>
            <Ionicons name="shield-checkmark" size={24} color="#00CC00" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Fire Safety Tips</Text>
            <Text style={styles.actionSubtitle}>Learn safety guidelines</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* User Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Activity</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={32} color="#FF6B35" />
            <Text style={styles.statNumber}>{userReportsCount}</Text>
            <Text style={styles.statLabel}>Reports Submitted</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Ionicons name="shield-checkmark" size={32} color="#00CC00" />
            <Text style={styles.statNumber}>{user?.role === 'admin' || user?.role === 'ranger' ? 'Admin' : 'Active'}</Text>
            <Text style={styles.statLabel}>Account Status</Text>
          </View>
        </View>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        
        <TouchableOpacity style={styles.settingButton} onPress={handleNotificationSettings}>
          <View style={styles.settingIcon}>
            <Ionicons name="notifications" size={24} color="#FF6B35" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Notifications</Text>
            <Text style={[styles.settingSubtitle, { color: getPermissionColor(notificationsEnabled) }]}>
              {getPermissionStatus(notificationsEnabled)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingButton} onPress={handleLocationSettings}>
          <View style={styles.settingIcon}>
            <Ionicons name="location" size={24} color="#FF6B35" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Location Services</Text>
            <Text style={[styles.settingSubtitle, { color: getPermissionColor(locationEnabled) }]}>
              {getPermissionStatus(locationEnabled)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingButton} onPress={handleCameraSettings}>
          <View style={styles.settingIcon}>
            <Ionicons name="camera" size={24} color="#FF6B35" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Camera Permissions</Text>
            <Text style={[styles.settingSubtitle, { color: getPermissionColor(cameraEnabled) }]}>
              {getPermissionStatus(cameraEnabled)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* App Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Build Number</Text>
          <Text style={styles.infoValue}>1</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last Updated</Text>
          <Text style={styles.infoValue}>Today</Text>
        </View>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity style={styles.supportButton} onPress={handleHelp}>
          <View style={styles.supportIcon}>
            <Ionicons name="help-circle" size={24} color="#FF6B35" />
          </View>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>Help & FAQ</Text>
            <Text style={styles.supportSubtitle}>Get help and answers</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
          <View style={styles.supportIcon}>
            <Ionicons name="mail" size={24} color="#FF6B35" />
          </View>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>Contact Support</Text>
            <Text style={styles.supportSubtitle}>Send us a message</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportButton} onPress={handlePrivacyPolicy}>
          <View style={styles.supportIcon}>
            <Ionicons name="document-text" size={24} color="#FF6B35" />
          </View>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>Privacy Policy</Text>
            <Text style={styles.supportSubtitle}>Read our privacy policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" size={20} color="#FF4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionIcon: {
    width: 40,
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingIcon: {
    width: 40,
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  supportIcon: {
    width: 40,
    alignItems: 'center',
  },
  supportContent: {
    flex: 1,
    marginLeft: 12,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  supportSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  logoutText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#eee',
  },
});

export default ProfileScreen;