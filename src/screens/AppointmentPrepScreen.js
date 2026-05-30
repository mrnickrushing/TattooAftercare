import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TAB_BAR_HEIGHT } from '../constants/theme';
import TattooBackground from '../components/TattooBackground';
import ScreenHero from '../components/ScreenHero';

const STORAGE_KEY = 'appointment_prep_v1';
const TASKS = ['Eat before the session', 'Bring water', 'Charge phone', 'Wear easy clothing', 'Save reference photos', 'Confirm artist and shop time'];

export default function AppointmentPrepScreen() {
  const insets = useSafeAreaInsets();
  const [artist, setArtist] = useState('');
  const [shop, setShop] = useState('');
  const [date, setDate] = useState('');
  const [deposit, setDeposit] = useState('');
  const [done, setDone] = useState({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        setArtist(saved.artist || '');
        setShop(saved.shop || '');
        setDate(saved.date || '');
        setDeposit(saved.deposit || '');
        setDone(saved.done || {});
      } catch {}
    });
  }, []);

  const completed = Object.values(done).filter(Boolean).length;
  const save = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ artist, shop, date, deposit, done }));
    Alert.alert('Saved', 'Appointment prep saved.');
  };

  return (
    <TattooBackground style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + SPACING.xxxl }]} showsVerticalScrollIndicator={false}>
        <ScreenHero
          eyebrow="Appointment prep"
          title="Get ready before the session."
          subtitle="Store the basics and check off what you need before your appointment."
          icon="calendar"
          stats={[{ label: 'Tasks', value: `${completed}/${TASKS.length}` }, { label: 'Artist', value: artist ? 'Set' : 'Open' }, { label: 'Date', value: date ? 'Set' : 'Open' }]}
        />

        <View style={styles.card}>
          <Field label="Artist" value={artist} onChangeText={setArtist} placeholder="Artist name" />
          <Field label="Shop" value={shop} onChangeText={setShop} placeholder="Shop name" />
          <Field label="Date and time" value={date} onChangeText={setDate} placeholder="Example: June 12 at 2 PM" />
          <Field label="Deposit" value={deposit} onChangeText={setDeposit} placeholder="Example: $100" />
        </View>

        {TASKS.map((task) => (
          <TouchableOpacity key={task} style={[styles.taskRow, done[task] && styles.taskRowDone]} onPress={() => setDone((prev) => ({ ...prev, [task]: !prev[task] }))} activeOpacity={0.82}>
            <View style={[styles.check, done[task] && styles.checkDone]}>{done[task] ? <Feather name="check" size={15} color={COLORS.textInverse} /> : null}</View>
            <Text style={styles.taskText}>{task}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
          <Text style={styles.saveText}>Save Prep</Text>
        </TouchableOpacity>
      </ScrollView>
    </TattooBackground>
  );
}

function Field({ label, value, onChangeText, placeholder }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COLORS.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg },
  card: { backgroundColor: 'rgba(42,26,18,0.96)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, padding: SPACING.lg, marginBottom: SPACING.lg, ...SHADOWS.card },
  field: { marginBottom: SPACING.md },
  label: { color: COLORS.textMuted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: SPACING.xs },
  input: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary, fontSize: 14, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: 'rgba(42,26,18,0.96)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, padding: SPACING.lg, marginBottom: SPACING.sm, ...SHADOWS.card },
  taskRowDone: { backgroundColor: COLORS.accentMuted, borderColor: COLORS.accentBorder },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: COLORS.borderGold, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  taskText: { flex: 1, color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  saveBtn: { marginTop: SPACING.lg, backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingVertical: SPACING.lg, alignItems: 'center', ...SHADOWS.gold },
  saveText: { color: COLORS.textInverse, fontSize: 15, fontWeight: '900' },
});
