import { BudgetItem, GoalItem, NotificationItem, TransactionItem } from "../../types/domain";

export const recentTransactions: TransactionItem[] = [
  { id: "t1", title: "Кофе", date: "18.02.2026", category: "Питание", amount: "-390 ₽", kind: "EXPENSE" },
  { id: "t2", title: "Такси", date: "18.02.2026", category: "Транспорт", amount: "-840 ₽", kind: "EXPENSE" },
  { id: "t3", title: "Зарплата", date: "17.02.2026", category: "Доход", amount: "+120 000 ₽", kind: "INCOME" },
];

export const budgets: BudgetItem[] = [
  { id: "b1", category: "Питание", spent: "12 400 ₽", limit: "18 000 ₽", progress: 0.69 },
  { id: "b2", category: "Транспорт", spent: "6 100 ₽", limit: "8 000 ₽", progress: 0.76 },
  { id: "b3", category: "Развлечения", spent: "4 200 ₽", limit: "6 000 ₽", progress: 0.7 },
];

export const goals: GoalItem[] = [
  { id: "g1", title: "Финансовая подушка", current: "145 000 ₽", target: "300 000 ₽", deadline: "31.12.2026" },
  { id: "g2", title: "Новый ноутбук", current: "45 000 ₽", target: "120 000 ₽", deadline: "01.09.2026" },
];

export const notifications: NotificationItem[] = [
  { id: "n1", title: "Лимит почти достигнут", text: "Бюджет по транспорту заполнен на 76%.", time: "10 минут назад" },
  { id: "n2", title: "Прогресс цели", text: "Подушка безопасности +2 500 ₽ за неделю.", time: "2 часа назад" },
];
