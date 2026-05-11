import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../src/AuthContext';

export default function Login() {
  const { login, register, loginWithGoogleSessionId } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!email || !password || (mode === 'signup' && !name)) {
      Alert.alert('Missing info', 'Please fill out all fields.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(email.trim(), password, name.trim());
    } catch (e: any) {
      Alert.alert('Oops', e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      const redirectUrl = Platform.OS === 'web'
        ? (process.env.EXPO_PUBLIC_BACKEND_URL || '') + '/'
        : Linking.createURL('/');
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type === 'success' && result.url) {
        // parse session_id from hash or query
        const url = result.url;
        const hashIdx = url.indexOf('#');
        let sessionId: string | null = null;
        if (hashIdx >= 0) {
          const hash = url.substring(hashIdx + 1);
          const params = new URLSearchParams(hash);
          sessionId = params.get('session_id');
        }
        if (!sessionId) {
          try {
            const u = new URL(url);
            sessionId = u.searchParams.get('session_id');
          } catch {}
        }
        if (sessionId) {
          await loginWithGoogleSessionId(sessionId);
        } else {
          Alert.alert('Google login', 'Could not get session id.');
        }
      }
    } catch (e: any) {
      Alert.alert('Google login failed', e.message || 'Try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1663059628009-34f4bb9fb906?crop=entropy&cs=srgb&fm=jpg&w=900&q=80' }}
        style={styles.hero}
      />
      <SafeAreaView style={styles.card} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.cardInner} keyboardShouldPersistTaps="handled">
            <View style={styles.brandRow}>
              <View style={styles.logoDot} />
              <Text style={styles.brand}>Pulse</Text>
            </View>
            <Text style={styles.title}>{mode === 'login' ? 'Welcome back' : 'Create account'}</Text>
            <Text style={styles.subtitle}>
              {mode === 'login' ? 'Sign in to track your workouts' : 'Start your fitness journey today'}
            </Text>

            <TouchableOpacity
              testID="google-login-button"
              style={styles.googleBtn}
              onPress={onGoogle}
              disabled={busy}
            >
              <Ionicons name="logo-google" size={20} color="#09090b" />
              <Text style={styles.googleText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            {mode === 'signup' && (
              <TextInput
                testID="signup-name-input"
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#a1a1aa"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}
            <TextInput
              testID="auth-email-input"
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#a1a1aa"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              testID="auth-password-input"
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#a1a1aa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              testID="auth-submit-button"
              style={styles.primaryBtn}
              onPress={onSubmit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>
                  {mode === 'login' ? 'Sign in' : 'Sign up'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="toggle-auth-mode"
              style={styles.toggle}
              onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              <Text style={styles.toggleText}>
                {mode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09090b' },
  hero: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', width: '100%' },
  card: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    top: '38%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  cardInner: { padding: 28, paddingTop: 32, paddingBottom: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  logoDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#09090b' },
  brand: { fontSize: 18, fontWeight: '700', color: '#09090b', letterSpacing: -0.3 },
  title: { fontSize: 30, fontWeight: '800', color: '#09090b', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#71717a', marginTop: 6, marginBottom: 24 },
  googleBtn: {
    height: 54, borderRadius: 27, backgroundColor: '#f4f4f5',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  googleText: { fontSize: 16, fontWeight: '600', color: '#09090b' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
  divider: { flex: 1, height: 1, backgroundColor: '#e4e4e7' },
  dividerText: { color: '#a1a1aa', fontSize: 13 },
  input: {
    height: 54, borderRadius: 16, backgroundColor: '#fafafa',
    borderWidth: 1, borderColor: '#e4e4e7',
    paddingHorizontal: 18, fontSize: 16, color: '#09090b', marginBottom: 12,
  },
  primaryBtn: {
    height: 54, borderRadius: 27, backgroundColor: '#09090b',
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  toggle: { marginTop: 18, alignItems: 'center' },
  toggleText: { color: '#71717a', fontSize: 14 },
});
