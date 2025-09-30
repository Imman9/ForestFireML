import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { fireReportService, weatherService } from '../services/api';
import { FireReport, WeatherData } from '../types';

interface ReportFireScreenProps {
  navigation?: any;
}

const ReportFireScreen: React.FC<ReportFireScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to report fires');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLocation(currentLocation);

      // Get address from coordinates
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const place = reverseGeocode[0];
        const addressParts = [
          place.street,
          place.city,
          place.region,
          place.country,
        ].filter(Boolean);
        setAddress(addressParts.join(', '));
      }

      // Get weather data
      try {
        const weather = await weatherService.getWeatherData(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude
        );
        setWeatherData(weather);
      } catch (error) {
        console.error('Failed to get weather data:', error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSubmit = async () => {
    if (!location) {
      Alert.alert('Error', 'Location is required');
      return;
    }

    if (!image) {
      Alert.alert('Error', 'Please add a photo of the fire');
      return;
    }

    try {
      setIsSubmitting(true);

      const reportData = {
        userId: user?.id || '',
        userName: user?.name || 'Anonymous',
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: address,
        },
        imageUrl: image,
        description: description.trim() || undefined,
        status: 'unverified' as const,
        weatherData: weatherData || undefined,
      };

      await fireReportService.createReport(reportData);
      
      Alert.alert(
        'Report Submitted',
        'Your fire report has been submitted successfully. Emergency services will be notified.',
        [
          {
            text: 'OK',
            onPress: () => navigation?.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'extreme':
        return '#FF4444';
      case 'high':
        return '#FF8800';
      case 'moderate':
        return '#FFCC00';
      case 'low':
        return '#00CC00';
      default:
        return '#666';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Report Fire</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Location Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        {isLoadingLocation ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        ) : location ? (
          <View style={styles.locationContainer}>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={20} color="#FF6B35" />
              <Text style={styles.locationText}>
                {address || `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`}
              </Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={getCurrentLocation}>
              <Ionicons name="refresh" size={16} color="#FF6B35" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
            <Ionicons name="location" size={20} color="#FF6B35" />
            <Text style={styles.locationButtonText}>Get Current Location</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Weather Section */}
      {weatherData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weather Conditions</Text>
          <View style={styles.weatherContainer}>
            <View style={styles.weatherRow}>
              <Text style={styles.weatherLabel}>Temperature:</Text>
              <Text style={styles.weatherValue}>{weatherData.temperature}°C</Text>
            </View>
            <View style={styles.weatherRow}>
              <Text style={styles.weatherLabel}>Humidity:</Text>
              <Text style={styles.weatherValue}>{weatherData.humidity}%</Text>
            </View>
            <View style={styles.weatherRow}>
              <Text style={styles.weatherLabel}>Wind Speed:</Text>
              <Text style={styles.weatherValue}>{weatherData.windSpeed} km/h</Text>
            </View>
            <View style={styles.weatherRow}>
              <Text style={styles.weatherLabel}>Fire Risk:</Text>
              <Text style={[styles.weatherValue, { color: getRiskColor(weatherData.fireRisk) }]}>
                {weatherData.fireRisk.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Photo Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo Evidence *</Text>
        {image ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.selectedImage} />
            <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
              <Text style={styles.changeImageText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Ionicons name="camera" size={32} color="#FF6B35" />
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              <Ionicons name="images" size={32} color="#FF6B35" />
              <Text style={styles.photoButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Description Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description (Optional)</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe what you see (fire size, smoke, etc.)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Emergency Notice */}
      <View style={styles.emergencyNotice}>
        <Ionicons name="warning" size={24} color="#FF4444" />
        <Text style={styles.emergencyText}>
          If this is an emergency, call emergency services immediately at 911
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, (!location || !image || isSubmitting) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!location || !image || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Ionicons name="send" size={20} color="white" />
            <Text style={styles.submitButtonText}>Submit Report</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    marginLeft: 8,
    color: '#333',
    fontSize: 14,
  },
  refreshButton: {
    padding: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 8,
  },
  locationButtonText: {
    marginLeft: 8,
    color: '#FF6B35',
    fontWeight: '500',
  },
  weatherContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weatherLabel: {
    color: '#666',
    fontSize: 14,
  },
  weatherValue: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  imageContainer: {
    alignItems: 'center',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  changeImageButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 6,
  },
  changeImageText: {
    color: '#FF6B35',
    fontSize: 14,
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  photoButton: {
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
  },
  photoButtonText: {
    marginTop: 8,
    color: '#FF6B35',
    fontSize: 12,
    textAlign: 'center',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  emergencyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3F3',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  emergencyText: {
    marginLeft: 12,
    color: '#FF4444',
    fontSize: 14,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ReportFireScreen; 