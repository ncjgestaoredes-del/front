
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
        if (matriculationYear === year) {
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
            if (financialSettings.annualExamFee) {
                ledger.push({
                    date: student.matriculationDate,
                    description: 'Taxa de Exames Anual',
                    debit: financialSettings.annualExamFee,
                    credit: 0,
                    type: 'charge'
                });
            }
        } else if (matriculationYear < year && student.status !== 'Inativo') {
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
            if (financialSettings.annualExamFee) {
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
                    // On-demand charges (Uniforms, Materials, etc.)
                    if (['Uniforme', 'Material', 'Taxa de Transferência'].includes(p.type)) {
                        ledger.push({
                            date: p.date,
                            description: p.description || p.type,
                            debit: p.amount,
                            credit: 0,
                            type: 'charge'
                        });
                    }

                    // The payment itself (Credit)
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
    let totalObligation = 0;
    let totalPaid = 0;

    const profile = student.financialProfile || { status: 'Normal' };
    const matriculationDate = new Date(student.matriculationDate);
    const matriculationYear = matriculationDate.getFullYear();
    const now = new Date();

    // 1. Calculate Obligations
    academicYears.forEach(ay => {
        // If targetYear is provided, only process that year
        if (targetYear && ay.year !== targetYear) return;
        
        // Only process years from matriculation onwards
        if (ay.year < matriculationYear) return;

        // Base Fees (Matrícula/Renovação)
        let enrollmentFee = financialSettings.enrollmentFee;
        let renewalFee = financialSettings.renewalFee;
        let monthlyFee = financialSettings.monthlyFee;

        // Class specific fees
        if (student.desiredClass) {
            const specific = financialSettings.classSpecificFees?.find(c => c.classLevel === student.desiredClass);
            if (specific) {
                enrollmentFee = specific.enrollmentFee;
                renewalFee = specific.renewalFee;
                monthlyFee = specific.monthlyFee;
            }
        }

        // Apply profile discounts
        if (profile.status === 'Isento Total') {
            enrollmentFee = 0;
            renewalFee = 0;
            monthlyFee = 0;
        } else if (profile.status === 'Desconto Parcial') {
            const discount = (profile.discountPercentage || 0) / 100;
            if (profile.affectedTypes?.includes('Matrícula')) enrollmentFee *= (1 - discount);
            if (profile.affectedTypes?.includes('Renovação')) renewalFee *= (1 - discount);
            if (profile.affectedTypes?.includes('Mensalidade')) monthlyFee *= (1 - discount);
        }

        if (ay.year === matriculationYear) {
            // In matriculation year, student owes Enrollment fee
            totalObligation += enrollmentFee;
            totalObligation += financialSettings.annualExamFee || 0;
        } else if (ay.year > matriculationYear) {
            // In subsequent years, student owes Renewal fee
            totalObligation += renewalFee;
            totalObligation += financialSettings.annualExamFee || 0;
        }

        // Monthly Fees
        const startMonth = ay.startMonth || 2;
        const endMonth = ay.endMonth || 11;
        const matriculationMonth = ay.year === matriculationYear ? matriculationDate.getMonth() + 1 : 1;

        for (let m = startMonth; m <= endMonth; m++) {
            // Don't charge for months before matriculation in the first year
            if (ay.year === matriculationYear && m < matriculationMonth) continue;
            
            // Don't charge for future months in the current year
            if (ay.year === now.getFullYear() && m > (now.getMonth() + 1)) continue;
            
            // Don't charge for future years
            if (ay.year > now.getFullYear()) continue;

            // Lógica de Suspensão: Se suspenso, não cobrar meses APÓS a suspensão
            if (student.status === 'Suspenso' && student.suspensionDate) {
                const suspDate = new Date(student.suspensionDate);
                if (ay.year === suspDate.getFullYear() && m > (suspDate.getMonth() + 1)) continue;
                if (ay.year > suspDate.getFullYear()) continue;
            }

            totalObligation += monthlyFee;

            // Penalties
            const limitDay = financialSettings.monthlyPaymentLimitDay || 10;
            const penaltyPercent = financialSettings.latePaymentPenaltyPercent || 0;
            const penaltyDate = new Date(ay.year, m - 1, limitDay + 1);

            if (now >= penaltyDate && penaltyPercent > 0 && profile.status !== 'Sem Multa' && profile.status !== 'Isento Total') {
                const paymentsForMonth = student.payments?.filter((p: PaymentRecord) => 
                    p.academicYear === ay.year && 
                    (p.type === 'Mensalidade' || p.type === 'Matrícula' || p.type === 'Renovação') && 
                    p.referenceMonth === m
                ) || [];

                const limitDateStr = new Date(ay.year, m - 1, limitDay).toISOString().split('T')[0];
                const paidOnTime = paymentsForMonth.reduce((acc: number, p: PaymentRecord) => p.date <= limitDateStr ? acc + p.amount : acc, 0);

                if (paidOnTime < (monthlyFee - 1)) {
                    totalObligation += (monthlyFee * (penaltyPercent / 100));
                }
            }
        }
    });

    // Extra Charges
    student.extraCharges?.forEach((charge: ExtraCharge) => {
        const chargeYear = new Date(charge.date).getFullYear();
        if (targetYear && chargeYear !== targetYear) return;
        totalObligation += charge.amount;
    });

    // 2. Calculate Payments
    student.payments?.forEach((p: PaymentRecord) => {
        if (targetYear && p.academicYear !== targetYear) return;
        totalPaid += p.amount;
    });

    const balance = totalPaid - totalObligation;
    
    // Grace period for new students: if matriculated this month and no payments yet, balance is 0
    const isNewThisMonth = matriculationYear === now.getFullYear() && matriculationDate.getMonth() === now.getMonth();
    const effectiveBalance = (totalPaid === 0 && isNewThisMonth) ? 0 : balance;

    let status: 'Regular' | 'Devedor' | 'Isento' = 'Regular';
    if (profile.status === 'Isento Total') status = 'Isento';
    else if (effectiveBalance < -50) status = 'Devedor';

    return {
        totalObligation,
        totalPaid,
        balance: effectiveBalance,
        status
    };
};

export const formatCurrency = (amount: number, currency: string = 'MZN') => {
    const locale = currency === 'MZN' ? 'pt-MZ' : 'pt-BR';
    return amount.toLocaleString(locale, { style: 'currency', currency });
};
