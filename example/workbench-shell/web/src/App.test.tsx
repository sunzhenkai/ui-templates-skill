import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('workbench shell app', () => {
  it('renders the shell and incident page', async () => {
    window.history.pushState({}, '', '/incidents')
    render(<BrowserRouter><App /></BrowserRouter>)
    expect(await screen.findByTestId('incidents-page')).toBeInTheDocument()
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument()
  })

  it('renders the inbox route', async () => {
    window.history.pushState({}, '', '/inbox')
    render(<BrowserRouter><App /></BrowserRouter>)
    expect(await screen.findByTestId('inbox-page')).toBeInTheDocument()
  })
})
