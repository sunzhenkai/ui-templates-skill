import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import App from "./App"

describe("App", () => {
  it("renders the app shell and default inbox page", () => {
    render(<App />)
    expect(screen.getByRole("heading", { name: "收件箱" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /创建事件/i })).toBeInTheDocument()
  })
})
