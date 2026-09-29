---
schema_version: 2
kind: phase-9-review
verification_contract: numeric-v1
template_digest:
  algorithm: sha256-canonical-json-v1
  value: 3bc5b43ebb61377b7d33f7ff0300b82195cf05e1bc4552ede2988200e055ec18
source_identity: git:200dcb44cc1527ef24a1c892e9c3e5508377b386:clean
build_identity: workbench-shell-cert-3.1.2-clean-20260929094936
browser_identity: Chromium 153.0.8010.12 / Playwright 1.63.0
records:
- id: dfdeb103-9291-5bd9-950c-65630326a87f
  phase8_record_id: 959d5a4c-6cdf-5b42-9b50-77f623f0034f
  rule_id: LAYOUT-101
  status: recheck-passed
  expected: All derived template scenarios are implemented and measured in the clean
    certification build.
  actual: All derived scenarios have structured current-build measurements; 25 oracle-anchored
    numeric expectations match exactly or declared tolerance.
  route: all included routes
  viewport: desktop 1440x900
  theme: light
  state: current-build
  evidence_refs:
  - evidence/current-build-evidence.json
created_at: '2026-09-29T02:05:00Z'
---

# Certification Apply Review

All 186 derived scenarios have numeric current-build measurements. The 25 oracle-anchored expectations match the captured values.
