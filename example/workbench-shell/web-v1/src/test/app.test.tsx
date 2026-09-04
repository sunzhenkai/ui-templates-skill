import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { routes } from '@/App'
import { usePrefsStore } from '@/stores/prefs-store'

describe('app shell', () => {
  it('renders inbox heading', async () => {
    usePrefsStore.setState({ delayMs: 0, forceFail: false })
    const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
    const router = createMemoryRouter(routes, { initialEntries: ['/ws-alpha/inbox'] })
    render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('heading', { name: '收件箱' })).toBeInTheDocument()
  })
})
