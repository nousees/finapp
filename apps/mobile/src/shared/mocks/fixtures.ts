import { BudgetItem, GoalItem, NotificationItem, TransactionItem } from "../../types/domain";

export const recentTransactions: TransactionItem[] = [
  { id: "t1", title: "Coffee", date: "2026-02-18", category: "Food", amount: "-390 RUB", kind: "EXPENSE" },
  { id: "t2", title: "Taxi", date: "2026-02-18", category: "Transport", amount: "-840 RUB", kind: "EXPENSE" },
  { id: "t3", title: "Salary", date: "2026-02-17", category: "Income", amount: "+120000 RUB", kind: "INCOME" },
];

export const budgets: BudgetItem[] = [
  { id: "b1", category: "Food", spent: "12400 RUB", limit: "18000 RUB", progress: 0.69 },
  { id: "b2", category: "Transport", spent: "6100 RUB", limit: "8000 RUB", progress: 0.76 },
  { id: "b3", category: "Entertainment", spent: "4200 RUB", limit: "6000 RUB", progress: 0.7 },
];

export const goals: GoalItem[] = [
  { id: "g1", title: "Emergency Fund", current: "145000 RUB", target: "300000 RUB", deadline: "2026-12-31" },
  { id: "g2", title: "New Laptop", current: "45000 RUB", target: "120000 RUB", deadline: "2026-09-01" },
];

export const notifications: NotificationItem[] = [
  { id: "n1", title: "Budget alert", text: "Transport budget reached 76%.", time: "10 min ago" },
  { id: "n2", title: "Goal update", text: "Emergency fund +2,500 RUB this week.", time: "2 h ago" },
];
