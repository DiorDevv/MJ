import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

const LANGUAGES = ['uz', 'en'] as const

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language.startsWith('en') ? 'en' : 'uz'

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-surface-hover p-0.5 text-xs font-semibold">
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => void i18n.changeLanguage(lang)}
          className={cn(
            'relative rounded-md px-2.5 py-1.5 uppercase transition-colors',
            current === lang ? 'text-white' : 'text-muted hover:text-foreground',
          )}
        >
          {current === lang && (
            <motion.span
              layoutId="lang-pill"
              className="absolute inset-0 rounded-md bg-primary-600"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">{lang}</span>
        </button>
      ))}
    </div>
  )
}
