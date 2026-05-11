import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type TransactionType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  merchant: string;
  date: string;
}

export interface Budget {
  id: string;
  name: string;
  category: string;
  limit: number;
  spent: number;
  color: string;
  icon: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
  icon: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: "food", name: "Еда и напитки", icon: "coffee", color: "#F97316" },
  { id: "transport", name: "Транспорт", icon: "navigation", color: "#3B82F6" },
  { id: "shopping", name: "Покупки", icon: "shopping-bag", color: "#EC4899" },
  { id: "entertainment", name: "Развлечения", icon: "film", color: "#8B5CF6" },
  { id: "health", name: "Здоровье", icon: "heart", color: "#EF4444" },
  { id: "housing", name: "Жильё", icon: "home", color: "#10B981" },
  { id: "education", name: "Образование", icon: "book", color: "#F59E0B" },
  { id: "income", name: "Доход", icon: "trending-up", color: "#10B981" },
  { id: "other", name: "Другое", icon: "more-horizontal", color: "#6B7280" },
];

const SEED_TRANSACTIONS: Transaction[] = [
  { id: "t1", type: "income", amount: 4500, category: "income", description: "Зарплата за май", merchant: "ООО «Акме»", date: new Date(Date.now() - 1 * 24 * 3600000).toISOString() },
  { id: "t2", type: "expense", amount: 78.50, category: "food", description: "Обед в ресторане", merchant: "Nobu Москва", date: new Date(Date.now() - 1 * 24 * 3600000).toISOString() },
  { id: "t3", type: "expense", amount: 12.99, category: "entertainment", description: "Подписка Netflix", merchant: "Netflix", date: new Date(Date.now() - 2 * 24 * 3600000).toISOString() },
  { id: "t4", type: "expense", amount: 45.00, category: "transport", description: "Яндекс.Такси в аэропорт", merchant: "Яндекс.Такси", date: new Date(Date.now() - 2 * 24 * 3600000).toISOString() },
  { id: "t5", type: "expense", amount: 230.00, category: "shopping", description: "Новые кроссовки", merchant: "Nike Store", date: new Date(Date.now() - 3 * 24 * 3600000).toISOString() },
  { id: "t6", type: "income", amount: 850, category: "income", description: "Фриланс-проект", merchant: "Клиент А", date: new Date(Date.now() - 4 * 24 * 3600000).toISOString() },
  { id: "t7", type: "expense", amount: 1200, category: "housing", description: "Аренда квартиры", merchant: "Арендодатель", date: new Date(Date.now() - 5 * 24 * 3600000).toISOString() },
  { id: "t8", type: "expense", amount: 65.00, category: "health", description: "Фитнес-клуб", merchant: "World Class", date: new Date(Date.now() - 6 * 24 * 3600000).toISOString() },
  { id: "t9", type: "expense", amount: 34.20, category: "food", description: "Продукты", merchant: "ВкусВилл", date: new Date(Date.now() - 6 * 24 * 3600000).toISOString() },
  { id: "t10", type: "expense", amount: 9.99, category: "entertainment", description: "Яндекс.Музыка", merchant: "Яндекс", date: new Date(Date.now() - 7 * 24 * 3600000).toISOString() },
];

const SEED_BUDGETS: Budget[] = [
  { id: "b1", name: "Еда и напитки", category: "food", limit: 500, spent: 312, color: "#F97316", icon: "coffee" },
  { id: "b2", name: "Транспорт", category: "transport", limit: 200, spent: 145, color: "#3B82F6", icon: "navigation" },
  { id: "b3", name: "Покупки", category: "shopping", limit: 300, spent: 230, color: "#EC4899", icon: "shopping-bag" },
  { id: "b4", name: "Развлечения", category: "entertainment", limit: 150, spent: 82, color: "#8B5CF6", icon: "film" },
  { id: "b5", name: "Здоровье", category: "health", limit: 200, spent: 65, color: "#EF4444", icon: "heart" },
];

const SEED_GOALS: Goal[] = [
  { id: "g1", name: "Резервный фонд", target: 10000, current: 6500, deadline: "2025-12-31", icon: "shield", color: "#10B981" },
  { id: "g2", name: "Отпуск в Японии", target: 5000, current: 2100, deadline: "2025-08-01", icon: "map-pin", color: "#8B5CF6" },
  { id: "g3", name: "Новый MacBook", target: 2500, current: 800, deadline: "2025-06-01", icon: "monitor", color: "#3B82F6" },
  { id: "g4", name: "Инвестиционный портфель", target: 20000, current: 12000, deadline: "2026-01-01", icon: "trending-up", color: "#F97316" },
];

interface FinanceContextValue {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  addTransaction: (t: Omit<Transaction, "id" | "date">) => void;
  addGoal: (g: Omit<Goal, "id">) => void;
  updateGoal: (id: string, amount: number) => void;
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
  expenseByCategory: { category: string; amount: number; color: string }[];
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(SEED_TRANSACTIONS);
  const [budgets, setBudgets] = useState<Budget[]>(SEED_BUDGETS);
  const [goals, setGoals] = useState<Goal[]>(SEED_GOALS);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("finance_data");
        if (stored) {
          const data = JSON.parse(stored);
          if (data.transactions?.length) setTransactions(data.transactions);
          if (data.budgets?.length) setBudgets(data.budgets);
          if (data.goals?.length) setGoals(data.goals);
        }
      } catch {}
    })();
  }, []);

  const persist = useCallback(
    async (t: Transaction[], b: Budget[], g: Goal[]) => {
      try {
        await AsyncStorage.setItem("finance_data", JSON.stringify({ transactions: t, budgets: b, goals: g }));
      } catch {}
    },
    []
  );

  const addTransaction = useCallback(
    (t: Omit<Transaction, "id" | "date">) => {
      const newT: Transaction = {
        ...t,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        date: new Date().toISOString(),
      };
      setTransactions((prev) => {
        const next = [newT, ...prev];
        setBudgets((prevB) => {
          const nextB = prevB.map((b) =>
            b.category === t.category && t.type === "expense"
              ? { ...b, spent: b.spent + t.amount }
              : b
          );
          persist(next, nextB, goals);
          return nextB;
        });
        return next;
      });
    },
    [goals, persist]
  );

  const addGoal = useCallback(
    (g: Omit<Goal, "id">) => {
      const newG: Goal = {
        ...g,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      };
      setGoals((prev) => {
        const next = [...prev, newG];
        persist(transactions, budgets, next);
        return next;
      });
    },
    [transactions, budgets, persist]
  );

  const updateGoal = useCallback(
    (id: string, amount: number) => {
      setGoals((prev) => {
        const next = prev.map((g) =>
          g.id === id ? { ...g, current: Math.min(g.current + amount, g.target) } : g
        );
        persist(transactions, budgets, next);
        return next;
      });
    },
    [transactions, budgets, persist]
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthTxs = transactions.filter((t) => t.date >= monthStart);
  const monthIncome = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalBalance = transactions.reduce(
    (s, t) => (t.type === "income" ? s + t.amount : s - t.amount),
    0
  );

  const categoryMap: Record<string, number> = {};
  monthTxs
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.amount;
    });
  const expenseByCategory = Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount,
      color: CATEGORIES.find((c) => c.id === category)?.color ?? "#6B7280",
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        budgets,
        goals,
        addTransaction,
        addGoal,
        updateGoal,
        totalBalance,
        monthIncome,
        monthExpense,
        expenseByCategory,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}
