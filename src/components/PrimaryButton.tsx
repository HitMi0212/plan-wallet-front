import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export function PrimaryButton({ title, onPress, disabled }: PrimaryButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0f172a',
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16,
  },
});
