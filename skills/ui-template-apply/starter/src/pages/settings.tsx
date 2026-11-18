import { SettingsPage, type SettingsGroup } from "@/components/page-templates/settings-page"
import { Switch } from "@/components/ui/switch"

const groups: SettingsGroup[] = [
  {
    title: "通知",
    rows: [
      { id: "mentions", label: "被提及时通知", controlId: "mentions", control: <Switch id="mentions" defaultChecked /> },
      { id: "digest", label: "每周摘要", description: "每周一发送一次汇总", controlId: "digest", control: <Switch id="digest" /> },
    ],
  },
]

export function SettingsRoute() {
  return <SettingsPage title="偏好设置" groups={groups} />
}
