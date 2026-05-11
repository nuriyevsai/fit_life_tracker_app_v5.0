import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useAuth, apiFetch } from '../../src/AuthContext';

type Activity = {
  date: string;
  steps: number;
  calories_burned: number;
  active_minutes: number;
  water_ml: number;
  distance_km: number;
};

const STEP_GOAL = 10000;

function ProgressRing({ progress, size = 200 }: { progress: number; size?: number }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="#f4f4f5" strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#10b981"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={c - p * c}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [stepInput, setStepInput] = useState('');
  const [waterInput, setWaterInput] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/activity/today');
      setActivity(data);
    } catch (e: any) {
      console.warn('Failed loading activity', e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const incrementSteps = async (delta: number) => {
    try {
      const data = await apiFetch('/activity/increment', {
        method: 'POST',
        body: JSON.stringify({ steps: delta }),
      });
      setActivity(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const submitManual = async () => {
    const s = parseInt(stepInput) || 0;
    const w = parseInt(waterInput) || 0;
    if (!s && !w) return setShowAdd(false);
    try {
      const data = await apiFetch('/activity/increment', {
        method: 'POST',
        body: JSON.stringify({ steps: s, water_ml: w }),
      });
      setActivity(data);
      setStepInput('');
      setWaterInput('');
      setShowAdd(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const steps = activity?.steps || 0;
  const progress = steps / STEP_GOAL;
  const firstName = user?.name?.split(' ')[0] || 'there';
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text testID="dashboard-username" style={styles.name}>{firstName}</Text>
          </View>
          <TouchableOpacity testID="logout-button" style={styles.avatar} onPress={() => {
            Alert.alert('Log out?', 'You will need to sign in again.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log out', style: 'destructive', onPress: () => logout() },
            ]);
          }}>
            <Text style={styles.avatarText}>{(user?.name?.[0] || 'U').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ringWrap}>
          <ProgressRing progress={progress} />
          <View style={styles.ringCenter} pointerEvents="none">
            <Text style={styles.ringValue}>{steps.toLocaleString()}</Text>
            <Text style={styles.ringLabel}>STEPS</Text>
            <Text style={styles.ringGoal}>of {STEP_GOAL.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.quickRow}>
          <TouchableOpacity testID="quick-add-steps" style={styles.chip} onPress={() => incrementSteps(1000)}>
            <Ionicons name="add" size={16} color="#09090b" />
            <Text style={styles.chipText}>1,000 steps</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="open-manual-log" style={styles.chip} onPress={() => setShowAdd(true)}>
            <Ionicons name="pencil-outline" size={16} color="#09090b" />
            <Text style={styles.chipText}>Log manually</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          <Stat
            color="#fb7185"
            bg="#fff1f2"
            icon="flame-outline"
            label="Calories"
            value={`${activity?.calories_burned || 0}`}
            unit="kcal"
            testID="stat-calories"
          />
          <Stat
            color="#3b82f6"
            bg="#eff6ff"
            icon="timer-outline"
            label="Active min"
            value={`${activity?.active_minutes || 0}`}
            unit="min"
            testID="stat-active"
          />
          <Stat
            color="#06b6d4"
            bg="#ecfeff"
            icon="water-outline"
            label="Water"
            value={`${activity?.water_ml || 0}`}
            unit="ml"
            testID="stat-water"
          />
          <Stat
            color="#a855f7"
            bg="#faf5ff"
            icon="walk-outline"
            label="Distance"
            value={`${(activity?.distance_km || 0).toFixed(1)}`}
            unit="km"
            testID="stat-distance"
          />
        </View>
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log activity</Text>
            <TextInput
              testID="manual-steps-input"
              style={styles.modalInput}
              placeholder="Steps to add"
              placeholderTextColor="#a1a1aa"
              value={stepInput}
              onChangeText={setStepInput}
              keyboardType="numeric"
            />
            <TextInput
              testID="manual-water-input"
              style={styles.modalInput}
              placeholder="Water (ml)"
              placeholderTextColor="#a1a1aa"
              value={waterInput}
              onChangeText={setWaterInput}
              keyboardType="numeric"
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setShowAdd(false)}>
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="manual-log-submit" style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={submitManual}>
                <Text style={styles.modalBtnPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ color, bg, icon, label, value, unit, testID }: any) {
  return (
    <View testID={testID} style={[styles.statCard, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.statLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  greeting: { fontSize: 14, color: '#71717a' },
  name: { fontSize: 28, fontWeight: '800', color: '#09090b', letterSpacing: -0.5 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#09090b',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ringWrap: { alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringValue: { fontSize: 40, fontWeight: '800', color: '#09090b', letterSpacing: -1 },
  ringLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: '#a1a1aa', marginTop: 2 },
  ringGoal: { fontSize: 13, color: '#71717a', marginTop: 4 },
  quickRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginVertical: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#f4f4f5', borderRadius: 999,
  },
  chipText: { color: '#09090b', fontWeight: '600', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  statCard: {
    flexGrow: 1, flexBasis: '46%',
    borderRadius: 20, padding: 16, gap: 6, minHeight: 100,
  },
  statLabel: { fontSize: 12, color: '#52525b', fontWeight: '600' },
  statValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statUnit: { fontSize: 12, color: '#71717a' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#09090b', marginBottom: 16 },
  modalInput: {
    height: 52, borderRadius: 14, backgroundColor: '#fafafa',
    borderWidth: 1, borderColor: '#e4e4e7',
    paddingHorizontal: 16, fontSize: 16, color: '#09090b', marginBottom: 10,
  },
  modalBtn: { flex: 1, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  modalBtnGhost: { backgroundColor: '#f4f4f5' },
  modalBtnGhostText: { color: '#09090b', fontWeight: '600' },
  modalBtnPrimary: { backgroundColor: '#09090b' },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '700' },
});
