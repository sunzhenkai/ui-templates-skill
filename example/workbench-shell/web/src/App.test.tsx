import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('事件协作工作区', () => {
  it('切换看板并可打开创建事件流程', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '事件看板' }))
    expect(screen.getByRole('heading', { name: '事件看板' })).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: '创建事件' })[0])
    expect(screen.getByRole('dialog', { name: '创建事件' })).toBeTruthy()
  })
})
