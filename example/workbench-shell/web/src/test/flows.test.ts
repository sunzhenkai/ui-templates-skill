import { describe, expect, it } from "vitest";
import { createIncident, upsertShift, getIncidents, getShifts, MockError } from "@/mock/api";

describe("mock 数据流", () => {
  it("创建事件生成编号并出现在列表", async () => {
    const before = await getIncidents();
    const created = await createIncident({
      title: "测试事件",
      service: "api-gateway",
      severity: "sev2",
      status: "triggered",
      assignee: null,
      teams: [],
      occurredAt: new Date().toISOString(),
      description: "测试",
      tags: [],
      relatedChange: null,
    });
    const after = await getIncidents();
    expect(after.length).toBe(before.length + 1);
    expect(created.number).toMatch(/^INC-\d+$/);
  });

  it("值班冲突被拒绝", async () => {
    const shifts = await getShifts();
    const existing = shifts[0];
    await expect(
      upsertShift({ team: existing.team, member: "m-eli", date: existing.date, slot: existing.slot }),
    ).rejects.toBeInstanceOf(MockError);
  });
});
