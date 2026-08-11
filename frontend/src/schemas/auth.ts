import { z } from 'zod'
import type { TFunction } from 'i18next'

// Mirrors backend/app/schemas/user.py exactly (length bounds + pattern) so the
// same input is rejected client-side before it ever reaches the API.
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/

export function createRegisterSchema(t: TFunction) {
  return z
    .object({
      username: z
        .string()
        .min(3, t('validation.usernameLength'))
        .max(50, t('validation.usernameLength'))
        .regex(USERNAME_PATTERN, t('validation.usernamePattern')),
      password: z
        .string()
        .min(8, t('validation.passwordLength'))
        .max(128, t('validation.passwordLength')),
      confirmPassword: z.string().min(1, t('validation.required')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordsMustMatch'),
      path: ['confirmPassword'],
    })
}

export function createLoginSchema(t: TFunction) {
  return z.object({
    username: z.string().min(1, t('validation.required')),
    password: z.string().min(1, t('validation.required')),
  })
}

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>
export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>
