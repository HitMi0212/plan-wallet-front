import React, { useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { LoadingOverlay } from '../../components/LoadingOverlay';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { useAuthStore } from '../../stores/authStore';
import { LoginForm, loginSchema } from '../../utils/authSchemas';

export function LoginScreen({ navigation }: { navigation: any }) {
  const login = useAuthStore((state) => state.login);
  const hydrate = useAuthStore((state) => state.hydrate);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleLogin = handleSubmit(async (values) => {
    try {
      await login(values.email.trim(), values.password);
    } catch (error) {
      Alert.alert('로그인 실패', '이메일 또는 비밀번호를 확인해 주세요.');
    }
  });

  if (!isHydrated) {
    return (
      <View style={styles.container}>
        <Text>초기화 중...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <Text style={styles.title}>plan-wallet</Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="이메일"
            value={value}
            onChangeText={onChange}
            placeholder="user@example.com"
            keyboardType="email-address"
            errorMessage={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange } }) => (
          <TextField
            label="비밀번호"
            value={value}
            onChangeText={onChange}
            placeholder="비밀번호"
            secureTextEntry
            errorMessage={errors.password?.message}
          />
        )}
      />
      <PrimaryButton title={isSubmitting ? '로그인 중...' : '로그인'} onPress={handleLogin} disabled={isSubmitting} />
      <View style={styles.linkRow}>
        <Text style={styles.link} onPress={() => navigation.navigate('SignUp')}>
          회원가입
        </Text>
      </View>
      {isSubmitting ? <LoadingOverlay /> : null}
    </KeyboardAvoidingView>
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
    fontSize: 28,
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
