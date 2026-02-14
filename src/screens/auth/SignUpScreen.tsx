import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { useAuthStore } from '../../stores/authStore';

export function SignUpScreen({ navigation }: { navigation: any }) {
  const signUp = useAuthStore((state) => state.signUp);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    try {
      setLoading(true);
      await signUp(email.trim(), password, nickname.trim());
    } catch (error) {
      Alert.alert('회원가입 실패', '입력값을 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입</Text>
      <TextField label="이메일" value={email} onChangeText={setEmail} placeholder="user@example.com" />
      <TextField label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry />
      <TextField label="닉네임" value={nickname} onChangeText={setNickname} />
      <PrimaryButton title={loading ? '가입 중...' : '가입'} onPress={handleSignUp} disabled={loading} />
      <View style={styles.linkRow}>
        <Text style={styles.link} onPress={() => navigation.goBack()}>
          로그인으로 돌아가기
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 24,
  },
  linkRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  link: {
    color: '#2563eb',
    fontWeight: '600',
  },
});
