import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../src/AuthContext';

type Msg = { role: 'user' | 'ai'; text: string };

const AVATAR = 'https://static.prod-images.emergentagent.com/jobs/bee8dd31-65f1-460c-914f-3450967977f1/images/e90276d51aff3df735d760c59c3dfdcb842218f938e13f7a84e5c22d59d6e014.png';

const SUGGESTIONS = [
  'Suggest a 30-min full body workout',
  'How can I improve my squat form?',
  'Best meal after lifting?',
  'Plan my week for fat loss',
];

export default function Coach() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await apiFetch('/coach/history');
      const msgs: Msg[] = [];
      data.messages.forEach((m: any) => {
        msgs.push({ role: 'user', text: m.user_message });
        msgs.push({ role: 'ai', text: m.ai_reply });
      });
      setMessages(msgs);
    } catch (e: any) { console.warn(e.message); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setSending(true);
    try {
      const res = await apiFetch('/coach/chat', {
        method: 'POST',
        body: JSON.stringify({ message: msg }),
      });
      setMessages(prev => [...prev, { role: 'ai', text: res.reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'ai', text: `Error: ${e.message}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Image source={{ uri: AVATAR }} style={styles.avatar} />
        <View>
          <Text style={styles.title}>AI Coach</Text>
          <Text style={styles.subtitle}>Powered by Claude</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.chatBody}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={styles.welcome}>
              <Image source={{ uri: AVATAR }} style={styles.welcomeAvatar} />
              <Text style={styles.welcomeTitle}>Hey there 👋</Text>
              <Text style={styles.welcomeText}>
                Ask me anything about workouts, recovery or nutrition. I know your stats today.
              </Text>
              <View style={styles.sugWrap}>
                {SUGGESTIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    testID={`suggestion-${s.slice(0, 10)}`}
                    style={styles.sug}
                    onPress={() => send(s)}
                  >
                    <Text style={styles.sugText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) => (
            <View
              key={i}
              testID={`msg-${i}`}
              style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}
            >
              <Text style={[styles.bubbleText, m.role === 'user' ? styles.userText : styles.aiText]}>
                {m.text}
              </Text>
            </View>
          ))}
          {sending && (
            <View style={[styles.bubble, styles.aiBubble]}>
              <ActivityIndicator color="#09090b" />
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            testID="coach-input"
            style={styles.input}
            placeholder="Ask your coach..."
            placeholderTextColor="#a1a1aa"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send()}
            multiline
          />
          <TouchableOpacity
            testID="coach-send"
            style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
            onPress={() => send()}
            disabled={!input.trim() || sending}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eef2ff' },
  title: { fontSize: 18, fontWeight: '700', color: '#09090b' },
  subtitle: { fontSize: 12, color: '#71717a' },
  chatBody: { padding: 16, gap: 8 },
  welcome: { alignItems: 'center', padding: 24, gap: 12 },
  welcomeAvatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#eef2ff' },
  welcomeTitle: { fontSize: 22, fontWeight: '800', color: '#09090b' },
  welcomeText: { fontSize: 14, color: '#71717a', textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  sugWrap: { width: '100%', gap: 8, marginTop: 12 },
  sug: { padding: 14, backgroundColor: '#fafafa', borderRadius: 14, borderWidth: 1, borderColor: '#f4f4f5' },
  sugText: { color: '#09090b', fontSize: 14, fontWeight: '500' },
  bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginVertical: 2 },
  userBubble: { backgroundColor: '#09090b', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#f4f4f5', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  userText: { color: '#fff' },
  aiText: { color: '#09090b' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f4f4f5', backgroundColor: '#fff' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: '#fafafa', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#09090b', borderWidth: 1, borderColor: '#e4e4e7' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' },
});
