from __future__ import annotations

import csv
import json
import random
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
OUT_DIR = BASE_DIR / "training_data"
CSV_PATH = OUT_DIR / "finapp_transactions_training_v2.csv"
JSONL_PATH = OUT_DIR / "finapp_transactions_training_v2.jsonl"
REPORT_PATH = OUT_DIR / "finapp_transactions_training_v2_report.json"


@dataclass(frozen=True)
class CategorySpec:
    code: str
    kind: str
    merchants: tuple[str, ...]
    intents: tuple[str, ...]
    amounts: tuple[int, int]


CATEGORIES: tuple[CategorySpec, ...] = (
    CategorySpec("groceries", "EXPENSE", ("Пятерочка", "Магнит", "Лента", "Ашан", "Перекресток", "ВкусВилл", "Самокат", "Яндекс Лавка", "Ozon Fresh"), ("продукты", "еда домой", "супермаркет", "молоко хлеб овощи", "закупился продуктами"), (150, 6500)),
    CategorySpec("restaurants", "EXPENSE", ("Додо Пицца", "Вкусно и точка", "Бургер Кинг", "KFC", "Шоколадница", "Кофемания", "Яндекс Еда", "Delivery Club", "кафе у дома"), ("кофе", "обед", "ужин", "доставка еды", "ресторан", "бургер", "пицца"), (120, 7000)),
    CategorySpec("transport", "EXPENSE", ("Яндекс Go", "Uber", "Ситимобил", "Метро", "Тройка", "РЖД", "АЗС Лукойл", "Газпромнефть", "парковка"), ("такси", "метро", "автобус", "электричка", "бензин", "парковка", "проезд"), (45, 8500)),
    CategorySpec("entertainment", "EXPENSE", ("Кинопарк", "Каро", "Квеструм", "Steam", "PlayStation Store", "Концерт Холл", "Бильярд клуб"), ("кино", "игра", "концерт", "театр", "квест", "развлечения", "билеты"), (250, 12000)),
    CategorySpec("health", "EXPENSE", ("Аптека Ригла", "Горздрав", "36.6", "Инвитро", "Гемотест", "Стоматология", "Клиника Семейная"), ("лекарства", "анализы", "врач", "стоматолог", "аптека", "медицина", "витамины"), (100, 25000)),
    CategorySpec("housing", "EXPENSE", ("Арендодатель", "ДомКлик", "УК Дом", "Ипотека Сбер", "ЖК Комфорт"), ("аренда", "ипотека", "квартира", "жилье", "ремонт квартиры", "платеж за дом"), (8000, 120000)),
    CategorySpec("utilities", "EXPENSE", ("ЖКХ", "Мосэнергосбыт", "Водоканал", "Газпром межрегионгаз", "Ростелеком", "Дом.ру", "МТС интернет"), ("коммуналка", "свет", "вода", "газ", "интернет", "квартплата", "домофон"), (300, 18000)),
    CategorySpec("education", "EXPENSE", ("Skyeng", "Нетология", "Skillbox", "Stepik", "Coursera", "Университет", "Репетитор", "ЛитРес"), ("курс", "обучение", "учеба", "книга", "репетитор", "английский", "университет"), (300, 70000)),
    CategorySpec("shopping", "EXPENSE", ("Ozon", "Wildberries", "Яндекс Маркет", "Мегамаркет", "AliExpress", "Fix Price", "DNS"), ("покупка", "товары", "маркетплейс", "заказ", "домашние мелочи", "хозтовары"), (100, 65000)),
    CategorySpec("clothing", "EXPENSE", ("Zara", "Uniqlo", "Lamoda", "Спортмастер", "Sneaker Store", "Gloria Jeans", "Henderson"), ("одежда", "обувь", "кроссовки", "куртка", "футболка", "джинсы"), (500, 80000)),
    CategorySpec("subscriptions", "EXPENSE", ("Яндекс Плюс", "VK Музыка", "Spotify", "Netflix", "YouTube Premium", "Кинопоиск", "Иви", "Okko", "Apple iCloud", "Google One", "ChatGPT", "Adobe"), ("подписка", "автоплатеж", "ежемесячное списание", "premium", "продление", "сервис"), (99, 4990)),
    CategorySpec("travel", "EXPENSE", ("Аэрофлот", "S7", "РЖД", "Туту", "Островок", "Booking", "OneTwoTrip", "Airbnb"), ("билет", "отель", "поездка", "отпуск", "самолет", "поезд", "бронь"), (1000, 250000)),
    CategorySpec("family", "EXPENSE", ("Детский мир", "Кораблик", "Садик", "Школа", "Игрушки", "Педиатр", "Кружок робототехники"), ("дети", "ребенок", "садик", "школа", "игрушки", "подгузники", "кружок"), (200, 50000)),
    CategorySpec("beauty", "EXPENSE", ("Барбершоп", "Салон красоты", "Маникюр", "Золотое Яблоко", "Летуаль", "Косметолог"), ("стрижка", "маникюр", "косметика", "салон", "уход", "барбер", "массаж"), (300, 45000)),
    CategorySpec("sports", "EXPENSE", ("World Class", "Фитнес Хаус", "Спортзал", "Бассейн", "Йога студия", "Спортмастер"), ("фитнес", "зал", "тренировка", "бассейн", "йога", "абонемент спорт"), (300, 60000)),
    CategorySpec("pets", "EXPENSE", ("Бетховен", "Четыре лапы", "Зоозавр", "Ветеринар", "Зоомагазин", "Petshop"), ("корм", "ветеринар", "зоомагазин", "наполнитель", "прививка", "питомец"), (150, 35000)),
    CategorySpec("electronics", "EXPENSE", ("DNS", "М.Видео", "Эльдорадо", "re:Store", "Ситилинк", "Apple Store", "Xiaomi Store"), ("смартфон", "ноутбук", "наушники", "техника", "зарядка", "гаджет", "электроника"), (500, 300000)),
    CategorySpec("gifts", "EXPENSE", ("Цветы", "Flowwow", "Подарки", "Ювелирный", "Красный Куб", "Hobby Games"), ("подарок", "цветы", "букет", "день рождения", "праздник", "сувенир"), (300, 100000)),
    CategorySpec("fees", "EXPENSE", ("ФНС", "Госуслуги", "Банк комиссия", "ГИБДД", "Судебные приставы", "Почта России"), ("налог", "штраф", "комиссия", "сбор", "пошлина", "пеня"), (10, 80000)),
    CategorySpec("other", "EXPENSE", ("Разное", "Неизвестный магазин", "Оплата QR", "Перевод", "Прочие расходы"), ("прочее", "непонятная покупка", "разовый платеж", "прочий расход", "без описания"), (50, 50000)),
    CategorySpec("salary", "INCOME", ("ООО Ромашка", "Работодатель", "Компания", "Зарплатный проект", "Бухгалтерия"), ("зарплата", "аванс", "оклад", "зачисление зарплаты", "доход"), (15000, 350000)),
    CategorySpec("freelance", "INCOME", ("Заказчик", "Upwork", "Freelance", "ИП клиент", "Проект"), ("фриланс", "оплата за проект", "заказ", "подработка", "гонорар"), (1000, 400000)),
    CategorySpec("bonus", "INCOME", ("Работодатель", "HR отдел", "Компания", "Премия"), ("премия", "бонус", "годовая премия", "мотивационная выплата"), (1000, 250000)),
    CategorySpec("cashback", "INCOME", ("Банк", "Тинькофф", "Сбер", "Альфа Банк", "Кэшбэк сервис"), ("кэшбэк", "cashback", "возврат бонусов", "начисление за покупки"), (10, 15000)),
    CategorySpec("gifts_income", "INCOME", ("Мама", "Папа", "Друг", "Саша", "Родственники"), ("перевод от", "подарили", "подарок", "возврат долга", "помощь"), (100, 200000)),
    CategorySpec("savings", "TRANSFER", ("Накопительный счет", "Копилка", "Сейф", "Сберегательный счет"), ("отложил", "перевел в накопления", "копилка", "сбережения", "резерв"), (100, 300000)),
    CategorySpec("investments", "TRANSFER", ("Тинькофф Инвестиции", "БКС", "Финам", "Брокерский счет", "ВТБ Инвестиции"), ("инвестиции", "брокер", "купил акции", "пополнение иис", "облигации"), (1000, 500000)),
)


VOICE_TEMPLATES = (
    "{verb} {amount} рублей {place} {merchant} {intent}",
    "{verb} {amount} руб {intent} {place} {merchant}",
    "{merchant}, {intent}, {amount} рублей",
    "{amount} рублей {merchant} {intent}",
)

CSV_TEMPLATES = (
    "Покупка {merchant} {amount:.2f} RUB",
    "MCC {mcc} {merchant} списание {amount:.2f}",
    "Оплата картой {merchant} {amount:.2f} RUR",
    "{merchant}; terminal {terminal}; {amount:.2f} RUB",
)

SUBSCRIPTION_SERVICES = (
    ("Яндекс Плюс", 399),
    ("Кинопоиск", 299),
    ("Иви", 399),
    ("Okko", 399),
    ("VK Музыка", 169),
    ("YouTube Premium", 299),
    ("Apple iCloud", 149),
    ("Google One", 199),
    ("ChatGPT", 1990),
    ("Adobe", 1790),
    ("Spotify", 299),
    ("Netflix", 799),
)

HARD_NEGATIVE_REPEATS = (
    ("Пятерочка", "groceries", "продукты на неделю", 1200),
    ("Аптека Ригла", "health", "лекарства", 850),
    ("АЗС Лукойл", "transport", "бензин", 2400),
    ("Додо Пицца", "restaurants", "ужин", 990),
    ("Детский мир", "family", "подгузники", 1450),
)


def main() -> None:
    random.seed(705)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = build_rows()
    write_csv(rows)
    write_jsonl(rows)
    write_report(rows)
    print(f"Generated {len(rows)} rows")
    print(f"CSV: {CSV_PATH}")
    print(f"JSONL: {JSONL_PATH}")
    print(f"Report: {REPORT_PATH}")


def build_rows() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    start = datetime(2025, 1, 1, 10, 0, 0)
    for spec in CATEGORIES:
        rows.extend(generate_category_rows(spec, start, count=360 if spec.kind == "EXPENSE" else 260))
    rows.extend(generate_subscription_sequences(start))
    rows.extend(generate_hard_negative_repeats(start))
    random.shuffle(rows)
    for index, row in enumerate(rows, start=1):
        row["id"] = f"finapp-train-{index:06d}"
    return rows


def generate_category_rows(spec: CategorySpec, start: datetime, count: int) -> list[dict[str, object]]:
    rows = []
    for index in range(count):
        merchant = random.choice(spec.merchants)
        intent = random.choice(spec.intents)
        amount = random.randint(*spec.amounts)
        source = random.choice(("voice", "manual", "csv"))
        date = start + timedelta(days=random.randint(0, 420), hours=random.randint(0, 12), minutes=random.randint(0, 59))
        text = make_text(source, merchant, intent, amount)
        rows.append(make_row(text, amount, date, merchant, spec.code, spec.kind, False, source, "category_core"))

    rows.extend(generate_ambiguous_rows(spec, start))
    return rows


def generate_ambiguous_rows(spec: CategorySpec, start: datetime) -> list[dict[str, object]]:
    rows = []
    confusing_prefixes = (
        "оплата",
        "перевод",
        "покупка",
        "списание",
        "онлайн",
        "терминал",
        "qr",
    )
    for prefix in confusing_prefixes:
        merchant = random.choice(spec.merchants)
        intent = random.choice(spec.intents)
        amount = random.randint(*spec.amounts)
        date = start + timedelta(days=random.randint(0, 420), hours=random.randint(0, 23))
        text = f"{prefix} {merchant} {intent} {amount} рублей"
        rows.append(make_row(text, amount, date, merchant, spec.code, spec.kind, False, "hard_case", "ambiguous_prefix"))
    return rows


def generate_subscription_sequences(start: datetime) -> list[dict[str, object]]:
    rows = []
    for service, amount in SUBSCRIPTION_SERVICES:
        anchor_day = random.randint(1, 25)
        for month in range(10):
            date = start + timedelta(days=30 * month + anchor_day, hours=random.randint(0, 4))
            variants = (
                f"подписка {service} {amount} рублей",
                f"автоплатеж {service} {amount} руб",
                f"{service} premium списание {amount}",
                f"ежемесячное списание {service} {amount} рублей",
            )
            rows.append(make_row(random.choice(variants), amount, date, service, "subscriptions", "EXPENSE", True, "subscription_sequence", "positive_recurring"))
    return rows


def generate_hard_negative_repeats(start: datetime) -> list[dict[str, object]]:
    rows = []
    for merchant, category_code, intent, amount in HARD_NEGATIVE_REPEATS:
        for month in range(8):
            date = start + timedelta(days=30 * month + random.randint(1, 25), hours=random.randint(8, 21))
            text = f"повторная покупка {merchant} {intent} {amount + random.randint(-80, 120)} рублей"
            rows.append(make_row(text, amount, date, merchant, category_code, "EXPENSE", False, "hard_negative", "negative_recurring"))
    return rows


def make_text(source: str, merchant: str, intent: str, amount: int) -> str:
    if source == "csv":
        return random.choice(CSV_TEMPLATES).format(
            merchant=merchant,
            amount=float(amount),
            terminal=random.randint(1000, 9999),
            mcc=random.randint(3000, 8999),
        )
    verb = random.choice(("потратил", "оплатил", "купил", "списали", "заплатил", "внес"))
    place = random.choice(("в", "через", "на", ""))
    return random.choice(VOICE_TEMPLATES).format(verb=verb, amount=amount, place=place, merchant=merchant, intent=intent).strip()


def make_row(
    text: str,
    amount: int,
    date: datetime,
    merchant: str,
    category_code: str,
    operation_type: str,
    is_subscription: bool,
    source: str,
    scenario: str,
) -> dict[str, object]:
    return {
        "id": "",
        "text": text,
        "description": text,
        "amount": amount,
        "currency": "RUB",
        "date": date.isoformat(),
        "merchant": merchant,
        "category": category_code,
        "category_code": category_code,
        "operation_type": operation_type,
        "is_subscription": int(is_subscription),
        "source": source,
        "scenario": scenario,
    }


def write_csv(rows: list[dict[str, object]]) -> None:
    fieldnames = list(rows[0].keys())
    with CSV_PATH.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_jsonl(rows: list[dict[str, object]]) -> None:
    with JSONL_PATH.open("w", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(row, ensure_ascii=False) + "\n")


def write_report(rows: list[dict[str, object]]) -> None:
    by_category = Counter(str(row["category_code"]) for row in rows)
    by_scenario = Counter(str(row["scenario"]) for row in rows)
    payload = {
        "total_rows": len(rows),
        "categories": dict(sorted(by_category.items())),
        "scenarios": dict(sorted(by_scenario.items())),
        "subscription_positive_rows": sum(int(row["is_subscription"]) for row in rows),
        "created_at": datetime.now().isoformat(),
    }
    REPORT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
