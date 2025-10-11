import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  CameraType,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { mlService } from '../services/api';
import { classifyImage as classifyLocal } from '../services/localInference';
import { MLPrediction } from '../types';

const CameraDirections = {
  front: 'front' as CameraType,
  back: 'back' as CameraType,
};

const FireDetectionScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>(CameraDirections.back);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<MLPrediction | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        setCapturedImage(photo.uri);
        setPrediction(null);
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
        setPrediction(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    try {
      // Try local TFLite inference first; if unavailable, fall back to remote
      const local = await classifyLocal(capturedImage);
      const result = local || (await mlService.predictFire(capturedImage));
      setPrediction(result);
    } catch (error) {
      Alert.alert('Analysis Failed', 'Failed to analyze image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetCamera = () => {
    setCapturedImage(null);
    setPrediction(null);
  };

  const getRiskColor = (confidence: number) => {
    if (confidence >= 80) return '#FF4444';
    if (confidence >= 60) return '#FF8800';
    if (confidence >= 40) return '#FFCC00';
    return '#00CC00';
  };

  const getRiskLevel = (confidence: number) => {
    if (confidence >= 80) return 'HIGH RISK';
    if (confidence >= 60) return 'MODERATE RISK';
    if (confidence >= 40) return 'LOW RISK';
    return 'NO RISK';
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Pick from Gallery</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fire Detection</Text>
        <Text style={styles.subtitle}>Capture or upload an image to analyze</Text>
      </View>

      {!capturedImage ? (
        <View style={styles.cameraContainer}>
          <View style={{ position: 'relative' }}>
            <CameraView
              style={styles.camera}
              facing={cameraType}
              ref={cameraRef}
            />

            <View style={styles.cameraOverlay} pointerEvents="box-none">
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.flipButton}
                  onPress={() =>
                    setCameraType(
                      cameraType === CameraDirections.back
                        ? CameraDirections.front
                        : CameraDirections.back
                    )
                  }
                >
                  <Ionicons name="camera-reverse" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.cameraButtons}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
              <Ionicons name="images" size={24} color="#FF6B35" />
              <Text style={styles.galleryButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} />

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={analyzeImage}
              disabled={isAnalyzing}
            >
              <Ionicons name="analytics" size={20} color="white" />
              <Text style={styles.analyzeButtonText}>
                {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.retakeButton} onPress={resetCamera}>
              <Ionicons name="refresh" size={20} color="#FF6B35" />
              <Text style={styles.retakeButtonText}>Retake</Text>
            </TouchableOpacity>
          </View>

          {isAnalyzing && (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.analyzingText}>
                Analyzing image for fire detection...
              </Text>
            </View>
          )}

          {prediction && (
            <View style={styles.predictionContainer}>
              <View style={styles.predictionHeader}>
                <Ionicons
                  name={prediction.hasFire ? 'warning' : 'checkmark-circle'}
                  size={32}
                  color={prediction.hasFire ? '#FF4444' : '#00CC00'}
                />
                <Text style={styles.predictionTitle}>
                  {prediction.hasFire ? 'FIRE DETECTED!' : 'No Fire Detected'}
                </Text>
              </View>

              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceLabel}>Confidence Level:</Text>
                <View style={styles.confidenceBar}>
                  <View
                    style={[
                      styles.confidenceFill,
                      {
                        width: `${prediction.confidence}%`,
                        backgroundColor: getRiskColor(prediction.confidence),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.confidenceText}>
                  {prediction.confidence.toFixed(1)}%
                </Text>
              </View>

              <View style={styles.riskContainer}>
                <Text style={styles.riskLabel}>Risk Level:</Text>
                <Text
                  style={[
                    styles.riskLevel,
                    { color: getRiskColor(prediction.confidence) },
                  ]}
                >
                  {getRiskLevel(prediction.confidence)}
                </Text>
              </View>

              {prediction.hasFire && (
                <TouchableOpacity style={styles.emergencyButton}>
                  <Ionicons name="call" size={20} color="white" />
                  <Text style={styles.emergencyButtonText}>
                    Call Emergency Services
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  cameraContainer: { flex: 1 },
  camera: { flex: 1, height: 400 },
  cameraOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent' },
  cameraControls: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 10,
  },
  cameraButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
  },
  galleryButton: { alignItems: 'center' },
  galleryButtonText: {
    color: '#FF6B35',
    fontSize: 12,
    marginTop: 4,
  },
  resultContainer: { padding: 20 },
  capturedImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  analyzeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  retakeButtonText: {
    color: '#FF6B35',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  analyzingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  analyzingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  predictionContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  predictionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  confidenceContainer: { marginBottom: 15 },
  confidenceLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  confidenceBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  confidenceFill: { height: '100%', borderRadius: 4 },
  confidenceText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  riskContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  riskLabel: { fontSize: 14, color: '#666' },
  riskLevel: { fontSize: 16, fontWeight: 'bold' },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  emergencyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default FireDetectionScreen;
