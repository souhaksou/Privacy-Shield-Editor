---
name: unused-vue-api-check
description: 檢查未使用 props/emits（按需手動觸發）
---

任務：
1) 掃描 `src/components/**/*.vue` 的 `defineProps`/`defineEmits`
2) 檢查在 `src/**/*.vue` 是否有對應傳入/監聽
3) 只回報有問題項目（無問題就回覆 clean）

輸出格式（每項一行）：
`<file> | <prop|emit> | unused | remove/keep(reason)`
