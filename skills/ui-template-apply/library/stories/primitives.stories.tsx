import type { Meta, StoryObj } from "@storybook/react-vite"
import { Loader2Icon, PlusIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const meta = {
  title: "ui-kit/Primitives",
  tags: ["fidelity"],
  parameters: { layout: "padded" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const variants = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const
const sizes = ["xs", "sm", "default", "lg"] as const

export const Buttons: Story = {
  render: () => (
    <div className="flex flex-col gap-3 bg-background p-4">
      {variants.map((variant) => (
        <div key={variant} className="flex items-center gap-3">
          {sizes.map((size) => <Button key={size} variant={variant} size={size}>{variant}</Button>)}
          <Button variant={variant} size="icon" aria-label="Add"><PlusIcon /></Button>
          <Button variant={variant} disabled>disabled</Button>
        </div>
      ))}
    </div>
  ),
}

/**
 * Interaction states every control must show. Hover and :focus-visible need a pointer or the keyboard, so the
 * static baseline cannot capture them — `fidelity.spec.ts` asserts the keyboard focus ring instead.
 * The spinner is replaced by a static icon so the baseline stays pixel-stable.
 */
export const States: Story = {
  render: () => (
    <div className="flex w-[420px] flex-col gap-6 bg-background p-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">button: default / disabled / busy / invalid (keyboard focus ring: behavioural check in the fidelity spec)</span>
        <div className="flex flex-wrap items-center gap-2">
          <Button>Save</Button>
          <Button disabled>Disabled</Button>
          <Button disabled><Loader2Icon />Saving</Button>
          <Button aria-invalid>Invalid</Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">input / textarea: placeholder / filled / focus / disabled / invalid</span>
        <Input aria-label="Empty" placeholder="Placeholder" />
        <Input aria-label="Filled" defaultValue="Filled value" />
        <Input aria-label="Focused" defaultValue="Focused" autoFocus />
        <Input aria-label="Disabled" defaultValue="Disabled" disabled />
        <Input aria-label="Invalid" defaultValue="not-an-email" aria-invalid />
        <Textarea aria-label="Notes" placeholder="Notes" rows={2} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">select / switch / checkbox / radio: closed / open, on / off, disabled</span>
        <div className="flex items-center gap-2">
          <Select defaultValue="system">
            <SelectTrigger aria-label="Theme" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
            </SelectContent>
          </Select>
          <Select disabled>
            <SelectTrigger aria-label="Disabled theme" className="w-40"><SelectValue placeholder="Disabled" /></SelectTrigger>
            <SelectContent><SelectItem value="none">None</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <Switch aria-label="Switch off" />
          <Switch aria-label="Switch on" defaultChecked />
          <Switch aria-label="Switch disabled" disabled />
          <Checkbox aria-label="Checkbox off" />
          <Checkbox aria-label="Checkbox on" defaultChecked />
          <Checkbox aria-label="Checkbox disabled" disabled defaultChecked />
          <RadioGroup defaultValue="a" className="flex items-center gap-3">
            <RadioGroupItem value="a" aria-label="Radio on" />
            <RadioGroupItem value="b" aria-label="Radio off" />
            <RadioGroupItem value="c" aria-label="Radio disabled" disabled />
          </RadioGroup>
        </div>
      </div>
    </div>
  ),
}

export const Controls: Story = {
  render: () => (
    <div className="flex w-[420px] flex-col gap-4 bg-background p-4">
      <Input aria-label="Name" placeholder="Placeholder" />
      <Input aria-label="Value" defaultValue="Filled value" />
      <Input aria-label="Disabled" defaultValue="Disabled" disabled />
      <Select defaultValue="system">
        <SelectTrigger aria-label="Theme" className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="system">System</SelectItem>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-4">
        <Switch aria-label="Off" />
        <Switch aria-label="On" defaultChecked />
        <Checkbox aria-label="Unchecked" />
        <Checkbox aria-label="Checked" defaultChecked />
      </div>
      <div className="flex items-center gap-2">
        {(["default", "secondary", "outline", "destructive"] as const).map((variant) => <Badge key={variant} variant={variant}>{variant}</Badge>)}
      </div>
    </div>
  ),
}
