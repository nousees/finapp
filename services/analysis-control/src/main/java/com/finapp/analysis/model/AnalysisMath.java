package com.finapp.analysis.model;

import java.math.BigDecimal;
import java.math.RoundingMode;

final class AnalysisMath {
    static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);
    static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    private AnalysisMath() {
    }

    static BigDecimal money(BigDecimal value) {
        return nullToZero(value).setScale(2, RoundingMode.HALF_UP);
    }

    static BigDecimal nullToZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    static BigDecimal percent(BigDecimal part, BigDecimal total) {
        BigDecimal safeTotal = nullToZero(total);
        if (safeTotal.compareTo(BigDecimal.ZERO) == 0) {
            return ZERO;
        }
        return nullToZero(part)
            .multiply(ONE_HUNDRED)
            .divide(safeTotal, 2, RoundingMode.HALF_UP);
    }
}
