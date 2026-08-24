import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import i18n from '../i18n'

void i18n.changeLanguage('uz')

// jsdom doesn't implement these — Radix's Select/DropdownMenu/Tooltip call them
// during pointer interactions, and an unimplemented method throws (not a no-op),
// which would otherwise fail every test that opens one of those primitives.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// Explicit registration since `test.globals` is off — Testing Library's own
// auto-cleanup relies on a global `afterEach` that only exists when enabled.
afterEach(() => {
  cleanup()
})
