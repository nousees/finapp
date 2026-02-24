# FinApp Mobile (UI Stub)

React Native mobile scaffold with primary FinApp screens and placeholder data only.

## Scope

- Module 1 (Collection): transaction intake, import center, voice capture.
- Module 2 (Analysis): dashboard, reports, budgets, goals, notifications.
- Assistant: habit insights and subscription recommendations.
- Profile: account and settings placeholders.

No API integration, persistence, auth flow, or business logic is implemented yet.

## Run

```bash
cd apps/mobile
npm install
npm run start
```

## Run with Docker

From repository root:

```bash
docker compose up --build mobile
```

## Navigation map

- Tab: `Home` -> `Dashboard`, `Reports`
- Tab: `Data` -> `DataHome`, `TransactionsList`, `TransactionCreate`, `ImportCenter`, `VoiceCapture`
- Tab: `Control` -> `AnalysisHome`, `Budgets`, `Goals`, `Notifications`
- Tab: `AI` -> `AssistantHome`, `HabitInsights`
- Tab: `Profile` -> `ProfileHome`, `Settings`
