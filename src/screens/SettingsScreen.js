import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Switch, Alert, TextInput, ActivityIndicator, Modal, Linking,
} from 'react-native';
import { colors, shadow, radius } from '../utils/theme';
import { clearAllData, DEFAULT_EVENTS, saveEvents, saveNextId } from '../utils/storage';
import { cancelAllNotifications } from '../utils/notifications';
import { useAuth } from '../utils/authContext';

export default function SettingsScreen() {
  const { user, linkEmail, loginEmail, logout } = useAuth();
  const [escalating, setEscalating]       = useState(true);
  const [sound, setSound]                 = useState(true);
  const [haptics, setHaptics]             = useState(true);
  const [encouragement, setEncouragement] = useState(true);

  // メール連携モーダル
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [authLoading, setAuthLoading]   = useState(false);
  const [isLogin, setIsLogin]           = useState(false); // true=ログイン, false=新規連携

  const isAnonymous = user?.isAnonymous ?? true;

  const handleReset = () => {
    Alert.alert('リセット確認', 'すべての予定を削除してリセットします。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'リセット', style: 'destructive', onPress: async () => {
          await clearAllData();
          await cancelAllNotifications();
          await saveEvents(DEFAULT_EVENTS.map(e => ({ ...e })));
          await saveNextId(10);
          Alert.alert('✅ リセット完了', 'サンプルデータに戻しました。');
        }
      },
    ]);
  };

  const handleLinkEmail = async () => {
    if (!email || !password) {
      Alert.alert('入力エラー', 'メールアドレスとパスワードを入力してください。');
      return;
    }
    setAuthLoading(true);
    try {
      if (isLogin) {
        await loginEmail(email, password);
      } else {
        await linkEmail(email, password);
      }
      setModalVisible(false);
      setEmail('');
      setPassword('');
      Alert.alert('✅ 完了', isLogin ? 'ログインしました。' : 'アカウントを作成しました。\nこのデバイスのデータが引き続き同期されます。');
    } catch (e) {
      const msg = e.code === 'auth/email-already-in-use'
        ? 'このメールはすでに使われています。「ログイン」タブに切り替えてください。'
        : e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found'
        ? 'メールアドレスまたはパスワードが違います。'
        : e.code === 'auth/weak-password'
        ? 'パスワードは6文字以上にしてください。'
        : e.message;
      Alert.alert('エラー', msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('ログアウト', 'ログアウトすると、このデバイスでは匿名モードになります。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: logout },
    ]);
  };

  const Row = ({ icon, bg, label, right }) => (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: bg }]}><Text>{icon}</Text></View>
      <Text style={styles.rowLabel}>{label}</Text>
      {right}
    </View>
  );

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Text style={styles.appName}>設定</Text>
        </View>

        {/* クラウド同期 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>クラウド同期</Text>
          <View style={styles.card}>
            <Row
              icon="☁️" bg="#E3F2FD"
              label="同期状態"
              right={
                <Text style={{ fontSize: 12, fontWeight: '700', color: isAnonymous ? colors.textMuted : colors.success }}>
                  {isAnonymous ? '匿名モード' : '同期中'}
                </Text>
              }
            />
            <View style={styles.divider} />
            {isAnonymous ? (
              <TouchableOpacity onPress={() => { setIsLogin(false); setModalVisible(true); }}>
                <Row
                  icon="🔗" bg="#EDE9FF"
                  label="アカウントを作成して複数端末で同期"
                  right={<Text style={styles.chevron}>›</Text>}
                />
              </TouchableOpacity>
            ) : (
              <>
                <Row
                  icon="👤" bg="#E8F5E9"
                  label={user?.email ?? ''}
                  right={null}
                />
                <View style={styles.divider} />
                <TouchableOpacity onPress={handleLogout}>
                  <Row
                    icon="🚪" bg="#FFEBEE"
                    label="ログアウト"
                    right={<Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>ログアウト</Text>}
                  />
                </TouchableOpacity>
              </>
            )}
            {isAnonymous && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity onPress={() => { setIsLogin(true); setModalVisible(true); }}>
                  <Row
                    icon="🔑" bg="#FFF8E6"
                    label="すでにアカウントをお持ちの方"
                    right={<Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>ログイン</Text>}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={styles.hint}>
            匿名モードでも自動でクラウドに保存されます。{'\n'}
            アカウントを作ると複数の端末で同じスケジュールが使えます。
          </Text>
        </View>

        {/* 通知 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>通知</Text>
          <View style={styles.card}>
            <Row icon="⏰" bg="#FFF8E6" label="段階的な通知"
              right={<Switch value={escalating} onValueChange={setEscalating} trackColor={{ true: colors.primary }} />} />
            <View style={styles.divider} />
            <Row icon="🔊" bg="#E8F5E9" label="完了音を鳴らす"
              right={<Switch value={sound} onValueChange={setSound} trackColor={{ true: colors.primary }} />} />
            <View style={styles.divider} />
            <Row icon="📳" bg="#EDE9FF" label="バイブレーション"
              right={<Switch value={haptics} onValueChange={setHaptics} trackColor={{ true: colors.primary }} />} />
          </View>
        </View>

        {/* 表示 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>表示</Text>
          <View style={styles.card}>
            <Row icon="✨" bg="#FFF8E6" label="励ましメッセージ"
              right={<Switch value={encouragement} onValueChange={setEncouragement} trackColor={{ true: colors.primary }} />} />
          </View>
        </View>

        {/* データ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>データ</Text>
          <View style={styles.card}>
            <Row icon="💾" bg="#EDE9FF" label="自動保存"
              right={<Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>オン</Text>} />
            <View style={styles.divider} />
            <TouchableOpacity onPress={handleReset}>
              <Row icon="🗑️" bg="#FFEBEE" label="データをリセット"
                right={<Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>リセット</Text>} />
            </TouchableOpacity>
          </View>
        </View>

        {/* アプリ情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>アプリについて</Text>
          <View style={styles.card}>
            <Row icon="📱" bg="#EDE9FF" label="バージョン" right={<Text style={styles.meta}>1.0.0</Text>} />
            <View style={styles.divider} />
            <TouchableOpacity onPress={() => Linking.openURL('https://shoheiangler-web.github.io/yasashii-schedule-web/privacy-policy.html')}>
              <Row icon="📄" bg="#F5F5F5" label="プライバシーポリシー" right={<Text style={styles.chevron}>›</Text>} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* メール連携モーダル */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {isLogin ? 'ログイン' : 'アカウントを作成'}
            </Text>
            <Text style={styles.modalSub}>
              {isLogin
                ? '既存のアカウントでログインします'
                : 'メールアドレスとパスワードで\n複数デバイス間の同期が可能になります'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="メールアドレス"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={styles.input}
              placeholder="パスワード（6文字以上）"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.authBtn, authLoading && { opacity: 0.6 }]}
              onPress={handleLinkEmail}
              disabled={authLoading}
            >
              {authLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.authBtnText}>{isLogin ? 'ログイン' : 'アカウントを作成'}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 12 }}>
              <Text style={{ color: colors.primary, fontSize: 13, textAlign: 'center' }}>
                {isLogin ? 'アカウントをお持ちでない方はこちら' : 'すでにアカウントをお持ちの方'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginTop: 16 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  header:       { backgroundColor: colors.card, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  appName:      { fontSize: 20, fontWeight: '800', color: colors.text },
  section:      { padding: 16, paddingBottom: 0 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  card:         { ...shadow, backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  row:          { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  icon:         { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel:     { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  divider:      { height: 1, backgroundColor: colors.border, marginLeft: 60 },
  meta:         { fontSize: 13, color: colors.textMuted },
  chevron:      { fontSize: 20, color: colors.textMuted },
  hint:         { fontSize: 12, color: colors.textMuted, marginTop: 8, marginHorizontal: 4, lineHeight: 18 },

  // モーダル
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  modalTitle:   { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 6 },
  modalSub:     { fontSize: 13, color: colors.textMuted, marginBottom: 20, lineHeight: 20 },
  input:        { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, fontSize: 14, color: colors.text, marginBottom: 12 },
  authBtn:      { backgroundColor: colors.primary, borderRadius: radius.full, padding: 14, alignItems: 'center', marginTop: 4 },
  authBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});
