import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PrimaryButton } from '../../components/PrimaryButton';
import { RootStackParamList } from '../../app/routes';
import { TextField } from '../../components/TextField';
import { exportBackupFile, importBackupFile } from '../../services/backupService';
import { useAuthStore } from '../../stores/authStore';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const signUp = useAuthStore((state) => state.signUp);
  const logout = useAuthStore((state) => state.logout);
  const hydrate = useAuthStore((state) => state.hydrate);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      hydrate();
    }, [hydrate])
  );

  const handleExport = async () => {
    try {
      const result = await exportBackupFile();
      Alert.alert('백업 완료', `${result.fileName} 파일을 공유 화면에서 저장해 주세요.`);
    } catch (error) {
      Alert.alert('백업 실패', '백업 파일 생성 중 오류가 발생했습니다.');
    }
  };

  const handleImport = async () => {
    try {
      const result = await importBackupFile();
      if (result.status === 'cancelled') {
        return;
      }

      await hydrate();
      Alert.alert(
        '복원 완료',
        `사용자 ${result.counts.users}건, 카테고리 ${result.counts.categories}건, 거래 ${result.counts.transactions}건을 반영했습니다.`
      );
    } catch (error) {
      Alert.alert('복원 실패', '지원되지 않는 백업 버전이거나 파일 형식이 올바르지 않습니다.');
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    try {
      await login(email.trim(), password);
      Alert.alert('로그인 완료', '설정에서 로그인되었습니다.');
    } catch (error) {
      Alert.alert('로그인 실패', '이메일 또는 비밀번호를 확인해 주세요.');
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !nickname.trim()) {
      Alert.alert('입력 오류', '이메일, 비밀번호, 닉네임을 입력해 주세요.');
      return;
    }

    try {
      await signUp(email.trim(), password, nickname.trim());
      Alert.alert('회원가입 완료', '설정에서 회원가입 후 로그인되었습니다.');
    } catch (error) {
      Alert.alert('회원가입 실패', '이미 존재하는 이메일이거나 입력값이 올바르지 않습니다.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>로그인</Text>
        <Text style={styles.statusText}>{isAuthenticated ? '현재 상태: 로그인됨' : '현재 상태: 비로그인(게스트)'}</Text>
        {isAuthenticated ? (
          <PrimaryButton title="로그아웃" onPress={logout} />
        ) : (
          <>
            <TextField
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="user@example.com"
              keyboardType="email-address"
            />
            <TextField
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              secureTextEntry
            />
            <TextField
              label="닉네임(회원가입용)"
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임"
            />
            <PrimaryButton title="로그인" onPress={handleLogin} />
            <PrimaryButton title="회원가입" onPress={handleSignUp} />
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>카테고리 관리</Text>
        <PrimaryButton
          title="지출 카테고리 관리"
          onPress={() => navigation.navigate('CategoryManagement', { filter: 'EXPENSE', title: '지출 카테고리 관리' })}
        />
        <PrimaryButton
          title="수입 카테고리 관리"
          onPress={() => navigation.navigate('CategoryManagement', { filter: 'INCOME', title: '수입 카테고리 관리' })}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>데이터 관리</Text>
        <PrimaryButton title="데이터 백업 파일 만들기" onPress={handleExport} />
        <PrimaryButton title="백업 파일 가져오기" onPress={handleImport} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 2,
  },
});
