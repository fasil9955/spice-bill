package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "invoice_sequences", uniqueConstraints = {@UniqueConstraint(columnNames = {"company_name", "sequence_date"})})
public class InvoiceSequence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sequence_id")
    private Integer sequenceId;

    @Column(name = "company_name", nullable = false, length = 100)
    private String companyName;

    @Column(name = "sequence_date", nullable = false)
    private LocalDate sequenceDate;

    @Column(name = "next_sequence", nullable = false)
    private Integer nextSequence = 1;

    @Version
    @Column(name = "version")
    private Integer version;

    public InvoiceSequence() {}

    public InvoiceSequence(String companyName, LocalDate sequenceDate) {
        this.companyName = companyName;
        this.sequenceDate = sequenceDate;
        this.nextSequence = 1;
    }

    public InvoiceSequence(Integer sequenceId, String companyName, LocalDate sequenceDate, Integer nextSequence, Integer version) {
        this.sequenceId = sequenceId;
        this.companyName = companyName;
        this.sequenceDate = sequenceDate;
        this.nextSequence = nextSequence != null ? nextSequence : 1;
        this.version = version;
    }

    public void setSequenceId(Integer sequenceId) {
        this.sequenceId = sequenceId;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public void setSequenceDate(LocalDate sequenceDate) {
        this.sequenceDate = sequenceDate;
    }

    public void setNextSequence(Integer nextSequence) {
        this.nextSequence = nextSequence;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public Integer getSequenceId() {
        return this.sequenceId;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public LocalDate getSequenceDate() {
        return this.sequenceDate;
    }

    public Integer getNextSequence() {
        return this.nextSequence;
    }

    public Integer getVersion() {
        return this.version;
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof InvoiceSequence)) return false;
        InvoiceSequence other = (InvoiceSequence) o;
        if (!other.canEqual(this)) return false;
        Object this$sequenceId = getSequenceId(), other$sequenceId = other.getSequenceId();
        if ((this$sequenceId == null) ? (other$sequenceId != null) : !this$sequenceId.equals(other$sequenceId)) return false;
        Object this$nextSequence = getNextSequence(), other$nextSequence = other.getNextSequence();
        if ((this$nextSequence == null) ? (other$nextSequence != null) : !this$nextSequence.equals(other$nextSequence)) return false;
        Object this$version = getVersion(), other$version = other.getVersion();
        if ((this$version == null) ? (other$version != null) : !this$version.equals(other$version)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$sequenceDate = getSequenceDate(), other$sequenceDate = other.getSequenceDate();
        return !((this$sequenceDate == null) ? (other$sequenceDate != null) : !this$sequenceDate.equals(other$sequenceDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof InvoiceSequence;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $sequenceId = getSequenceId();
        result = result * PRIME + (($sequenceId == null) ? 43 : $sequenceId.hashCode());
        Object $nextSequence = getNextSequence();
        result = result * PRIME + (($nextSequence == null) ? 43 : $nextSequence.hashCode());
        Object $version = getVersion();
        result = result * PRIME + (($version == null) ? 43 : $version.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $sequenceDate = getSequenceDate();
        return result * PRIME + (($sequenceDate == null) ? 43 : $sequenceDate.hashCode());
    }

    @Override
    public String toString() {
        return "InvoiceSequence(sequenceId=" + getSequenceId() + ", companyName=" + getCompanyName() + ", sequenceDate=" + String.valueOf(getSequenceDate()) + ", nextSequence=" + getNextSequence() + ", version=" + getVersion() + ")";
    }
}
