Сервисы модуля анализа и контроля финансами
## Notification intelligence

FinApp notifications are grouped into four product blocks and each notification should include a concise reason plus an actionable `data` payload for the client UI.

1. **Budget control**
   - `BUDGET_THRESHOLD` / `BUDGET_EXCEEDED` for 70/85/95/100% budget milestones.
   - `BUDGET_FORECAST_RISK` when the current spending pace is likely to exceed the period limit.
   - `DAILY_SAFE_LIMIT` with the safe daily amount until the end of the period.
   - `BUDGET_PERIOD_ENDING` when the budget period is close to ending.

2. **Goals**
   - `GOAL_CONTRIBUTION_DUE` for the recommended next contribution.
   - `GOAL_BEHIND_SCHEDULE` when actual progress lags behind the expected timeline.
   - `GOAL_DEADLINE_RISK` when the deadline is near and the goal is not funded enough.
   - `GOAL_ALMOST_COMPLETED` and `GOAL_COMPLETED` for positive progress moments.

3. **Operations**
   - `LARGE_TRANSACTION` for high-impact expenses.
   - `UNUSUAL_TRANSACTION` for transactions that do not match the user's normal pattern.
   - `CATEGORY_SPIKE` for category spending growth.
   - `RECURRING_TRANSACTION_DETECTED` for new recurring expenses.

4. **Subscriptions**
   - `SUBSCRIPTION_RENEWAL` before renewal.
   - `SUBSCRIPTION_UNUSED` when usage looks low.
   - `SUBSCRIPTION_DUPLICATE` for overlapping services.
   - `SUBSCRIPTION_PRICE_INCREASE` when a recurring payment becomes more expensive.

Each notification uses `data.severity`, `data.primaryAction`, and `data.secondaryAction` so mobile clients can render compact cards and route the user directly to the relevant budget, goal, transaction, category, or subscription.
