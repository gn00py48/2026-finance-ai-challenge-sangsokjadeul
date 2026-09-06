package com.sangsok.api.pii;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class PiiTextMaskerTests {
    private final PiiTextMasker masker=new PiiTextMasker();

    @Test void masksResidentCardPhoneAndLabeledAccountNumbers(){
        assertThat(masker.mask("주민번호 900101-1234567")).isEqualTo("주민번호 900101-*******");
        assertThat(masker.mask("카드 1234-5678-9012-3456")).isEqualTo("카드 1234-****-****-3456");
        assertThat(masker.mask("전화 010-1234-5678")).isEqualTo("전화 010-****-5678");
        assertThat(masker.mask("계좌번호 110-234-567890")).isEqualTo("계좌번호 ***-***-**7890");
        assertThat(masker.mask("계좌 12-3456-78")).isEqualTo("계좌 **-**56-78");
    }

    @Test void keepsDatesAmountsAndOrdinaryText(){
        assertThat(masker.mask("기준일 2026-08-20, 잔액 12,000,000원")).isEqualTo("기준일 2026-08-20, 잔액 12,000,000원");
    }
}
