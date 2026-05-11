import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../src/AuthContext';

type Meal = {
  meal_id: string; name: string; meal_type: string;
  calories: number; protein: number; carbs: number; fats: number;
};

const CAL_GOAL = 2000;
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export default function Nutrition() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [mtype, setMtype] = useState<typeof MEAL_TYPES[number]>('breakfast');
  const [name, setName] = useState('');
  const [cal, setCal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setMeals(await apiFetch('/meals/today')); }
    catch (e: any) { console.warn(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = meals.reduce((s, m) => s + m.calories, 0);
  const macros = meals.reduce(
    (a, m) => ({ p: a.p + m.protein, c: a.c + m.carbs, f: a.f + m.fats }),
    { p: 0, c: 0, f: 0 }
  );
  const progress = Math.min(1, total / CAL_GOAL);

  const submit = async () => {
    if (!name.trim() || !cal) { Alert.alert('Missing', 'Add a name and calories'); return; }
    try {
      await apiFetch('/meals', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          meal_type: mtype,
          calories: parseInt(cal) || 0,
          protein: parseFloat(protein) || 0,
          carbs: parseFloat(carbs) || 0,
          fats: parseFloat(fats) || 0,
        }),
      });
      setName(''); setCal(''); setProtein(''); setCarbs(''); setFats('');
      setShowAdd(false);
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const remove = async (id: string) => {
    try { await apiFetch(`/meals/${id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>TODAY</Text>
            <Text style={styles.title}>Nutrition</Text>
          </View>
          <TouchableOpacity testID="open-meal-form" style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.calCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Text testID="total-calories" style={styles.calVal}>{total}</Text>
            <Text style={styles.calGoal}>/ {CAL_GOAL} kcal</Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.macroRow}>
            <Macro label="Protein" value={`${macros.p.toFixed(0)}g`} color="#3b82f6" />
            <Macro label="Carbs" value={`${macros.c.toFixed(0)}g`} color="#10b981" />
            <Macro label="Fats" value={`${macros.f.toFixed(0)}g`} color="#fb7185" />
          </View>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color="#09090b" /></View>
        ) : (
          <View style={{ paddingHorizontal: 24 }}>
            {MEAL_TYPES.map(type => {
              const items = meals.filter(m => m.meal_type === type);
              return (
                <View key={type} style={styles.sectionWrap}>
                  <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>{type[0].toUpperCase() + type.slice(1)}</Text>
                    <Text style={styles.sectionSum}>
                      {items.reduce((s, m) => s + m.calories, 0)} kcal
                    </Text>
                  </View>
                  {items.length === 0 ? (
                    <Text style={styles.emptyLine}>Nothing logged</Text>
                  ) : items.map(m => (
                    <TouchableOpacity
                      key={m.meal_id}
                      testID={`meal-${m.meal_id}`}
                      onLongPress={() => Alert.alert('Delete?', m.name, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => remove(m.meal_id) },
                      ])}
                      style={styles.mealRow}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mealName}>{m.name}</Text>
                        <Text style={styles.mealSub}>
                          P {m.protein.toFixed(0)} · C {m.carbs.toFixed(0)} · F {m.fats.toFixed(0)}
                        </Text>
                      </View>
                      <Text style={styles.mealCal}>{m.calories}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          <View style={styles.modalHead}>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Ionicons name="close" size={26} color="#09090b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add meal</Text>
            <TouchableOpacity testID="save-meal" onPress={submit}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
              <View style={styles.typeRow}>
                {MEAL_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setMtype(t)}
                    style={[styles.typeChip, mtype === t && styles.typeChipActive]}
                  >
                    <Text style={[styles.typeText, mtype === t && styles.typeTextActive]}>
                      {t[0].toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput testID="meal-name-input" style={styles.input} placeholder="Food name" placeholderTextColor="#a1a1aa" value={name} onChangeText={setName} />
              <TextInput testID="meal-cal-input" style={styles.input} placeholder="Calories" placeholderTextColor="#a1a1aa" keyboardType="numeric" value={cal} onChangeText={setCal} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Protein (g)" placeholderTextColor="#a1a1aa" keyboardType="numeric" value={protein} onChangeText={setProtein} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Carbs (g)" placeholderTextColor="#a1a1aa" keyboardType="numeric" value={carbs} onChangeText={setCarbs} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Fats (g)" placeholderTextColor="#a1a1aa" keyboardType="numeric" value={fats} onChangeText={setFats} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Macro({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroVal}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 24, paddingBottom: 16 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: '#a1a1aa' },
  title: { fontSize: 32, fontWeight: '800', color: '#09090b', letterSpacing: -0.5 },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' },
  calCard: { marginHorizontal: 24, padding: 20, borderRadius: 24, backgroundColor: '#fafafa' },
  calVal: { fontSize: 40, fontWeight: '800', color: '#09090b', letterSpacing: -1 },
  calGoal: { color: '#71717a', fontSize: 14, marginBottom: 6 },
  bar: { height: 8, backgroundColor: '#e4e4e7', borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 4 },
  macroRow: { flexDirection: 'row', marginTop: 18 },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  macroVal: { fontSize: 16, fontWeight: '700', color: '#09090b' },
  macroLabel: { fontSize: 11, color: '#71717a', marginTop: 2 },
  center: { padding: 40, alignItems: 'center' },
  sectionWrap: { marginTop: 22 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#09090b' },
  sectionSum: { color: '#71717a', fontSize: 13, fontWeight: '600' },
  emptyLine: { color: '#a1a1aa', fontSize: 13, fontStyle: 'italic' },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  mealName: { fontSize: 15, color: '#09090b', fontWeight: '600' },
  mealSub: { fontSize: 12, color: '#a1a1aa', marginTop: 2 },
  mealCal: { fontSize: 15, fontWeight: '700', color: '#09090b' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#09090b' },
  saveText: { color: '#09090b', fontWeight: '700', fontSize: 15 },
  input: { height: 52, borderRadius: 14, backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#e4e4e7', paddingHorizontal: 16, fontSize: 15, color: '#09090b', marginBottom: 10 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#f4f4f5' },
  typeChipActive: { backgroundColor: '#09090b' },
  typeText: { color: '#52525b', fontWeight: '600', fontSize: 13 },
  typeTextActive: { color: '#fff' },
});
