
import { 
    Student, 
    FinancialSettings, 
    AcademicYear, 
    PaymentRecord, 
    ExtraCharge,
    PaymentType
} from "../types";

/**
 * Unified financial calculation utilities to ensure consistency across the application.
 * Convention: Negative value = Debt (Dívida), Positive value = Surplus (Saldo a favor).
 */

export interface StudentFinancialSummary {
    totalObligation: number;
    totalPaid: number;
    balance: number;
    status: 'Regular' | 'Devedor' | 'Isento';
}

export interface LedgerItem {
    date: string;
    description: string;
    debit: number;
    credit: number;
    type: 'charge' | 'payment';
}

export const getStudentFinancialLedger = (
    student: Student,
    academicYears: AcademicYear[],
    financialSettings: FinancialSettings,
    targetYear?: number
): LedgerItem[] => {
    const ledger: LedgerItem[] = [];
    const now = new Date();
    const profile = student.financialProfile || { status: 'Normal' };
    const matriculationDate = new Date(student.matriculationDate);
    const matriculationYear = matriculationDate.getFullYear();
    const matriculationMonth = matriculationDate.getMonth() + 1;

    // Sort years to process chronologically
    const sortedYears = [...academicYears].sort((a, b) => a.year - b.year);

    sortedYears.forEach(yearObj => {
        const year = yearObj.year;
        
        if (targetYear && year > targetYear) return;

        // 1. Base Fees for this year
        let monthlyFeeBase = financialSettings.monthlyFee;
        let enrollmentFeeBase = financialSettings.enrollmentFee;
        let renewalFeeBase = financialSettings.renewalFee;

        if (student.desiredClass && financialSettings.classSpecificFees) {
            const specific = financialSettings.classSpecificFees.find((c: any) => c.classLevel === student.desiredClass);
            if (specific) {
                monthlyFeeBase = specific.monthlyFee;
                enrollmentFeeBase = specific.enrollmentFee;
                renewalFeeBase = specific.renewalFee;
            }
        }

        const getFee = (type: PaymentType, baseValue: number) => {
            if (profile.status === 'Isento Total') return 0;
            if (profile.status === 'Desconto Parcial' && profile.affectedTypes?.includes(type)) {
                return baseValue * (1 - (profile.discountPercentage || 0) / 100);
            }
            return baseValue;
        };

        // A. Enrollment / Renewal
        // Check if there are payments for these specific types to avoid double-debiting 
        // and to allow the payment-based debit logic to take precedence for matching amounts.
        const hasMatriculaPayment = student.payments?.some(p => p.academicYear === year && (p.type === 'Matrícula' || p.items?.some(it => it.item.includes('Matrícula'))));
        const hasRenovacaoPayment = student.payments?.some(p => p.academicYear === year && (p.type === 'Renovação' || p.items?.some(it => it.item.includes('Renovação'))));
        const hasExamPayment = student.payments?.some(p => p.academicYear === year && (p.type === 'Taxa de Exames' || p.items?.some(it => it.item.includes('Exame'))));

        if (matriculationYear === year) {
            if (!hasMatriculaPayment) {
                const fee = getFee('Matrícula', enrollmentFeeBase);
                if (fee > 0) {
                    ledger.push({
                        date: student.matriculationDate,
                        description: 'Matrícula / Inscrição',
                        debit: fee,
                        credit: 0,
                        type: 'charge'
                    });
                }
            }
            if (financialSettings.annualExamFee && !hasExamPayment) {
                ledger.push({
                    date: student.matriculationDate,
                    description: 'Taxa de Exames Anual',
                    debit: financialSettings.annualExamFee,
                    credit: 0,
                    type: 'charge'
                });
            }
        } else if (matriculationYear < year && student.status !== 'Inativo') {
            if (!hasRenovacaoPayment) {
                const fee = getFee('Renovação', renewalFeeBase);
                if (fee > 0) {
                    ledger.push({
                        date: `${year}-01-15`,
                        description: 'Renovação de Matrícula',
                        debit: fee,
                        credit: 0,
                        type: 'charge'
                    });
                }
            }
            if (financialSettings.annualExamFee && !hasExamPayment) {
                ledger.push({
                    date: `${year}-01-15`,
                    description: 'Taxa de Exames Anual',
                    debit: financialSettings.annualExamFee,
                    credit: 0,
                    type: 'charge'
                });
            }
        }

        // B. Monthly Fees
        const startMonth = yearObj.startMonth || 2;
        const endMonth = yearObj.endMonth || 11;
        let effectiveStartMonth = startMonth;
        if (matriculationYear === year) {
            effectiveStartMonth = Math.max(startMonth, matriculationMonth);
        }

        const checkLimit = (year === now.getFullYear()) ? Math.min(now.getMonth() + 1, endMonth) : (year < now.getFullYear() ? endMonth : 0);

        for (let m = effectiveStartMonth; m <= checkLimit; m++) {
            // Suspension check
            if (student.status === 'Suspenso' && student.suspensionDate) {
                const suspDate = new Date(student.suspensionDate);
                if (year === suspDate.getFullYear() && m > (suspDate.getMonth() + 1)) continue;
                if (year > suspDate.getFullYear()) continue;
            }

            const monthlyFee = getFee('Mensalidade', monthlyFeeBase);
            if (monthlyFee > 0) {
                const dueDate = `${year}-${m.toString().padStart(2, '0')}-01`;
                ledger.push({
                    date: dueDate,
                    description: `Mensalidade ${m}/${year}`,
                    debit: monthlyFee,
                    credit: 0,
                    type: 'charge'
                });

                // Penalty
                const limitDay = financialSettings.monthlyPaymentLimitDay || 10;
                const penaltyPercent = financialSettings.latePaymentPenaltyPercent || 0;
                const penaltyDate = new Date(year, m - 1, limitDay + 1);

                if (now >= penaltyDate && penaltyPercent > 0 && profile.status !== 'Sem Multa' && profile.status !== 'Isento Total') {
                    const paymentsForMonth = student.payments?.filter((p: PaymentRecord) => 
                        p.academicYear === year && 
                        (p.type === 'Mensalidade' || p.type === 'Matrícula' || p.type === 'Renovação') && 
                        p.referenceMonth === m
                    ) || [];

                    const limitDateStr = new Date(year, m - 1, limitDay).toISOString().split('T')[0];
                    const paidOnTime = paymentsForMonth.reduce((acc: number, p: PaymentRecord) => p.date <= limitDateStr ? acc + p.amount : acc, 0);

                    if (paidOnTime < (monthlyFee - 1)) {
                        ledger.push({
                            date: penaltyDate.toISOString().split('T')[0],
                            description: `Multa por Atraso (${m}/${year})`,
                            debit: monthlyFee * (penaltyPercent / 100),
                            credit: 0,
                            type: 'charge'
                        });
                    }
                }
            }
        }

        // C. Extra Charges
        if (student.extraCharges) {
            student.extraCharges.forEach((charge: ExtraCharge) => {
                const chargeDate = new Date(charge.date);
                if (chargeDate.getFullYear() === year) {
                    ledger.push({
                        date: charge.date.split('T')[0],
                        description: charge.description,
                        debit: charge.amount,
                        credit: 0,
                        type: 'charge'
                    });
                }
            });
        }

        // D. Payments (Credits and On-demand Charges)
        if (student.payments) {
            student.payments.forEach((p: PaymentRecord) => {
                if (p.academicYear === year) {
                    // 1. Create debits for items in this payment
                    if (p.items && p.items.length > 0) {
                        p.items.forEach(item => {
                            // Debit everything except Mensalidade and Extra Charges (which are handled elsewhere)
                            const isMensalidade = item.item.toLowerCase().includes('mensalidade');
                            const isExtraCharge = p.type === 'Multa/Danos';
                            
                            if (!isMensalidade && !isExtraCharge) {
                                ledger.push({
                                    date: p.date,
                                    description: item.item,
                                    debit: item.value,
                                    credit: 0,
                                    type: 'charge'
                                });
                            }
                        });
                    } else {
                        // Fallback for payments without items (old data or simple payments)
                        if (['Matrícula', 'Renovação', 'Uniforme', 'Material', 'Taxa de Transferência', 'Taxa de Exames'].includes(p.type)) {
                            ledger.push({
                                date: p.date,
                                description: p.description || p.type,
                                debit: p.amount,
                                credit: 0,
                                type: 'charge'
                            });
                        }
                    }

                    // 2. The payment itself (Credit)
                    ledger.push({
                        date: p.date,
                        description: `Pagamento (${p.type}) - ${p.method}`,
                        debit: 0,
                        credit: p.amount,
                        type: 'payment'
                    });
                }
            });
        }
    });

    return ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const calculateStudentFinancialSummary = (
    student: Student,
    academicYears: AcademicYear[],
    financialSettings: FinancialSettings,
    targetYear?: number // If provided, calculates only for this year. Otherwise, calculates all-time.
): StudentFinancialSummary => {
    const ledger = getStudentFinancialLedger(student, academicYears, financialSettings, targetYear);
    
    let totalObligation = 0;
    let totalPaid = 0;

    ledger.forEach(item => {
        totalObligation += item.debit;
        totalPaid += item.credit;
    });

    const balance = totalPaid - totalObligation;
    
    let status: 'Regular' | 'Devedor' | 'Isento' = 'Regular';
    if (student.financialProfile?.status === 'Isento Total') status = 'Isento';
    else if (balance < -50) status = 'Devedor';

    return {
        totalObligation,
        totalPaid,
        balance,
        status
    };
};

export const formatCurrency = (amount: number, currency: string = 'MZN') => {
    const locale = currency === 'MZN' ? 'pt-MZ' : 'pt-BR';
    return amount.toLocaleString(locale, { style: 'currency', currency });
};
