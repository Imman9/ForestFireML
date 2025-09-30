import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { FireReport, WeatherData, FIRMSFirePoint } from '../types';
import { fireReportService, weatherService } from '../services/api';
import { fetchFIRMSFires, TimeWindow } from '../services/firms';

interface FireMapScreenProps {
  navigation?: any;
}

const FireMapScreen: React.FC<FireMapScreenProps> = ({ navigation }) => {
  const [reports, setReports] = useState<FireReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<FireReport | null>(null);
  const [firmsFires, setFirmsFires] = useState<FIRMSFirePoint[]>([]);
  const [firmsEnabled, setFirmsEnabled] = useState(true);
  const [firmsWindow, setFirmsWindow] = useState<TimeWindow>('24h');
  const [selectedFirms, setSelectedFirms] = useState<FIRMSFirePoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    loadReports();
    getCurrentLocation();
    if (firmsEnabled) loadFirms();
  }, []);

  const getCurrentLocation = async () => {
    try {
      // In a real app, you'd use expo-location here
      // For now, we'll use a default location
      setRegion({
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const fireReports = await fireReportService.getReports();
      setReports(fireReports);
    } catch (error) {
      Alert.alert('Error', 'Failed to load fire reports');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFirms = async () => {
    try {
      const bbox = regionToBBox(region);
      const points = await fetchFIRMSFires({ source: 'VIIRS', window: firmsWindow, bbox });
      setFirmsFires(points);
    } catch (e) {
      console.warn('Failed to load FIRMS data', e);
    }
  };

  const regionToBBox = (r: typeof region) => ({
    minLat: r.latitude - r.latitudeDelta / 2,
    maxLat: r.latitude + r.latitudeDelta / 2,
    minLng: r.longitude - r.longitudeDelta / 2,
    maxLng: r.longitude + r.longitudeDelta / 2,
  });

  const getMarkerColor = (status: FireReport['status']) => {
    switch (status) {
      case 'confirmed':
        return '#FF4444';
      case 'unverified':
        return '#FF8800';
      case 'resolved':
        return '#00CC00';
      default:
        return '#FF8800';
    }
  };

  const getStatusText = (status: FireReport['status']) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed Fire';
      case 'unverified':
        return 'Unverified Report';
      case 'resolved':
        return 'Resolved';
      default:
        return 'Unknown';
    }
  };

  const handleMarkerPress = (report: FireReport) => {
    setSelectedReport(report);
  };

  const handleReportFire = () => {
    if (navigation) {
      navigation.navigate('ReportFire');
    } else {
      Alert.alert('Navigation Error', 'Navigation not available');
    }
  };

  const handleRefresh = () => {
    loadReports();
    if (firmsEnabled) loadFirms();
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        onRegionChangeComplete={(r) => {
          setRegion(r);
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {reports.map((report) => (
          <Marker
            key={report.id}
            coordinate={{
              latitude: report.location.latitude,
              longitude: report.location.longitude,
            }}
            onPress={() => handleMarkerPress(report)}
          >
            <View style={[styles.marker, { backgroundColor: getMarkerColor(report.status) }]}>
              <Ionicons name="flame" size={16} color="white" />
            </View>
          </Marker>
        ))}

        {firmsEnabled && firmsFires.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            onPress={() => setSelectedFirms(p)}
            title={`FIRMS ${p.source}`}
            description={`Conf: ${p.confidence}%  Date: ${p.acqDate} ${p.acqTime}`}
          >
            <View style={[styles.marker, { backgroundColor: getFirmsColor(p.confidence) }]}>
              <Ionicons name="flame" size={14} color="white" />
            </View>
          </Marker>
        ))}

        {/* Fire Risk Zones (example circles) */}
        <Circle
          center={{ latitude: 37.78825, longitude: -122.4324 }}
          radius={1000}
          fillColor="rgba(255, 68, 68, 0.2)"
          strokeColor="rgba(255, 68, 68, 0.5)"
          strokeWidth={2}
        />
      </MapView>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={handleReportFire}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.fab} onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.fab} onPress={() => { setFirmsEnabled(v => !v); if (!firmsEnabled) loadFirms(); }}>
          <Ionicons name={firmsEnabled ? 'eye' : 'eye-off'} size={24} color="white" />
        </TouchableOpacity>
      </View>
      {/* FIRMS window toggle */}
      <View style={styles.windowToggle}>
        {(['24h','48h','7d'] as TimeWindow[]).map(w => (
          <TouchableOpacity
            key={w}
            style={[styles.windowBtn, firmsWindow === w && styles.windowBtnActive]}
            onPress={() => { setFirmsWindow(w); if (firmsEnabled) loadFirms(); }}
          >
            <Text style={[styles.windowBtnText, firmsWindow === w && styles.windowBtnTextActive]}>{w}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* FIRMS Details Modal */}
      <Modal
        visible={selectedFirms !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedFirms(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedFirms && (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>FIRMS Hotspot</Text>
                  <TouchableOpacity onPress={() => setSelectedFirms(null)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.reportInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Source:</Text>
                    <Text style={styles.infoValue}>{selectedFirms.source}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Coordinates:</Text>
                    <Text style={styles.infoValue}>{selectedFirms.latitude.toFixed(4)}, {selectedFirms.longitude.toFixed(4)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Confidence:</Text>
                    <Text style={[styles.infoValue, { color: getFirmsColor(selectedFirms.confidence) }]}>{selectedFirms.confidence}%</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Acquired:</Text>
                    <Text style={styles.infoValue}>{selectedFirms.acqDate} {selectedFirms.acqTime}</Text>
                  </View>
                  {selectedFirms.brightness !== undefined && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Brightness:</Text>
                      <Text style={styles.infoValue}>{selectedFirms.brightness}</Text>
                    </View>
                  )}
                  {selectedFirms.frp !== undefined && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>FRP:</Text>
                      <Text style={styles.infoValue}>{selectedFirms.frp}</Text>
                    </View>
                  )}
                  {selectedFirms.satellite && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Satellite:</Text>
                      <Text style={styles.infoValue}>{selectedFirms.satellite}</Text>
                    </View>
                  )}
                  {selectedFirms.instrument && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Instrument:</Text>
                      <Text style={styles.infoValue}>{selectedFirms.instrument}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendMarker, { backgroundColor: '#FF4444' }]} />
          <Text style={styles.legendText}>Confirmed Fire</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendMarker, { backgroundColor: '#FF8800' }]} />
          <Text style={styles.legendText}>Unverified Report</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendMarker, { backgroundColor: '#00CC00' }]} />
          <Text style={styles.legendText}>Resolved</Text>
        </View>
      </View>

      {/* Report Details Modal */}
      <Modal
        visible={selectedReport !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedReport && (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Fire Report Details</Text>
                  <TouchableOpacity onPress={() => setSelectedReport(null)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.reportInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={[styles.infoValue, { color: getMarkerColor(selectedReport.status) }]}>
                      {getStatusText(selectedReport.status)}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Reported by:</Text>
                    <Text style={styles.infoValue}>{selectedReport.userName}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Date:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(selectedReport.timestamp).toLocaleDateString()}
                    </Text>
                  </View>

                  {selectedReport.confidence && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>ML Confidence:</Text>
                      <Text style={styles.infoValue}>{selectedReport.confidence.toFixed(1)}%</Text>
                    </View>
                  )}

                  {selectedReport.description && (
                    <View style={styles.descriptionContainer}>
                      <Text style={styles.infoLabel}>Description:</Text>
                      <Text style={styles.description}>{selectedReport.description}</Text>
                    </View>
                  )}

                  {selectedReport.weatherData && (
                    <View style={styles.weatherContainer}>
                      <Text style={styles.infoLabel}>Weather Data:</Text>
                      <Text style={styles.weatherText}>
                        Temperature: {selectedReport.weatherData.temperature}°C
                      </Text>
                      <Text style={styles.weatherText}>
                        Humidity: {selectedReport.weatherData.humidity}%
                      </Text>
                      <Text style={styles.weatherText}>
                        Wind Speed: {selectedReport.weatherData.windSpeed} km/h
                      </Text>
                      <Text style={styles.weatherText}>
                        Fire Risk: {selectedReport.weatherData.fireRisk.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="call" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Call Emergency</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
                    <Ionicons name="navigate" size={20} color="#FF6B35" />
                    <Text style={styles.secondaryButtonText}>Navigate</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

  const getFirmsColor = (confidence: number) => {
    if (confidence >= 80) return '#FF4444';
    if (confidence >= 60) return '#FF8800';
    if (confidence >= 40) return '#FFCC00';
    return '#00CC00';
  };

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  legend: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  windowToggle: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
  },
  windowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  windowBtnActive: {
    backgroundColor: '#FF6B35',
  },
  windowBtnText: {
    color: '#333',
    fontWeight: 'bold',
  },
  windowBtnTextActive: {
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  reportInfo: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  descriptionContainer: {
    marginTop: 16,
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
    lineHeight: 20,
  },
  weatherContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  weatherText: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
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
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B35',
    marginRight: 0,
    marginLeft: 10,
  },
  secondaryButtonText: {
    color: '#FF6B35',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default FireMapScreen; 