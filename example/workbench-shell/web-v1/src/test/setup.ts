import '@testing-library/jest-dom/vitest'
import { usePrefsStore } from '@/stores/prefs-store'

usePrefsStore.setState({ delayMs: 0, forceFail: false })
