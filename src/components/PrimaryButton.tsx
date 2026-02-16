import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'secondary' | 'danger';
}

export function PrimaryButton({ title, onPress, disabled, variant = 'default' }: PrimaryButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        variant === 'default' && styles.defaultButton,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'danger' && styles.dangerButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text
        style={[
          styles.text,
          variant === 'default' && styles.defaultText,
          variant === 'primary' && styles.primaryText,
          variant === 'secondary' && styles.secondaryText,
          variant === 'danger' && styles.dangerText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  defaultButton: {
    borderColor: '#0f172a',
    backgroundColor: 'transparent',
  },
  primaryButton: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a',
  },
  secondaryButton: {
    borderColor: '#94a3b8',
    backgroundColor: 'transparent',
  },
  dangerButton: {
    borderColor: '#dc2626',
    backgroundColor: '#fff',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '700',
    fontSize: 16,
  },
  defaultText: {
    color: '#0f172a',
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: '#334155',
  },
  dangerText: {
    color: '#dc2626',
  },
});
