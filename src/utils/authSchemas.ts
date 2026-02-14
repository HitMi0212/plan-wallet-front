import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않습니다.'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상 입력해 주세요.')
    .max(128, '비밀번호는 128자 이하여야 합니다.'),
});

export const signUpSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않습니다.'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상 입력해 주세요.')
    .max(128, '비밀번호는 128자 이하여야 합니다.'),
  nickname: z
    .string()
    .min(2, '닉네임은 2자 이상 입력해 주세요.')
    .max(30, '닉네임은 30자 이하여야 합니다.'),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type SignUpForm = z.infer<typeof signUpSchema>;
