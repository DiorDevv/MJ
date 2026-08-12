import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import i18n from '../i18n'

void i18n.changeLanguage('uz')

// Explicit registration since `test.globals` is off — Testing Library's own
// auto-cleanup relies on a global `afterEach` that only exists when enabled.
afterEach(() => {
  cleanup()
})
