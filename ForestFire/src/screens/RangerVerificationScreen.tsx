import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Circle, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { fireReportService, rangersService } from '../services/api';
import { FireReport, WeatherData, MLPrediction } from '../types';

const { width } = Dimensions.get('window');

const RangerVerificationScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { reportId } = route.params as { reportId: string };

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<FireReport | null>(null);
  const [nearbyReports, setNearbyReports] = useState<FireReport[]>([]);
  const [firmsPoints, setFirmsPoints] = useState<any[]>([]); // Using any for FIRMS raw data for now
  const [weather, setWeather] = useState<any | null>(null);
  const [verificationScore, setVerificationScore] = useState<any | null>(null); // { total, ml, satellite, crowd, weather }
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    fetchContext();
  }, [reportId]);

  const fetchContext = async () => {
    setLoading(true);
    try {
      const data = await rangersService.getReportContext(reportId);
      setReport(data.report);
      setNearbyReports(data.nearbyReports || []);
      setFirmsPoints(data.firmsData || []);
      setWeather(data.weather);
      setVerificationScore(data.verificationScore);
    } catch (error) {
      console.error('Failed to fetch report context:', error);
      Alert.alert('Error', 'Could not load verification context.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (status: 'confirmed' | 'false_alarm' | 'needs_monitoring') => {
    setIsVerifying(true);
    try {
      await rangersService.updateReportStatus(reportId, status, 'Verified by Ranger Dashboard');
      Alert.alert('Success', `Report marked as ${status.replace('_', ' ')}`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
      setIsVerifying(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setIsVerifying(true);
            try {
              await rangersService.deleteReport(reportId);
              Alert.alert('Deleted', 'Report has been permanently deleted.', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete report.');
            } finally {
              setIsVerifying(false);
            }
          }
        }
      ]
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return '#FF4444';
    if (confidence >= 50) return '#FF8800';
    return '#666';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading Verification Context...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.errorContainer}>
        <Text>Report not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Verification Dashboard</Text>
          <Text style={styles.headerSubtitle}>Report #{reportId.slice(0, 8)}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{report.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Main Evidence: Image + ML */}
      <View style={styles.evidenceSection}>
        <Image source={{ uri: report.imageUrl }} style={styles.evidenceImage} />
        
        <View style={styles.mlOverlay}>
          <View style={styles.mlBadge}>
            <Text style={styles.mlTitle}>ML Confidence</Text>
            <Text style={[styles.mlScore, { color: getConfidenceColor(report.confidence || 0) }]}>
              {report.confidence ? report.confidence.toFixed(1) : '0'}%
            </Text>
          </View>
        </View>
      </View>

      {/* Geospatial Context */}
      <View style={styles.mapSection}>
        <Text style={styles.sectionTitle}>Geospatial Intelligence</Text>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: (report as any).locationLat || report.location?.latitude,
              longitude: (report as any).locationLng || report.location?.longitude,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
          >
            {/* Target Report */}
            <Marker
              coordinate={{
                latitude: (report as any).locationLat || report.location?.latitude,
                longitude: (report as any).locationLng || report.location?.longitude,
              }}
              title="Target Report"
              pinColor="#FF6B35"
            />
            
            {/* Nearby Reports */}
            {nearbyReports.map((r: any) => (
              <Marker
                key={r.id}
                coordinate={{
                  latitude: r.locationLat,
                  longitude: r.locationLng,
                }}
                pinColor="blue"
                title={`User Report (${r.status})`}
              />
            ))}

            {/* FIRMS Data */}
            {firmsPoints.map((p: any, index) => (
              <Circle
                key={`firms-${index}`}
                center={{
                  latitude: parseFloat(p.latitude),
                  longitude: parseFloat(p.longitude),
                }}
                radius={500}
                fillColor="rgba(255, 0, 0, 0.3)"
                strokeColor="red"
              />
            ))}
          </MapView>
          
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF6B35' }]} />
              <Text style={styles.legendText}>This Report</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'blue' }]} />
              <Text style={styles.legendText}>Nearby Reports</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'red', opacity: 0.5 }]} />
              <Text style={styles.legendText}>Satellite (FIRMS)</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Environmental Context */}
      {weather && (
        <View style={styles.contextRow}>
          <View style={styles.contextCard}>
            <Ionicons name="thermometer" size={24} color="#FF6B35" />
            <Text style={styles.contextValue}>{weather.temp}°C</Text>
            <Text style={styles.contextLabel}>Temp</Text>
          </View>
          <View style={styles.contextCard}>
            <Ionicons name="speedometer" size={24} color="#4A90E2" />
            <Text style={styles.contextValue}>{weather.wind} km/h</Text>
            <Text style={styles.contextLabel}>Wind</Text>
          </View>
          <View style={styles.contextCard}>
            <Ionicons name="water" size={24} color="#4A90E2" />
            <Text style={styles.contextValue}>{weather.humidity}%</Text>
            <Text style={styles.contextLabel}>Humidity</Text>
          </View>
          <View style={[styles.contextCard, { backgroundColor: '#FFF3F3' }]}>
            <Ionicons name="flame" size={24} color="#FF4444" />
            <Text style={[styles.contextValue, { color: '#FF4444' }]}>{weather.risk}</Text>
            <Text style={styles.contextLabel}>Fire Risk</Text>
          </View>
        </View>
      )}

      {/* Verification Score & Recommendation */}
      {verificationScore && (
          <View style={styles.scoreSection}>
              <Text style={styles.sectionTitle}>System Recommendation</Text>
              
              <View style={styles.scoreCard}>
                  <View style={styles.scoreHeader}>
                      <View>
                          <Text style={styles.scoreLabel}>Verification Probability</Text>
                          <Text style={styles.scoreValue}>{verificationScore.total}%</Text>
                      </View>
                      <View style={[styles.recommendationBadge, { 
                          backgroundColor: verificationScore.total > 70 ? '#e74c3c' : 
                                         verificationScore.total > 40 ? '#f39c12' : '#7f8c8d' 
                      }]}>
                          <Text style={styles.recommendationText}>
                              {verificationScore.total > 70 ? 'CONFIRM FIRE' : 
                               verificationScore.total > 40 ? 'MONITOR' : 'REJECT'}
                          </Text>
                      </View>
                  </View>

                  <View style={styles.scoreBarContainer}>
                      <View style={[styles.scoreBarFill, { width: `${verificationScore.total}%`, backgroundColor: getConfidenceColor(verificationScore.total) }]} />
                  </View>

                  <View style={styles.breakdownContainer}>
                      <Text style={styles.breakdownTitle}>Score Breakdown:</Text>
                      <View style={styles.breakdownRow}>
                          <Text>ML Confidence</Text>
                          <Text>+{verificationScore.ml}</Text>
                      </View>
                      <View style={styles.breakdownRow}>
                          <Text>Satellite Confirmation</Text>
                          <Text>+{verificationScore.satellite}</Text>
                      </View>
                      <View style={styles.breakdownRow}>
                          <Text>Crowd Consensus</Text>
                          <Text>+{verificationScore.crowd}</Text>
                      </View>
                       <View style={styles.breakdownRow}>
                          <Text>Weather Risk</Text>
                          <Text>+{verificationScore.weather}</Text>
                      </View>
                  </View>
              </View>
          </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Verification Actions</Text>
        <View style={styles.actionButtons}>
            <TouchableOpacity 
                style={[styles.actionBtn, styles.rejectBtn]} 
                onPress={() => handleAction('false_alarm')}
                disabled={isVerifying}
            >
                <Ionicons name="close-circle" size={24} color="white" />
                <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.actionBtn, styles.monitorBtn]} 
                onPress={() => handleAction('needs_monitoring')}
                disabled={isVerifying}
            >
                <Ionicons name="eye" size={24} color="white" />
                <Text style={styles.actionText}>Monitor</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.actionBtn, styles.confirmBtn]} 
                onPress={() => handleAction('confirmed')}
                disabled={isVerifying}
            >
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text style={styles.actionText}>Confirm Fire</Text>
            </TouchableOpacity>
        </View>

        <TouchableOpacity 
            style={[styles.deleteBtn]} 
            onPress={handleDelete}
            disabled={isVerifying}
        >
            <Ionicons name="trash" size={20} color="red" />
            <Text style={styles.deleteText}>Delete Report</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Action will be logged to Verification Audit Trail</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 50, // Status bar padding
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  statusBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#eee',
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#555',
  },
  evidenceSection: {
    position: 'relative',
    height: 250,
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mlOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    padding: 10,
    elevation: 3,
  },
  mlBadge: {
    alignItems: 'center',
  },
  mlTitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  mlScore: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginLeft: 20,
    marginTop: 20,
  },
  mapSection: {
    backgroundColor: 'white',
    paddingBottom: 20,
  },
  mapContainer: {
    height: 250,
    width: '100%',
  },
  map: {
    flex: 1,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },
  contextCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    margin: 5,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 1,
  },
  contextValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 4,
  },
  contextLabel: {
    fontSize: 10,
    color: '#888',
  },
  actionsContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  rejectBtn: {
    backgroundColor: '#7f8c8d',
  },
  monitorBtn: {
    backgroundColor: '#f39c12',
  },
  confirmBtn: {
    backgroundColor: '#e74c3c',
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 12,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#ffdddd',
    backgroundColor: '#fff5f5',
    borderRadius: 8,
  },
  deleteText: {
    color: 'red',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#aaa',
  },
  scoreSection: {
      paddingBottom: 10,
  },
  scoreCard: {
      backgroundColor: 'white',
      marginHorizontal: 20,
      borderRadius: 12,
      padding: 15,
      elevation: 2,
  },
  scoreHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
  },
  scoreLabel: {
      fontSize: 12,
      color: '#666',
  },
  scoreValue: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#333',
  },
  recommendationBadge: {
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
  },
  recommendationText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 12,
  },
  scoreBarContainer: {
      height: 10,
      backgroundColor: '#eee',
      borderRadius: 5,
      overflow: 'hidden',
      marginBottom: 15,
  },
  scoreBarFill: {
      height: '100%',
  },
  breakdownContainer: {
      backgroundColor: '#f9f9f9',
      padding: 10,
      borderRadius: 8,
  },
  breakdownTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 5,
      color: '#555',
  },
  breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 3,
  },
});

export default RangerVerificationScreen;
