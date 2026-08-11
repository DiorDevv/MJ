import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2 bg-background px-4 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{t('errors.notFoundTitle')}</h1>
      <p className="text-muted">{t('errors.notFoundBody')}</p>
      <Link to="/" className="mt-4 text-primary-600 hover:underline">
        {t('common.back')}
      </Link>
    </div>
  )
}
