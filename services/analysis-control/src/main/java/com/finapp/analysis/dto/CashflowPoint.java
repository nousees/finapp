package com.finapp.analysis.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CashflowPoint(
    LocalDate date,
    BigDecimal income,
    BigDecimal expenses,
    BigDecimal netCashflow
) {
}
