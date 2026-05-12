export type FinAppCategory = {
  id: string;
  code: string;
  name: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  icon: string;
  color: string;
  aliases?: string[];
};

export const FINAPP_CATEGORIES: FinAppCategory[] = [
  { id: "11111111-1111-1111-1111-111111111111", code: "groceries", name: "Продукты", type: "EXPENSE", icon: "shopping-cart", color: "#EF4444", aliases: ["еда", "супермаркет"] },
  { id: "44444444-4444-4444-4444-444444444444", code: "restaurants", name: "Кафе и рестораны", type: "EXPENSE", icon: "coffee", color: "#F97316", aliases: ["кафе", "ресторан", "кофе"] },
  { id: "55555555-5555-5555-5555-555555555555", code: "transport", name: "Транспорт", type: "EXPENSE", icon: "navigation", color: "#0EA5E9", aliases: ["такси", "метро", "автобус"] },
  { id: "66666666-6666-6666-6666-666666666666", code: "entertainment", name: "Развлечения", type: "EXPENSE", icon: "film", color: "#A855F7", aliases: ["досуг", "кино"] },
  { id: "77777777-7777-7777-7777-777777777777", code: "health", name: "Здоровье", type: "EXPENSE", icon: "heart", color: "#14B8A6", aliases: ["аптека", "лечение", "медицина"] },
  { id: "88888888-8888-8888-8888-888888888881", code: "housing", name: "Жилье", type: "EXPENSE", icon: "home", color: "#8B5CF6", aliases: ["аренда", "ипотека", "квартира"] },
  { id: "88888888-8888-8888-8888-888888888882", code: "utilities", name: "Коммунальные услуги", type: "EXPENSE", icon: "droplet", color: "#06B6D4", aliases: ["жкх", "свет", "вода", "газ"] },
  { id: "88888888-8888-8888-8888-888888888883", code: "education", name: "Образование", type: "EXPENSE", icon: "book-open", color: "#3B82F6", aliases: ["курсы", "учеба", "обучение"] },
  { id: "88888888-8888-8888-8888-888888888884", code: "shopping", name: "Покупки", type: "EXPENSE", icon: "shopping-bag", color: "#EC4899", aliases: ["шопинг", "товары"] },
  { id: "88888888-8888-8888-8888-888888888885", code: "clothing", name: "Одежда и обувь", type: "EXPENSE", icon: "tag", color: "#F43F5E", aliases: ["одежда", "обувь"] },
  { id: "88888888-8888-8888-8888-888888888886", code: "subscriptions", name: "Подписки", type: "EXPENSE", icon: "repeat", color: "#6366F1", aliases: ["автоплатежи", "сервисы"] },
  { id: "88888888-8888-8888-8888-888888888887", code: "travel", name: "Путешествия", type: "EXPENSE", icon: "map", color: "#0F766E", aliases: ["отпуск", "поездка", "билеты"] },
  { id: "88888888-8888-8888-8888-888888888888", code: "family", name: "Семья и дети", type: "EXPENSE", icon: "users", color: "#F59E0B", aliases: ["дети", "ребенок", "садик"] },
  { id: "88888888-8888-8888-8888-888888888889", code: "beauty", name: "Красота и уход", type: "EXPENSE", icon: "scissors", color: "#D946EF", aliases: ["салон", "косметика", "уход"] },
  { id: "99999999-9999-9999-9999-999999999991", code: "sports", name: "Спорт", type: "EXPENSE", icon: "activity", color: "#10B981", aliases: ["фитнес", "зал", "тренировки"] },
  { id: "99999999-9999-9999-9999-999999999992", code: "pets", name: "Питомцы", type: "EXPENSE", icon: "github", color: "#84CC16", aliases: ["ветеринар", "корм", "животные"] },
  { id: "99999999-9999-9999-9999-999999999993", code: "electronics", name: "Электроника", type: "EXPENSE", icon: "smartphone", color: "#64748B", aliases: ["техника", "гаджеты"] },
  { id: "99999999-9999-9999-9999-999999999994", code: "gifts", name: "Подарки", type: "EXPENSE", icon: "gift", color: "#FB7185", aliases: ["подарок", "праздник"] },
  { id: "99999999-9999-9999-9999-999999999995", code: "fees", name: "Налоги и комиссии", type: "EXPENSE", icon: "credit-card", color: "#7C3AED", aliases: ["комиссия", "налог", "штраф"] },
  { id: "99999999-9999-9999-9999-999999999996", code: "other", name: "Прочее", type: "EXPENSE", icon: "more-horizontal", color: "#94A3B8", aliases: ["другое"] },

  { id: "22222222-2222-2222-2222-222222222222", code: "salary", name: "Зарплата", type: "INCOME", icon: "briefcase", color: "#22C55E", aliases: ["доход", "аванс"] },
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", code: "freelance", name: "Фриланс", type: "INCOME", icon: "edit-3", color: "#16A34A", aliases: ["подработка", "заказ"] },
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2", code: "bonus", name: "Бонусы и премии", type: "INCOME", icon: "award", color: "#65A30D", aliases: ["премия", "бонус"] },
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3", code: "cashback", name: "Кэшбэк", type: "INCOME", icon: "rotate-ccw", color: "#059669", aliases: ["cashback"] },
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4", code: "gifts_income", name: "Подарки и переводы", type: "INCOME", icon: "send", color: "#0D9488", aliases: ["перевод", "подарок"] },

  { id: "33333333-3333-3333-3333-333333333333", code: "savings", name: "Накопления", type: "TRANSFER", icon: "trending-up", color: "#3B82F6", aliases: ["сбережения"] },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1", code: "investments", name: "Инвестиции", type: "TRANSFER", icon: "bar-chart-2", color: "#2563EB", aliases: ["вклад", "брокер"] },
];

export const EXPENSE_CATEGORIES = FINAPP_CATEGORIES.filter((category) => category.type === "EXPENSE");
export const INCOME_CATEGORIES = FINAPP_CATEGORIES.filter((category) => category.type === "INCOME");
export const TRANSFER_CATEGORIES = FINAPP_CATEGORIES.filter((category) => category.type === "TRANSFER");

export function getCategoryById(categoryId?: string | null): FinAppCategory | undefined {
  return FINAPP_CATEGORIES.find((category) => category.id === categoryId);
}

export function getCategoryByCode(code?: string | null): FinAppCategory | undefined {
  if (!code) return undefined;

  const aliases: Record<string, string> = {
    food: "groceries",
    household: "housing",
    home: "housing",
    medicine: "health",
    subscriptions_services: "subscriptions",
    utilities_bills: "utilities",
  };

  const resolvedCode = aliases[code] || code;
  return FINAPP_CATEGORIES.find((category) => category.code === resolvedCode);
}

export function getCategoryByName(name?: string | null): FinAppCategory | undefined {
  if (!name) return undefined;

  const normalized = name.trim().toLowerCase();
  return FINAPP_CATEGORIES.find((category) => {
    if (category.name.toLowerCase() === normalized) {
      return true;
    }

    if (normalized.includes(category.name.toLowerCase())) {
      return true;
    }

    return (category.aliases || []).some((alias) => normalized.includes(alias.toLowerCase()));
  });
}
