"""Examples for integrating Whisper, RuBERT-tiny NER, CatBoost and BERT classifier.
These functions are intentionally explicit and can be reused in training/inference scripts.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any



def transcribe_audio_whisper(audio_path: str, model_name: str = "small") -> str:
    """Load Whisper and return transcript for MP3/WAV audio files."""
    import whisper

    model = whisper.load_model(model_name)
    result = model.transcribe(audio_path, language="ru", fp16=False)
    return result["text"].strip()


@dataclass
class NerArtifacts:
    model_dir: Path
    label2id: dict[str, int]
    id2label: dict[int, str]


def fine_tune_rubert_tiny_ner(train_df, output_dir: str) -> NerArtifacts:
    """Fine-tune RuBERT-tiny NER using BIO labels in `tokens` and `ner_tags` columns."""
    from datasets import Dataset
    from transformers import AutoModelForTokenClassification, AutoTokenizer, DataCollatorForTokenClassification, Trainer, TrainingArguments

    model_id = "cointegrated/rubert-tiny2"
    labels = sorted({label for seq in train_df["ner_tags"] for label in seq})
    label2id = {label: idx for idx, label in enumerate(labels)}
    id2label = {idx: label for label, idx in label2id.items()}

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForTokenClassification.from_pretrained(
        model_id, num_labels=len(labels), label2id=label2id, id2label=id2label
    )

    ds = Dataset.from_pandas(train_df)

    def tokenize_and_align_labels(example: dict[str, Any]) -> dict[str, Any]:
        tokenized = tokenizer(example["tokens"], truncation=True, is_split_into_words=True)
        word_ids = tokenized.word_ids()
        prev_word = None
        label_ids = []
        for word_idx in word_ids:
            if word_idx is None:
                label_ids.append(-100)
            elif word_idx != prev_word:
                label_ids.append(label2id[example["ner_tags"][word_idx]])
            else:
                label_ids.append(-100)
            prev_word = word_idx
        tokenized["labels"] = label_ids
        return tokenized

    tokenized_ds = ds.map(tokenize_and_align_labels)
    args = TrainingArguments(
        output_dir=output_dir,
        learning_rate=3e-5,
        num_train_epochs=2,
        per_device_train_batch_size=8,
        weight_decay=0.01,
        logging_steps=20,
        save_steps=100,
    )
    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=tokenized_ds,
        tokenizer=tokenizer,
        data_collator=DataCollatorForTokenClassification(tokenizer),
    )
    trainer.train()
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    return NerArtifacts(Path(output_dir), label2id, id2label)


def train_catboost_categorizer(df, model_path: str):
    """Train CatBoost category model using amount, description and merchant columns."""
    from catboost import CatBoostClassifier
    from sklearn.model_selection import train_test_split

    feature_cols = ["amount", "description", "merchant"]
    X_train, X_valid, y_train, y_valid = train_test_split(
        df[feature_cols], df["category"], test_size=0.2, random_state=42, stratify=df["category"]
    )
    model = CatBoostClassifier(
        depth=6,
        learning_rate=0.08,
        iterations=500,
        eval_metric="Accuracy",
        cat_features=[1, 2],
        verbose=100,
    )
    model.fit(X_train, y_train, eval_set=(X_valid, y_valid), use_best_model=True)
    model.save_model(model_path)
    return model


def fine_tune_bert_classifier(df, output_dir: str) -> None:
    """Fine-tune BERT classifier for transaction category prediction."""
    from datasets import Dataset
    from sklearn.model_selection import train_test_split
    from transformers import AutoModelForSequenceClassification, AutoTokenizer, Trainer, TrainingArguments

    model_id = "DeepPavlov/rubert-base-cased"
    labels = sorted(df["label"].unique().tolist())
    label2id = {label: idx for idx, label in enumerate(labels)}
    id2label = {idx: label for label, idx in label2id.items()}

    train_df, valid_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df["label"])
    train_ds = Dataset.from_pandas(train_df)
    valid_ds = Dataset.from_pandas(valid_df)

    tokenizer = AutoTokenizer.from_pretrained(model_id)

    def tokenize(batch: dict[str, Any]) -> dict[str, Any]:
        encoded = tokenizer(batch["text"], truncation=True, padding="max_length", max_length=128)
        encoded["labels"] = [label2id[label] for label in batch["label"]]
        return encoded

    train_ds = train_ds.map(tokenize, batched=True)
    valid_ds = valid_ds.map(tokenize, batched=True)

    model = AutoModelForSequenceClassification.from_pretrained(
        model_id, num_labels=len(labels), label2id=label2id, id2label=id2label
    )

    args = TrainingArguments(
        output_dir=output_dir,
        learning_rate=2e-5,
        num_train_epochs=3,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=16,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
    )
    trainer = Trainer(model=model, args=args, train_dataset=train_ds, eval_dataset=valid_ds, tokenizer=tokenizer)
    trainer.train()
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)


def bert_predict(texts: list[str], model_dir: str) -> list[dict[str, Any]]:
    from transformers import pipeline

    clf = pipeline("text-classification", model=model_dir, tokenizer=model_dir)
    return clf(texts)
