import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Input } from '../components/ui'
import { createLoginSchema, type LoginFormValues } from '../schemas/auth'
import { fetchCurrentUser, loginUser } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { ApiError } from '../api/client'
import { showErrorToast, showSuccessToast } from '../utils/toast'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(createLoginSchema(t)) })

  const mutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const { access_token: accessToken } = await loginUser(values)
      const user = await fetchCurrentUser(accessToken)
      return { accessToken, user }
    },
    onSuccess: ({ accessToken, user }) => {
      setAuth(accessToken, user)
      showSuccessToast(t('auth.loginSuccess'))
      navigate('/app', { replace: true })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        showErrorToast(t('auth.invalidCredentialsError'))
      } else {
        showErrorToast(t('auth.genericError'))
      }
    },
  })

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-foreground">
          {t('auth.login')}
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
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" isLoading={mutation.isPending} className="mt-2">
            {t('auth.loginCta')}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-medium text-primary-600 hover:underline">
            {t('auth.registerCta')}
          </Link>
        </p>
      </div>
    </div>
  )
}
