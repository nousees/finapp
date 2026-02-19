export type TransactionItem = {
  id: string;
  title: string;
  date: string;
  category: string;
  amount: string;
  kind: "EXPENSE" | "INCOME";
};

export type BudgetItem = {
  id: string;
  category: string;
  spent: string;
  limit: string;
  progress: number;
};

export type GoalItem = {
  id: string;
  title: string;
  current: string;
  target: string;
  deadline: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  text: string;
  time: string;
};
