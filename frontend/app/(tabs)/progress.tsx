import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../../src/AuthContext';

type Day = { date: string; steps: number; calories_burned: number; active_minutes: number; workouts: number };

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function Progress() {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/progress/weekly');
      setDays(res.days || []);
    } catch (e: any) { console.warn(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const totalSteps = days.reduce((s, d) => s + d.steps, 0);
  const totalCals = days.reduce((s, d) => s + d.calories_burned, 0);
  const totalWorkouts = days.reduce((s, d) => s + d.workouts, 0);
  const totalActive = days.reduce((s, d) => s + d.active_minutes, 0);

  const maxSteps = Math.max(1, ...days.map(d => d.steps));
  const maxCals = Math.max(1, ...days.map(d => d.calories_burned));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.eyebrow}>LAST 7 DAYS</Text>
        <Text style={styles.title}>Progress</Text>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color="#09090b" />
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <Summary label="Steps" value={totalSteps.toLocaleString()} color="#10b981" testID="sum-steps" />
              <Summary label="Workouts" value={`${totalWorkouts}`} color="#3b82f6" testID="sum-workouts" />
            </View>
            <View style={styles.summaryRow}>
              <Summary label="Calories" value={`${totalCals}`} color="#fb7185" testID="sum-cals" />
              <Summary label="Active min" value={`${totalActive}`} color="#a855f7" testID="sum-active" />
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Daily steps</Text>
              <View style={styles.chart}>
                {days.map((d, i) => {
                  const h = (d.steps / maxSteps) * 140;
                  const dt = new Date(d.date + 'T00:00:00');
                  return (
                    <View key={d.date} style={styles.col}>
                      <Text style={styles.colVal}>{d.steps > 0 ? (d.steps / 1000).toFixed(1) + 'k' : ''}</Text>
                      <View style={[styles.bar, { height: Math.max(4, h), backgroundColor: '#10b981' }]} />
                      <Text style={styles.colLabel}>{DAY_LABELS[dt.getDay()]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Calories burned</Text>
              <View style={styles.chart}>
                {days.map((d, i) => {
                  const h = (d.calories_burned / maxCals) * 140;
                  const dt = new Date(d.date + 'T00:00:00');
                  return (
                    <View key={d.date} style={styles.col}>
                      <Text style={styles.colVal}>{d.calories_burned > 0 ? d.calories_burned : ''}</Text>
                      <View style={[styles.bar, { height: Math.max(4, h), backgroundColor: '#fb7185' }]} />
                      <Text style={styles.colLabel}>{DAY_LABELS[dt.getDay()]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Summary({ label, value, color, testID }: any) {
  return (
    <View testID={testID} style={styles.sumCard}>
      <View style={[styles.sumDot, { backgroundColor: color }]} />
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={styles.sumValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: '#a1a1aa' },
  title: { fontSize: 32, fontWeight: '800', color: '#09090b', letterSpacing: -0.5, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sumCard: { flex: 1, padding: 18, borderRadius: 20, backgroundColor: '#fafafa', gap: 6 },
  sumDot: { width: 10, height: 10, borderRadius: 5 },
  sumLabel: { fontSize: 12, color: '#71717a', fontWeight: '600' },
  sumValue: { fontSize: 22, fontWeight: '800', color: '#09090b', letterSpacing: -0.5 },
  chartCard: { marginTop: 18, padding: 18, borderRadius: 20, backgroundColor: '#fafafa' },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#09090b', marginBottom: 14 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 180 },
  col: { alignItems: 'center', flex: 1, gap: 4 },
  colVal: { fontSize: 10, color: '#71717a', fontWeight: '600', height: 14 },
  bar: { width: 22, borderRadius: 6 },
  colLabel: { fontSize: 11, color: '#a1a1aa', fontWeight: '600', marginTop: 4 },
});
