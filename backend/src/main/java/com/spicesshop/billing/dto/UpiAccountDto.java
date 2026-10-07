package com.spicesshop.billing.dto;

public class UpiAccountDto {
    private String label;
    private String upiId;

    public UpiAccountDto() {}

    public UpiAccountDto(String label, String upiId) {
        this.label = label;
        this.upiId = upiId;
    }

    public String getLabel() {
        return this.label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getUpiId() {
        return this.upiId;
    }

    public void setUpiId(String upiId) {
        this.upiId = upiId;
    }
}
