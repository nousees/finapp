def combine_confidence(ner_confidence: float, categorization_confidence: float) -> float:
    return round((ner_confidence + categorization_confidence) / 2, 2)

