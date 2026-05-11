import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../src/AuthContext';

type ESet = { reps: string; weight: string };
type EDraft = { name: string; sets: ESet[] };
type Workout = {
  workout_id: string;
  name: string;
  exercises: { name: string; sets: { reps: number; weight: number }[] }[];
  duration_minutes: number;
  calories_burned: number;
  date: string;
};

export default function Workouts() {
  const [list, setList] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [exercises, setExercises] = useState<EDraft[]>([{ name: '', sets: [{ reps: '', weight: '' }] }]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/workouts');
      setList(data);
    } catch (e: any) {
      console.warn(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setName(''); setDuration(''); setCalories('');
    setExercises([{ name: '', sets: [{ reps: '', weight: '' }] }]);
  };

  const addExercise = () =>
    setExercises([...exercises, { name: '', sets: [{ reps: '', weight: '' }] }]);

  const addSet = (i: number) => {
    const next = [...exercises];
    next[i].sets.push({ reps: '', weight: '' });
    setExercises(next);
  };

  const updateExerciseName = (i: number, v: string) => {
    const next = [...exercises]; next[i].name = v; setExercises(next);
  };

  const updateSet = (i: number, j: number, key: 'reps' | 'weight', v: string) => {
    const next = [...exercises]; next[i].sets[j][key] = v; setExercises(next);
  };

  const submit = async () => {
    if (!name.trim()) { Alert.alert('Missing', 'Add a workout name'); return; }
    const cleaned = exercises
      .filter(e => e.name.trim())
      .map(e => ({
        name: e.name.trim(),
        sets: e.sets
          .filter(s => s.reps)
          .map(s => ({ reps: parseInt(s.reps) || 0, weight: parseFloat(s.weight) || 0 })),
      }))
      .filter(e => e.sets.length > 0);
    if (cleaned.length === 0) { Alert.alert('Missing', 'Add at least one exercise with sets'); return; }
    try {
      await apiFetch('/workouts', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          exercises: cleaned,
          duration_minutes: parseInt(duration) || 0,
          calories_burned: parseInt(calories) || 0,
          notes: '',
        }),
      });
      reset();
      setShowForm(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const remove = async (id: string) => {
    Alert.alert('Delete workout?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await apiFetch(`/workouts/${id}`, { method: 'DELETE' }); load(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>YOUR LIFTS</Text>
          <Text style={styles.title}>Workouts</Text>
        </View>
        <TouchableOpacity testID="open-workout-form" style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#09090b" /></View>
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="barbell-outline" size={48} color="#d4d4d8" />
          <Text style={styles.emptyTitle}>No workouts yet</Text>
          <Text style={styles.emptySub}>Tap the + button to log your first workout.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 8, paddingBottom: 60 }}>
          {list.map(w => (
            <TouchableOpacity
              key={w.workout_id}
              testID={`workout-item-${w.workout_id}`}
              onLongPress={() => remove(w.workout_id)}
              activeOpacity={0.7}
              style={styles.wCard}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wName}>{w.name}</Text>
                  <Text style={styles.wMeta}>
                    {w.exercises.length} exercise{w.exercises.length === 1 ? '' : 's'}
                    {w.duration_minutes ? ` · ${w.duration_minutes} min` : ''}
                    {w.calories_burned ? ` · ${w.calories_burned} kcal` : ''}
                  </Text>
                </View>
                <Text style={styles.wDate}>{w.date.slice(5)}</Text>
              </View>
              {w.exercises.slice(0, 3).map((e, i) => (
                <Text key={i} style={styles.wExer}>
                  · {e.name}  <Text style={styles.wSets}>
                    {e.sets.map(s => `${s.reps}×${s.weight || 0}`).join(', ')}
                  </Text>
                </Text>
              ))}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          <View style={styles.modalHead}>
            <TouchableOpacity onPress={() => { setShowForm(false); reset(); }}>
              <Ionicons name="close" size={26} color="#09090b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New workout</Text>
            <TouchableOpacity testID="save-workout-button" onPress={submit}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              <TextInput
                testID="workout-name-input"
                style={styles.input}
                placeholder="Workout name (e.g. Push day)"
                placeholderTextColor="#a1a1aa"
                value={name} onChangeText={setName}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Duration (min)"
                  placeholderTextColor="#a1a1aa"
                  keyboardType="numeric" value={duration} onChangeText={setDuration}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Calories"
                  placeholderTextColor="#a1a1aa"
                  keyboardType="numeric" value={calories} onChangeText={setCalories}
                />
              </View>
              <Text style={styles.section}>Exercises</Text>
              {exercises.map((ex, i) => (
                <View key={i} style={styles.exBox}>
                  <TextInput
                    testID={`exercise-name-${i}`}
                    style={styles.exName}
                    placeholder={`Exercise ${i + 1}`}
                    placeholderTextColor="#a1a1aa"
                    value={ex.name} onChangeText={v => updateExerciseName(i, v)}
                  />
                  {ex.sets.map((s, j) => (
                    <View key={j} style={styles.setRow}>
                      <Text style={styles.setLabel}>Set {j + 1}</Text>
                      <TextInput
                        style={styles.setInput}
                        placeholder="Reps"
                        placeholderTextColor="#a1a1aa"
                        keyboardType="numeric" value={s.reps}
                        onChangeText={v => updateSet(i, j, 'reps', v)}
                      />
                      <TextInput
                        style={styles.setInput}
                        placeholder="Weight"
                        placeholderTextColor="#a1a1aa"
                        keyboardType="numeric" value={s.weight}
                        onChangeText={v => updateSet(i, j, 'weight', v)}
                      />
                    </View>
                  ))}
                  <TouchableOpacity onPress={() => addSet(i)}>
                    <Text style={styles.addLine}>+ Add set</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity testID="add-exercise" style={styles.addExBtn} onPress={addExercise}>
                <Ionicons name="add" size={18} color="#09090b" />
                <Text style={styles.addExText}>Add exercise</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 24, paddingBottom: 16 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: '#a1a1aa' },
  title: { fontSize: 32, fontWeight: '800', color: '#09090b', letterSpacing: -0.5 },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#09090b', marginTop: 12 },
  emptySub: { color: '#71717a', textAlign: 'center' },
  wCard: { padding: 18, borderRadius: 20, backgroundColor: '#fafafa', marginBottom: 12, gap: 6 },
  wName: { fontSize: 17, fontWeight: '700', color: '#09090b' },
  wMeta: { fontSize: 13, color: '#71717a', marginTop: 2 },
  wDate: { fontSize: 12, color: '#a1a1aa', fontWeight: '600' },
  wExer: { fontSize: 13, color: '#52525b', marginTop: 2 },
  wSets: { color: '#a1a1aa', fontSize: 12 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#09090b' },
  saveText: { color: '#09090b', fontWeight: '700', fontSize: 15 },
  input: { height: 52, borderRadius: 14, backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#e4e4e7', paddingHorizontal: 16, fontSize: 15, color: '#09090b', marginBottom: 10 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: '#a1a1aa', marginTop: 16, marginBottom: 10 },
  exBox: { backgroundColor: '#fafafa', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#f4f4f5' },
  exName: { fontSize: 16, fontWeight: '700', color: '#09090b', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e4e4e7', marginBottom: 8 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  setLabel: { width: 50, fontSize: 13, color: '#71717a', fontWeight: '600' },
  setInput: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#e4e4e7', paddingHorizontal: 12, backgroundColor: '#fff', color: '#09090b' },
  addLine: { color: '#3b82f6', fontWeight: '600', marginTop: 6, fontSize: 13 },
  addExBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#e4e4e7', backgroundColor: '#fff' },
  addExText: { color: '#09090b', fontWeight: '600' },
});
