import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FireReport } from '../types';
import { fireReportService } from '../services/api';

const HistoryScreen: React.FC = () => {
  const [reports, setReports] = useState<FireReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'resolved'>('all');

  useEffect(() => {
    loadReports();
  }, []);

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

  const getFilteredReports = () => {
    if (filter === 'all') return reports;
    return reports.filter(report => report.status === filter);
  };

  const getStatusColor = (status: FireReport['status']) => {
    switch (status) {
      case 'confirmed':
        return '#FF4444';
      case 'unverified':
        return '#FF8800';
      case 'resolved':
        return '#00CC00';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: FireReport['status']) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'unverified':
        return 'Unverified';
      case 'resolved':
        return 'Resolved';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderReportItem = ({ item }: { item: FireReport }) => (
    <TouchableOpacity style={styles.reportItem}>
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <Text style={styles.reportDate}>{formatDate(item.timestamp)}</Text>
          <Text style={styles.reportLocation}>
            {item.location.address || `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      {item.description && (
        <Text style={styles.reportDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.reportFooter}>
        <View style={styles.reportMeta}>
          <Ionicons name="person" size={16} color="#666" />
          <Text style={styles.reportMetaText}>{item.userName}</Text>
        </View>
        
        {item.confidence && (
          <View style={styles.reportMeta}>
            <Ionicons name="analytics" size={16} color="#666" />
            <Text style={styles.reportMetaText}>{item.confidence.toFixed(1)}% confidence</Text>
          </View>
        )}
      </View>

      {item.weatherData && (
        <View style={styles.weatherInfo}>
          <Text style={styles.weatherLabel}>Weather at time of report:</Text>
          <View style={styles.weatherRow}>
            <Text style={styles.weatherText}>
              {item.weatherData.temperature}°C, {item.weatherData.humidity}% humidity
            </Text>
            <Text style={[styles.weatherRisk, { color: getStatusColor(item.weatherData.fireRisk === 'high' ? 'confirmed' : 'unverified') }]}>
              {item.weatherData.fireRisk.toUpperCase()} RISK
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const FilterButton = ({ title, value, isActive }: { title: string; value: typeof filter; isActive: boolean }) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading fire reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Fire Reports History</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadReports}>
          <Ionicons name="refresh" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FilterButton title="All" value="all" isActive={filter === 'all'} />
        <FilterButton title="Confirmed" value="confirmed" isActive={filter === 'confirmed'} />
        <FilterButton title="Resolved" value="resolved" isActive={filter === 'resolved'} />
      </View>

      {/* Reports List */}
      <FlatList
        data={getFilteredReports()}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Reports Found</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'all' 
                ? 'No fire reports have been submitted yet.'
                : `No ${filter} fire reports found.`
              }
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  reportItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reportInfo: {
    flex: 1,
  },
  reportDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  reportLocation: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reportDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportMetaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  weatherInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  weatherLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherText: {
    fontSize: 14,
    color: '#333',
  },
  weatherRisk: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
});

export default HistoryScreen; 