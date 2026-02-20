import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  errorMessage?: string;
  keyboardType?: TextInputProps['keyboardType'];
  multiline?: boolean;
  numberOfLines?: number;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  errorMessage,
  keyboardType = 'default',
  multiline = false,
  numberOfLines,
}: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? styles.multilineInput : null, errorMessage ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 90,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  error: {
    marginTop: 6,
    color: '#ef4444',
    fontSize: 12,
  },
});
