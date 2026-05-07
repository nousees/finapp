import pandas as pd
from catboost import CatBoostClassifier, Pool
from transformers import pipeline
from sklearn.metrics import accuracy_score, classification_report
import time

# Загружаем синтетический тест
df = pd.read_csv("synthetic_test.csv")
print(f"Тестовых примеров: {len(df)}")

# Приводим колонки к ожидаемому моделью виду
df_cat = pd.DataFrame()
df_cat["amount"] = df["amount"].astype(float)
df_cat["description"] = df["text"].astype(str)          # CatBoost использует description
df_cat["merchant"] = df["merchant"].astype(str)

# --- CatBoost ---
cb = CatBoostClassifier()
cb.load_model("ml_models/catboost_finapp.cbm")
pool = Pool(data=df_cat, cat_features=[1, 2])   # description и merchant категориальные
start = time.time()
cb_preds = cb.predict(pool)
cb_time = time.time() - start

# --- BERT ---
bert = pipeline("text-classification", model="ml_models/bert_finapp", tokenizer="ml_models/bert_finapp")
start = time.time()
bert_preds = [bert(text)[0]["label"] for text in df["text"]]
bert_time = time.time() - start

# Истинные метки
y_true = df["category"].tolist()

print("="*60)
print(f"CatBoost accuracy: {accuracy_score(y_true, cb_preds)*100:.2f}%  (время: {cb_time:.2f} с)")
print(f"BERT accuracy:      {accuracy_score(y_true, bert_preds)*100:.2f}%  (время: {bert_time:.2f} с)")
print("="*60)

print("\n--- CatBoost ---")
print(classification_report(y_true, cb_preds, zero_division=0))
print("\n--- BERT ---")
print(classification_report(y_true, bert_preds, zero_division=0))