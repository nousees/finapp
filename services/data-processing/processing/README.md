• Берёт сырые транзакции из БД
• Вызывает ML для категоризации
• Обогащает транзакцию (добавляет category_id, confidence)
• Обновляет запись в БД
• Может помечать как recurring

POST /process
POST /categorize-batch