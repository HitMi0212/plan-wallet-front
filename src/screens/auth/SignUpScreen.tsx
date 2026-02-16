import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { LoadingOverlay } from '../../components/LoadingOverlay';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { useAuthStore } from '../../stores/authStore';
import { SignUpForm, signUpSchema } from '../../utils/authSchemas';

export function SignUpScreen({ navigation }: { navigation: any }) {
  const signUp = useAuthStore((state) => state.signUp);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      nickname: '',
    },
  });

  const handleSignUp = handleSubmit(async (values) => {
    try {
      await signUp(values.email.trim(), values.password, values.nickname.trim());
    } catch (error) {
      Alert.alert('회원가입 실패', '입력값을 확인해 주세요.');
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>회원가입</Text>
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
              secureTextEntry
              errorMessage={errors.password?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="nickname"
          render={({ field: { value, onChange } }) => (
            <TextField
              label="닉네임"
              value={value}
              onChangeText={onChange}
              errorMessage={errors.nickname?.message}
            />
          )}
        />
        <PrimaryButton title={isSubmitting ? '가입 중...' : '가입'} onPress={handleSignUp} disabled={isSubmitting} />
        <View style={styles.linkRow}>
          <Text style={styles.link} onPress={() => navigation.goBack()}>
            로그인으로 돌아가기
          </Text>
        </View>
      </ScrollView>
      {isSubmitting ? <LoadingOverlay /> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
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
