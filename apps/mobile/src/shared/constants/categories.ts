export type FinAppCategory = {
  id: string;
  code: string;
  name: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  icon: string;
  color: string;
};

export const FINAPP_CATEGORIES: FinAppCategory[] = [
  { id: "11111111-1111-1111-1111-111111111111", code: "groceries", name: "Продукты", type: "EXPENSE", icon: "shopping-cart", color: "#EF4444" },
  { id: "22222222-2222-2222-2222-222222222222", code: "salary", name: "Зарплата", type: "INCOME", icon: "briefcase", color: "#22C55E" },
  { id: "33333333-3333-3333-3333-333333333333", code: "savings", name: "Накопления", type: "TRANSFER", icon: "trending-up", color: "#3B82F6" },
  { id: "44444444-4444-4444-4444-444444444444", code: "restaurants", name: "Кафе", type: "EXPENSE", icon: "coffee", color: "#F97316" },
  { id: "55555555-5555-5555-5555-555555555555", code: "transport", name: "Транспорт", type: "EXPENSE", icon: "navigation", color: "#0EA5E9" },
  { id: "66666666-6666-6666-6666-666666666666", code: "entertainment", name: "Развлечения", type: "EXPENSE", icon: "film", color: "#A855F7" },
  { id: "77777777-7777-7777-7777-777777777777", code: "health", name: "Здоровье", type: "EXPENSE", icon: "heart", color: "#14B8A6" },
];

export const EXPENSE_CATEGORIES = FINAPP_CATEGORIES.filter((category) => category.type === "EXPENSE");
export const INCOME_CATEGORIES = FINAPP_CATEGORIES.filter((category) => category.type === "INCOME");

export function getCategoryById(categoryId?: string | null): FinAppCategory | undefined {
  return FINAPP_CATEGORIES.find((category) => category.id === categoryId);
}

export function getCategoryByCode(code?: string | null): FinAppCategory | undefined {
  if (code === "subscriptions") {
    return FINAPP_CATEGORIES.find((category) => category.code === "entertainment");
  }
  return FINAPP_CATEGORIES.find((category) => category.code === code);
}

export function getCategoryByName(name?: string | null): FinAppCategory | undefined {
  if (!name) return undefined;
  const normalized = name.trim().toLowerCase();
  return FINAPP_CATEGORIES.find((category) => category.name.toLowerCase() === normalized || normalized.includes(category.name.toLowerCase()));
}
