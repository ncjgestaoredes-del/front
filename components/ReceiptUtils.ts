
import { PaymentRecord, SchoolSettings, Student, Subject, Turma, FinancialSettings, ExtraCharge, Grade, ExamResult } from "../types";

export interface PrintOptions {
    period: '1º Trimestre' | '2º Trimestre' | '3º Trimestre' | 'Situação Anual';
    type: 'general' | 'detailed' | 'general_detailed';
    subjectId?: string;
}

export const printStatisticalReport = (
    title: string,
    contentHtml: string,
    schoolSettings: SchoolSettings,
    academicYear: number
) => {
    const logoHtml = schoolSettings.schoolLogo 
        ? `<img src="${schoolSettings.schoolLogo}" alt="Logo" style="max-height: 70px; max-width: 70px;" />` 
        : '<div style="width: 70px; height: 70px; background: #eee; border-radius: 50%;"></div>';

    const documentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title} - ${academicYear}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; font-size: 12px; }
                .container { max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 30px; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                .school-info { text-align: right; }
                .school-name { font-size: 20px; font-weight: bold; margin: 0; }
                .report-title { text-align: center; font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 20px 0; color: #1a237e; }
                
                .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
                .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; background: #fcfcfc; }
                .stat-value { font-size: 20px; font-weight: bold; color: #1a237e; }
                .stat-label { font-size: 10px; color: #666; text-transform: uppercase; margin-top: 5px; }
                
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background: #f5f5f5; border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
                td { border: 1px solid #ddd; padding: 8px; font-size: 11px; }
                
                .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
                .signature-section { display: flex; justify-content: space-around; margin-top: 60px; }
                .sig-line { border-top: 1px solid #000; width: 200px; padding-top: 5px; text-align: center; font-weight: bold; }
                
                @media print {
                    .container { border: none; }
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">${logoHtml}</div>
                    <div class="school-info">
                        <div class="school-name">${schoolSettings.schoolName || 'Instituição de Ensino'}</div>
                        <div class="school-detail">Ano Lectivo: ${academicYear}</div>
                        <div class="school-detail">Emissão: ${new Date().toLocaleDateString()}</div>
                    </div>
                </div>

                <div class="report-title">${title}</div>

                <div class="main-content">
                    ${contentHtml}
                </div>

                <div class="signature-section">
                    <div class="sig-line">A Direção Pedagógica</div>
                    <div class="sig-line">A Direção Administrativa</div>
                </div>

                <div class="footer">Gerado digitalmente pelo Sistema de Gestão Escolar EscolaSys.</div>
            </div>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    if(win) {
        win.document.write(documentHtml);
        win.document.close();
    }
};

export const printReceipt = (
    payment: PaymentRecord, 
    student: Student, 
    schoolSettings: SchoolSettings, 
    currency: string = 'MZN',
    operatorName: string = 'Secretaria'
) => {
    const logoHtml = schoolSettings.schoolLogo 
        ? `<img src="${schoolSettings.schoolLogo}" alt="Logo" style="max-height: 80px; max-width: 80px;" />` 
        : '<div style="width: 80px; height: 80px; background: #eee; border-radius: 50%;"></div>';

    const getCurrencyLocale = (curr: string) => {
        switch(curr) {
            case 'MZN': return 'pt-MZ';
            case 'AOA': return 'pt-AO';
            case 'USD': return 'en-US';
            case 'EUR': return 'pt-PT';
            default: return 'pt-MZ';
        }
    };

    const formatPrice = (price: number) => {
        const locale = getCurrencyLocale(currency);
        return price.toLocaleString(locale, { style: 'currency', currency: currency });
    };

    // Generate Rows for items if they exist, otherwise use description
    let itemsRows = '';
    if (payment.items && payment.items.length > 0) {
        itemsRows = payment.items.map(item => `
            <tr>
                <td style="padding: 8px 10px; border-bottom: 1px solid #eee;">${item.item}</td>
                <td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.value)}</td>
            </tr>
        `).join('');
    } else {
        itemsRows = `
            <tr>
                <td style="padding: 8px 10px; border-bottom: 1px solid #eee;">${payment.description || 'Pagamento diverso'}</td>
                <td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(payment.amount)}</td>
            </tr>
        `;
    }

    const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Recibo #${payment.id}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
                .container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 40px; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
                .school-info { text-align: right; }
                .school-name { font-size: 24px; font-weight: bold; color: #2c3e50; margin: 0; }
                .school-detail { font-size: 12px; color: #7f8c8d; margin: 2px 0; }
                
                .receipt-title { text-align: center; font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 30px; color: #2c3e50; letter-spacing: 1px; }
                
                .meta-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .info-group h4 { margin: 0 0 5px 0; font-size: 11px; text-transform: uppercase; color: #95a5a6; }
                .info-group p { margin: 0; font-weight: bold; font-size: 14px; }
                
                .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .table th { text-align: left; border-bottom: 2px solid #eee; padding: 10px; font-size: 12px; text-transform: uppercase; color: #7f8c8d; }
                
                .total-section { text-align: right; margin-top: 20px; }
                .total-label { font-size: 14px; color: #7f8c8d; margin-right: 10px; }
                .total-amount { font-size: 24px; font-weight: bold; color: #27ae60; }
                
                .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #bdc3c7; }
                .signature-box { display: flex; justify-content: space-between; margin-top: 50px; padding: 0 50px; }
                .signature-line { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">
                        ${logoHtml}
                    </div>
                    <div class="school-info">
                        <h1 class="school-name">${schoolSettings.schoolName || 'Nome da Escola'}</h1>
                        <p class="school-detail">${schoolSettings.address || 'Endereço da Escola'}</p>
                        <p class="school-detail">Contatos: ${schoolSettings.contact || 'N/A'}</p>
                        <p class="school-detail">Email: ${schoolSettings.email || 'N/A'}</p>
                        <p class="school-detail"><strong>NUIT: ${schoolSettings.nuit || 'N/A'}</strong></p>
                    </div>
                </div>

                <div class="receipt-title">Recibo de Pagamento</div>

                <div class="meta-info">
                    <div class="info-group">
                        <h4>Recibo Nº</h4>
                        <p>#${payment.id.split('_')[1] || payment.id}</p>
                    </div>
                    <div class="info-group">
                        <h4>Data de Emissão</h4>
                        <p>${new Date(payment.date).toLocaleDateString()}</p>
                    </div>
                    <div class="info-group">
                        <h4>Aluno</h4>
                        <p>${student.name}</p>
                        <p style="font-size: 11px; font-weight: normal; color: #7f8c8d;">ID: ${student.id} • ${student.desiredClass}</p>
                    </div>
                    <div class="info-group">
                        <h4>Método</h4>
                        <p>${payment.method || 'Numerário'}</p>
                    </div>
                </div>

                <table class="table">
                    <thead>
                        <tr>
                            <th>Descrição do Item</th>
                            <th style="text-align: right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <div class="total-section">
                    <span class="total-label">TOTAL PAGO</span>
                    <span class="total-amount">${formatPrice(payment.amount)}</span>
                </div>

                <div class="signature-box">
                    <div class="signature-line">
                        <span style="font-weight:bold; text-transform:uppercase;">${operatorName}</span><br>
                        <span style="font-size:10px; color: #666;">(Secretaria / Caixa)</span>
                    </div>
                    <div class="signature-line">
                        <br>
                        Assinatura do Encarregado
                    </div>
                </div>

                <div class="footer">
                    Este documento serve como comprovativo de pagamento. Emitido digitalmente pelo Sistema de Gestão Escolar.
                    <br/> Operador: ${operatorName}
                </div>
            </div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
    } else {
        alert('Por favor, permita pop-ups para imprimir o recibo.');
    }
};

export const printDailyReport = (
    date: string,
    payments: (PaymentRecord & { studentName: string, className: string, operatorName?: string })[],
    summary: Record<string, number>,
    total: number,
    schoolSettings: SchoolSettings,
    currency: string = 'MZN',
    operatorName: string = 'Direção',
    reportTitle: string = 'Folha de Fecho de Caixa Diário'
) => {
    const logoHtml = schoolSettings.schoolLogo 
        ? `<img src="${schoolSettings.schoolLogo}" alt="Logo" style="max-height: 70px; max-width: 70px;" />` 
        : '<div style="width: 70px; height: 70px; background: #eee; border-radius: 50%;"></div>';

    const getCurrencyLocale = (curr: string) => {
        switch(curr) {
            case 'MZN': return 'pt-MZ';
            case 'AOA': return 'pt-AO';
            case 'USD': return 'en-US';
            case 'EUR': return 'pt-PT';
            default: return 'pt-MZ';
        }
    };

    const formatPrice = (price: number) => {
        const locale = getCurrencyLocale(currency);
        return price.toLocaleString(locale, { style: 'currency', currency: currency });
    };

    const summaryRows = Object.entries(summary).map(([method, amount]) => `
        <tr>
            <td style="padding: 5px 10px; border-bottom: 1px solid #eee;">${method}</td>
            <td style="padding: 5px 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${formatPrice(amount)}</td>
        </tr>
    `).join('');

    const transactionRows = payments.map(p => `
        <tr>
            <td style="padding: 5px; border-bottom: 1px solid #eee; font-size: 11px;">${p.id.split('_')[1]}</td>
            <td style="padding: 5px; border-bottom: 1px solid #eee; font-size: 11px;">${p.studentName} <span style="color:#777">(${p.className})</span></td>
            <td style="padding: 5px; border-bottom: 1px solid #eee; font-size: 11px;">${p.type}</td>
            <td style="padding: 5px; border-bottom: 1px solid #eee; font-size: 11px;">${p.method}</td>
            <td style="padding: 5px; border-bottom: 1px solid #eee; font-size: 11px;">${p.operatorName || '-'}</td>
            <td style="padding: 5px; border-bottom: 1px solid #eee; font-size: 11px; text-align: right;">${formatPrice(p.amount)}</td>
        </tr>
    `).join('');

    const reportHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Fecho de Caixa - ${date}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
                .container { max-width: 900px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
                .school-info { text-align: right; }
                .school-name { font-size: 20px; font-weight: bold; color: #2c3e50; margin: 0; }
                .school-detail { font-size: 11px; color: #7f8c8d; margin: 2px 0; }
                
                .report-title { text-align: center; font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; color: #2c3e50; }
                .report-date { text-align: center; font-size: 14px; color: #7f8c8d; margin-bottom: 30px; }
                
                .section-title { font-size: 14px; font-weight: bold; border-bottom: 1px solid #333; margin-bottom: 10px; padding-bottom: 5px; text-transform: uppercase; }
                
                .summary-box { margin-bottom: 30px; background: #f9f9f9; padding: 15px; border-radius: 5px; }
                .summary-table { width: 100%; border-collapse: collapse; }
                
                .transactions-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .transactions-table th { text-align: left; background: #eee; padding: 8px 5px; font-size: 11px; text-transform: uppercase; color: #555; }
                
                .grand-total { text-align: right; font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-bottom: 40px; }
                
                .signature-box { display: flex; justify-content: space-around; margin-top: 60px; }
                .signature-line { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; font-size: 12px; }
                
                .footer { margin-top: 30px; font-size: 10px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">${logoHtml}</div>
                    <div class="school-info">
                        <div class="school-name">${schoolSettings.schoolName || 'Nome da Escola'}</div>
                        <div class="school-detail">NUIT: ${schoolSettings.nuit || 'N/A'}</div>
                        <div class="school-detail">${schoolSettings.address || ''}</div>
                    </div>
                </div>

                <div class="report-title">${reportTitle}</div>
                <div class="report-date">Data: ${new Date(date).toLocaleDateString('pt-BR')}</div>

                <div class="summary-box">
                    <div class="section-title">Resumo por Método de Pagamento</div>
                    <table class="summary-table">
                        ${summaryRows}
                    </table>
                </div>

                <div class="section-title">Detalhamento das Transações</div>
                <table class="transactions-table">
                    <thead>
                        <tr>
                            <th>Ref.</th>
                            <th>Aluno</th>
                            <th>Tipo</th>
                            <th>Método</th>
                            <th>Operador</th>
                            <th style="text-align: right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactionRows}
                    </tbody>
                </table>

                <div class="grand-total">
                    TOTAL GERAL ARRECADADO: ${formatPrice(total)}
                </div>

                <div class="signature-box">
                    <div class="signature-line">
                        <span style="font-weight:bold; text-transform:uppercase;">${operatorName}</span><br>
                        <span style="font-size:10px; color: #666;">(Responsável pelo Caixa)</span>
                    </div>
                    <div class="signature-line">
                        <br>
                        A Direção
                    </div>
                </div>
                
                <div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')} pelo Sistema de Gestão Escolar</div>
            </div>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
        printWindow.document.write(reportHtml);
        printWindow.document.close();
    }
};

export const printStudentStatement = (
    student: Student,
    academicYear: number,
    financialSettings: FinancialSettings,
    schoolSettings: SchoolSettings
) => {
    // ... existing implementation of printStudentStatement ...
    const logoHtml = schoolSettings.schoolLogo 
        ? `<img src="${schoolSettings.schoolLogo}" alt="Logo" style="max-height: 80px; max-width: 80px;" />` 
        : '<div style="width: 80px; height: 80px; background: #eee; border-radius: 50%;"></div>';

    const getCurrencyLocale = (curr: string) => {
        switch(curr) {
            case 'MZN': return 'pt-MZ';
            case 'AOA': return 'pt-AO';
            case 'USD': return 'en-US';
            case 'EUR': return 'pt-PT';
            default: return 'pt-MZ';
        }
    };

    const formatPrice = (price: number) => {
        const locale = getCurrencyLocale(financialSettings.currency);
        return price.toLocaleString(locale, { style: 'currency', currency: financialSettings.currency });
    };

    interface LedgerItem {
        date: string;
        description: string;
        debit: number;
        credit: number;
        type: 'charge' | 'payment';
    }

    const ledger: LedgerItem[] = [];
    const now = new Date();
    
    let monthlyFee = financialSettings.monthlyFee;
    let enrollmentFee = financialSettings.enrollmentFee;
    let renewalFee = financialSettings.renewalFee;

    if (student.desiredClass) {
        const specific = financialSettings.classSpecificFees?.find(c => c.classLevel === student.desiredClass);
        if (specific) {
            monthlyFee = specific.monthlyFee;
            enrollmentFee = specific.enrollmentFee;
            renewalFee = specific.renewalFee;
        }
    }

    const profile = student.financialProfile || { status: 'Normal' };
    if (profile.status === 'Isento Total') {
        monthlyFee = 0;
        enrollmentFee = 0;
        renewalFee = 0;
    } else if (profile.status === 'Desconto Parcial') {
        if (profile.affectedTypes?.includes('Mensalidade')) {
            monthlyFee = monthlyFee * (1 - (profile.discountPercentage || 0) / 100);
        }
        if (profile.affectedTypes?.includes('Matrícula')) {
            enrollmentFee = enrollmentFee * (1 - (profile.discountPercentage || 0) / 100);
        }
        if (profile.affectedTypes?.includes('Renovação')) {
            renewalFee = renewalFee * (1 - (profile.discountPercentage || 0) / 100);
        }
    }

    const hasPaidEnrollment = student.payments?.some(p => p.academicYear === academicYear && p.type === 'Matrícula');
    const hasPaidRenewal = student.payments?.some(p => p.academicYear === academicYear && p.type === 'Renovação');

    const matriculationYear = new Date(student.matriculationDate).getFullYear();
    
    // Automatic Debit Generation (For unpaid items)
    // Only generate if NOT paid. If paid, Block D handles it based on transaction.
    
    if (!hasPaidEnrollment && matriculationYear === academicYear && enrollmentFee > 0) {
        // Double check: if they paid Renewal, they shouldn't owe Enrollment even if date matches
        if (!hasPaidRenewal) {
            ledger.push({
                date: student.matriculationDate,
                description: 'Matrícula / Inscrição (Pendente)',
                debit: enrollmentFee,
                credit: 0,
                type: 'charge'
            });
        }
    }
    // CORREÇÃO: Adicionada verificação !hasPaidEnrollment.
    // Se o aluno pagou Matrícula (Enrollment) para este ano, não deve cobrar Renovação, mesmo que seja aluno antigo.
    else if (!hasPaidRenewal && !hasPaidEnrollment && matriculationYear < academicYear && student.status === 'Ativo' && renewalFee > 0) {
        ledger.push({
            date: `${academicYear}-01-15`,
            description: 'Renovação de Matrícula (Pendente)',
            debit: renewalFee,
            credit: 0,
            type: 'charge'
        });
    }

    const startMonth = 2; 
    const endMonth = 11;
    const monthsNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const matriculationMonth = new Date(student.matriculationDate).getMonth() + 1;
    
    const limitDay = financialSettings.monthlyPaymentLimitDay || 10;
    const penaltyPercent = financialSettings.latePaymentPenaltyPercent || 0;

    for (let m = startMonth; m <= endMonth; m++) {
        if (academicYear > now.getFullYear()) continue;
        if (academicYear === now.getFullYear() && m > (now.getMonth() + 1)) continue;
        if (matriculationYear === academicYear && m < matriculationMonth) continue;

        if (monthlyFee > 0) {
            const dueDate = `${academicYear}-${m.toString().padStart(2, '0')}-01`;
            ledger.push({
                date: dueDate,
                description: `Mensalidade ${monthsNames[m-1]}`,
                debit: monthlyFee,
                credit: 0,
                type: 'charge'
            });

            const penaltyDate = new Date(academicYear, m - 1, limitDay + 1);
            
            if (now >= penaltyDate) {
                const isExemptFromPenalty = profile.status === 'Sem Multa' || profile.status === 'Isento Total';
                
                if (!isExemptFromPenalty && penaltyPercent > 0) {
                    const paymentsForMonth = student.payments?.filter(p => 
                        p.academicYear === academicYear && 
                        (p.type === 'Mensalidade' || p.type === 'Matrícula' || p.type === 'Renovação') && 
                        p.referenceMonth === m
                    ) || [];

                    const limitDateObj = new Date(academicYear, m - 1, limitDay);
                    const limitDateStr = limitDateObj.toISOString().split('T')[0];

                    const paidOnTime = paymentsForMonth.reduce((acc, p) => {
                        if (p.date <= limitDateStr) return acc + p.amount;
                        return acc;
                    }, 0);

                    if (paidOnTime < (monthlyFee - 1)) {
                        const penaltyAmount = monthlyFee * (penaltyPercent / 100);
                        ledger.push({
                            date: penaltyDate.toISOString().split('T')[0],
                            description: `Multa por Atraso (${monthsNames[m-1]})`,
                            debit: penaltyAmount,
                            credit: 0,
                            type: 'charge'
                        });
                    }
                }
            }
        }
    }

    if (student.extraCharges) {
        student.extraCharges.forEach(charge => {
            if (new Date(charge.date).getFullYear() === academicYear) {
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

    if (student.payments) {
        student.payments.forEach(p => {
            if (p.academicYear === academicYear) {
                if (p.type === 'Multa/Danos') return;

                if (p.items && p.items.length > 0) {
                    p.items.forEach(item => {
                        const name = item.item.toLowerCase();
                        const val = item.value;
                        const isTuition = name.includes('mensalidade');
                        if (!isTuition) {
                             ledger.push({
                                date: p.date,
                                description: item.item, // Use explicit item name (e.g. Matrícula, Renovação)
                                debit: val,
                                credit: 0,
                                type: 'charge'
                            });
                        }
                    });
                } 
                else {
                    const t = p.type;
                    if (t !== 'Mensalidade') {
                         ledger.push({
                            date: p.date,
                            description: p.description || t,
                            debit: p.amount,
                            credit: 0,
                            type: 'charge'
                        });
                    }
                }
            }
        });
    }

    if (student.payments) {
        student.payments.forEach(p => {
            if (p.academicYear === academicYear) {
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

    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const tableRows = ledger.map(item => {
        runningBalance += item.debit;
        runningBalance -= item.credit;

        const balanceColor = runningBalance > 0 ? 'color: red;' : 'color: green;';
        
        return `
            <tr>
                <td style="padding: 6px; border-bottom: 1px solid #eee;">${new Date(item.date).toLocaleDateString('pt-BR')}</td>
                <td style="padding: 6px; border-bottom: 1px solid #eee;">${item.description}</td>
                <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; color: #c0392b;">${item.debit > 0 ? formatPrice(item.debit) : '-'}</td>
                <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; color: #27ae60;">${item.credit > 0 ? formatPrice(item.credit) : '-'}</td>
                <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; ${balanceColor}">${formatPrice(runningBalance)}</td>
            </tr>
        `;
    }).join('');

    const documentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Extrato - ${student.name}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; font-size: 12px; }
                .container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
                .school-info { text-align: right; }
                .school-name { font-size: 20px; font-weight: bold; color: #2c3e50; margin: 0; }
                .school-detail { font-size: 11px; color: #7f8c8d; margin: 2px 0; }
                
                .doc-title { text-align: center; font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; background: #f9f9f9; padding: 10px; border-radius: 4px; }
                
                .student-info { margin-bottom: 20px; padding: 10px; border: 1px solid #eee; border-radius: 4px; }
                .student-info p { margin: 4px 0; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { text-align: left; background: #eee; padding: 8px; border-bottom: 2px solid #ccc; font-size: 11px; text-transform: uppercase; }
                
                .summary { text-align: right; font-size: 14px; font-weight: bold; margin-top: 20px; border-top: 2px solid #333; padding-top: 10px; }
                
                .footer { margin-top: 40px; font-size: 9px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">${logoHtml}</div>
                    <div class="school-info">
                        <div class="school-name">${schoolSettings.schoolName || 'Escola'}</div>
                        <div class="school-detail">Ano Lectivo: ${academicYear}</div>
                        <div class="school-detail">Emissão: ${new Date().toLocaleDateString('pt-BR')}</div>
                    </div>
                </div>

                <div class="doc-title">Extrato de Conta Corrente</div>

                <div class="student-info">
                    <p><strong>Aluno:</strong> ${student.name}</p>
                    <p><strong>Código:</strong> ${student.id} | <strong>Classe:</strong> ${student.desiredClass}</p>
                    <p><strong>Encarregado:</strong> ${student.guardianName}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th width="15%">Data</th>
                            <th width="40%">Descrição</th>
                            <th width="15%" style="text-align: right;">Débito</th>
                            <th width="15%" style="text-align: right;">Crédito</th>
                            <th width="15%" style="text-align: right;">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                        ${ledger.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:10px;">Sem movimentos registados.</td></tr>' : ''}
                    </tbody>
                </table>

                <div class="summary">
                    SALDO FINAL: <span style="${runningBalance > 0 ? 'color: red;' : 'color: green;'}">${formatPrice(runningBalance)}</span>
                    <div style="font-size: 10px; color: #7f8c8d; font-weight: normal; margin-top: 5px;">
                        (Valor positivo indica dívida, valor negativo/zero indica situação regularizada)
                    </div>
                </div>

                <div class="footer">
                    Processado por computador. Documento informativo.
                </div>
            </div>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (printWindow) {
        printWindow.document.write(documentHtml);
        printWindow.document.close();
    }
};

const calculateFinalGrade = (acs1: number = 0, acs2: number = 0, at: number = 0, settings: SchoolSettings): number => {
    const p1 = settings.evaluationWeights?.p1 || 40;
    const p2 = settings.evaluationWeights?.p2 || 60;
    const mediaACS = (acs1 + acs2) / 2;
    const final = ((mediaACS * p1) + (at * p2)) / (p1 + p2);
    return parseFloat(final.toFixed(1));
};

const getDetailedGrades = (student: Student, subject: Subject, period: string, year: number, settings: SchoolSettings) => {
    const gradeObj = student.grades?.find(g => g.subject === subject.name && g.period === period && g.academicYear === year);
    const acs1 = gradeObj?.acs1 || 0;
    const acs2 = gradeObj?.acs2 || 0;
    const at = gradeObj?.at || 0;
    const mac = parseFloat(((acs1 + acs2) / 2).toFixed(1));
    const mf = calculateFinalGrade(acs1, acs2, at, settings);
    return { acs1, acs2, mac, at, mf };
};

export const printClassPauta = (
    turma: Turma,
    students: Student[],
    subjects: Subject[],
    options: PrintOptions,
    settings: SchoolSettings,
    hasExam: boolean
) => {
    const period = options.period;
    const type = options.type;
    const subjectId = options.subjectId;
    const subject = subjects.find(s => s.id === subjectId);

    if ((type === 'detailed') && !subject) return;

    let headersHtml = '';
    let rowsHtml = '';

    if (type === 'general') {
        // General: Student | Sub1 | Sub2 ... | Final Avg
        headersHtml = `
            <th style="text-align:left; width: 25%;">Aluno</th>
            ${subjects.map(s => `<th style="text-align:center;">${s.name.substring(0, 3)}</th>`).join('')}
            <th style="text-align:center; background-color:#eee;">Média</th>
        `;

        rowsHtml = students.map(s => {
            let sum = 0;
            let count = 0;
            const cols = subjects.map(sub => {
                const { mf } = getDetailedGrades(s, sub, period as string, turma.academicYear, settings);
                if (mf > 0) { sum += mf; count++; }
                return `<td style="text-align:center; ${mf < 10 && mf > 0 ? 'color:red;' : ''}">${mf > 0 ? mf.toFixed(1) : '-'}</td>`;
            }).join('');
            
            const avg = count > 0 ? (sum / count).toFixed(1) : '-';
            const avgVal = parseFloat(avg);
            
            return `
                <tr>
                    <td style="padding: 5px;">${s.name}</td>
                    ${cols}
                    <td style="text-align:center; font-weight:bold; background-color:#f9f9f9; ${avgVal < 10 && avg !== '-' ? 'color:red;' : ''}">${avg}</td>
                </tr>
            `;
        }).join('');
    } else if (type === 'detailed' && subject) {
        // Detailed for ONE subject: Student | ACS1 | ACS2 | MAC | AT | MF
        headersHtml = `
            <th style="text-align:left;">Aluno</th>
            <th style="text-align:center;">ACS 1</th>
            <th style="text-align:center;">ACS 2</th>
            <th style="text-align:center;">MAC</th>
            <th style="text-align:center;">AT</th>
            <th style="text-align:center; background-color:#eee;">MF</th>
        `;

        rowsHtml = students.map(s => {
            const { acs1, acs2, mac, at, mf } = getDetailedGrades(s, subject, period as string, turma.academicYear, settings);
            return `
                <tr>
                    <td style="padding: 5px;">${s.name}</td>
                    <td style="text-align:center;">${acs1 || '-'}</td>
                    <td style="text-align:center;">${acs2 || '-'}</td>
                    <td style="text-align:center;">${mac || '-'}</td>
                    <td style="text-align:center;">${at || '-'}</td>
                    <td style="text-align:center; font-weight:bold; background-color:#f9f9f9; ${mf < 10 && mf > 0 ? 'color:red;' : ''}">${mf || '-'}</td>
                </tr>
            `;
        }).join('');
    } else if (type === 'general_detailed') {
        // Very Wide Table
        headersHtml = `
            <th style="text-align:left; min-width: 200px;">Aluno</th>
            ${subjects.map(s => `
                <th colspan="5" style="text-align:center; border-left: 2px solid #ccc;">${s.name}</th>
            `).join('')}
        `;
        
        // Second header row logic needs to be handled via custom HTML structure in print template
        // We'll adjust the print template below to accommodate double header if needed, 
        // or just use single row with abbreviated sub-headers like "Mat:MF" which is cleaner for print.
        // For now, let's stick to a simpler approach: Just MF for General, and Detailed is per subject.
        // Implementing 'general_detailed' properly for print requires landscape and tiny font.
        // Simplification: We will just render MF for all subjects (same as general) but maybe add AT? 
        // Let's fallback to 'General' style but maybe with slightly more info if possible, or just stick to General.
        // Actually, let's implement the columns: ACS1, ACS2, MAC, AT, MF for EACH subject.
        
        // Complex header row injection script
    }

    const documentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Pauta - ${turma.name}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 10px; }
                table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
                th, td { border: 1px solid #ccc; padding: 4px; }
                th { background-color: #f0f0f0; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                h1, h2, p { text-align: center; margin: 5px 0; }
                @page { size: landscape; margin: 1cm; }
            </style>
        </head>
        <body>
            <h1>${settings.schoolName || 'Escola'}</h1>
            <h2>Pauta de Aproveitamento - ${period}</h2>
            <p>Turma: ${turma.name} | Classe: ${turma.classLevel} | Turno: ${turma.shift} | Ano: ${turma.academicYear}</p>
            ${type === 'detailed' && subject ? `<p>Disciplina: ${subject.name}</p>` : ''}
            
            <br/>

            <table>
                <thead>
                    <tr>
                        ${headersHtml}
                    </tr>
                    ${type === 'general_detailed' ? `
                    <tr>
                        <th></th>
                        ${subjects.map(() => `
                            <th style="font-size:8px;">ACS1</th>
                            <th style="font-size:8px;">ACS2</th>
                            <th style="font-size:8px;">MAC</th>
                            <th style="font-size:8px;">AT</th>
                            <th style="font-size:8px; font-weight:bold;">MF</th>
                        `).join('')}
                    </tr>
                    ` : ''}
                </thead>
                <tbody>
                    ${type === 'general_detailed' ? students.map(s => `
                        <tr>
                            <td>${s.name}</td>
                            ${subjects.map(sub => {
                                const { acs1, acs2, mac, at, mf } = getDetailedGrades(s, sub, period as string, turma.academicYear, settings);
                                return `
                                    <td style="text-align:center;">${acs1||'-'}</td>
                                    <td style="text-align:center;">${acs2||'-'}</td>
                                    <td style="text-align:center;">${mac||'-'}</td>
                                    <td style="text-align:center;">${at||'-'}</td>
                                    <td style="text-align:center; font-weight:bold; ${mf < 10 && mf > 0 ? 'color:red;' : ''}">${mf||'-'}</td>
                                `;
                            }).join('')}
                        </tr>
                    `).join('') : rowsHtml}
                </tbody>
            </table>
            
            <div style="margin-top: 30px; display: flex; justify-content: space-around;">
                <div style="text-align:center; border-top: 1px solid #000; width: 200px; padding-top:5px;">O Director de Turma</div>
                <div style="text-align:center; border-top: 1px solid #000; width: 200px; padding-top:5px;">O Chefe da Secretaria</div>
                <div style="text-align:center; border-top: 1px solid #000; width: 200px; padding-top:5px;">O Director da Escola</div>
            </div>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    if(win) {
        win.document.write(documentHtml);
        win.document.close();
        // Wait for images etc
        setTimeout(() => win.print(), 500);
    }
}

export const exportClassPautaToExcel = (
    turma: Turma,
    students: Student[],
    subjects: Subject[],
    options: PrintOptions,
    settings: SchoolSettings,
    hasExam: boolean
) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    const period = options.period;
    const type = options.type;
    const subjectId = options.subjectId;
    const subject = subjects.find(s => s.id === subjectId);

    // Header Info
    csvContent += `Escola: ${settings.schoolName}\n`;
    csvContent += `Pauta: ${period}\n`;
    csvContent += `Turma: ${turma.name}, Classe: ${turma.classLevel}, Ano: ${turma.academicYear}\n\n`;

    if (type === 'general') {
        const headerRow = ["ID", "Nome", ...subjects.map(s => s.name), "Media Final"].join(",");
        csvContent += headerRow + "\n";

        students.forEach(s => {
            const grades = subjects.map(sub => {
                const { mf } = getDetailedGrades(s, sub, period as string, turma.academicYear, settings);
                return mf || '';
            });
            
            const validGrades = grades.filter(g => g !== '').map(Number);
            const avg = validGrades.length > 0 ? (validGrades.reduce((a,b) => a+b, 0) / validGrades.length).toFixed(1) : '';

            const row = [`"${s.id}"`, `"${s.name}"`, ...grades, avg].join(",");
            csvContent += row + "\n";
        });
    } else if (type === 'detailed' && subject) {
        csvContent += `Disciplina: ${subject.name}\n`;
        csvContent += "ID,Nome,ACS1,ACS2,MAC,AT,MF\n";
        
        students.forEach(s => {
            const { acs1, acs2, mac, at, mf } = getDetailedGrades(s, subject, period as string, turma.academicYear, settings);
            const row = [`"${s.id}"`, `"${s.name}"`, acs1||'', acs2||'', mac||'', at||'', mf||''].join(",");
            csvContent += row + "\n";
        });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pauta_${turma.name}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
