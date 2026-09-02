import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '@/App'

beforeEach(() => { localStorage.clear() })
afterEach(() => { cleanup(); localStorage.clear() })

function renderApp(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

describe('workbench shell', () => {
  it('渲染事件列表并恢复 URL 筛选', async () => {
    renderApp('/events?q=API%20Gateway&status=pending')
    await waitFor(() => expect(screen.getByRole('heading', { name: '事件列表' })).toBeInTheDocument(), { timeout: 3000 })
    await waitFor(() => expect(screen.getByLabelText('搜索事件')).toHaveValue('API Gateway'), { timeout: 3000 })
    await waitFor(() => expect(screen.getByText('已生效：')).toBeInTheDocument(), { timeout: 3000 })
  })

  it('创建事件后列表出现新事件并显示成功反馈', async () => {
    const user = userEvent.setup()
    renderApp('/events')
    await waitFor(() => expect(screen.getByRole('button', { name: '新建事件' })).toBeInTheDocument(), { timeout: 3000 })
    await user.click(screen.getByRole('button', { name: '新建事件' }))
    const dialog = await screen.findByRole('dialog', { name: /创建事件/ }, { timeout: 3000 })
    expect(dialog).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText(/标题/), { target: { value: '支付回调延迟' } })
    await user.selectOptions(within(dialog).getByLabelText(/影响服务/), within(dialog).getByRole('option', { name: 'API Gateway' }))
    await user.click(within(dialog).getByRole('button', { name: '创建事件' }))
    expect(await screen.findByText('事件已创建', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(await screen.findByText('支付回调延迟', {}, { timeout: 3000 })).toBeInTheDocument()
  })

  it('全局搜索可以打开并展示分类筛选', async () => {
    const user = userEvent.setup()
    renderApp('/events')
    await waitFor(() => expect(screen.getByRole('heading', { name: '事件列表' })).toBeInTheDocument(), { timeout: 3000 })
    await user.keyboard('{Control>}k{/Control}')
    expect(await screen.findByRole('dialog', { name: /全局搜索/ })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: '结果类型' })).toBeInTheDocument()
  })
})
