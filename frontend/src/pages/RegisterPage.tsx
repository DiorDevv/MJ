import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/layout/Logo'
import { useTranslation } from 'react-i18next'
import { Button, Input } from '../components/ui'
import { createRegisterSchema, type RegisterFormValues } from '../schemas/auth'
import { fetchCurrentUser, registerUser } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { ApiError } from '../api/client'
import { showErrorToast, showSuccessToast } from '../utils/toast'

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(createRegisterSchema(t)) })

  const mutation = useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      const { access_token: accessToken } = await registerUser(values)
      const user = await fetchCurrentUser(accessToken)
      return { accessToken, user }
    },
    onSuccess: ({ accessToken, user }) => {
      setAuth(accessToken, user)
      showSuccessToast(t('auth.registerSuccess'))
      navigate('/app', { replace: true })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.status === 409) {
        showErrorToast(t('auth.usernameTakenError'))
      } else {
        showErrorToast(t('auth.genericError'))
      }
    },
  })

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-sm">
        <Logo size={40} className="mx-auto mb-4" />
        <h1 className="mb-6 text-center text-2xl font-semibold text-foreground">
          {t('auth.register')}
        </h1>
        <form
          onSubmit={(event) => void handleSubmit((values) => mutation.mutate(values))(event)}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label={t('auth.username')}
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />
          <Input
            label={t('auth.password')}
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label={t('auth.confirmPassword')}
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <Button type="submit" isLoading={mutation.isPending} className="mt-2">
            {t('auth.registerCta')}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:underline">
            {t('auth.loginCta')}
          </Link>
        </p>
      </div>
    </div>
  )
}
