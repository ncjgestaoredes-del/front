
import { PaymentRecord, SchoolSettings, Student, Subject, Turma, FinancialSettings, ExtraCharge, Grade, ExamResult, AcademicYear, User, DayOfWeek } from "../types";
import { getStudentFinancialLedger, LedgerItem } from "../src/financialUtils";

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
    schoolSettings: SchoolSettings,
    academicYears: AcademicYear[]
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
        const locale = getCurrencyLocale(financialSettings.currency);
        return price.toLocaleString(locale, { style: 'currency', currency: financialSettings.currency });
    };

    // Use unified ledger logic
    const fullLedger = getStudentFinancialLedger(student, academicYears, financialSettings);
    
    // Filter for the selected academic year, but keep track of previous balance
    let previousBalance = 0;
    const currentYearLedger: LedgerItem[] = [];

    fullLedger.forEach((item: LedgerItem) => {
        const itemYear = new Date(item.date).getFullYear();
        // Note: This is a bit simplistic as academic years might not align perfectly with calendar years,
        // but given the app structure, it's usually 1 year = 1 academic year.
        // A better way would be to check the academicYear property if it existed on LedgerItem,
        // but getStudentFinancialLedger uses dates.
        
        if (itemYear < academicYear) {
            previousBalance += item.debit;
            previousBalance -= item.credit;
        } else if (itemYear === academicYear) {
            currentYearLedger.push(item);
        }
    });

    let runningBalance = previousBalance;
    
    const tableRows = currentYearLedger.map((item: LedgerItem) => {
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

    // Add Initial Balance row if exists
    const initialBalanceRow = previousBalance !== 0 ? `
        <tr style="background: #f5f5f5; font-weight: bold;">
            <td style="padding: 6px; border-bottom: 1px solid #eee;">-</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee;">SALDO ANTERIOR (ANOS ANTERIORES)</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">${previousBalance > 0 ? formatPrice(previousBalance) : '-'}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">${previousBalance < 0 ? formatPrice(Math.abs(previousBalance)) : '-'}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; ${previousBalance > 0 ? 'color: red;' : 'color: green;'}">${formatPrice(previousBalance)}</td>
        </tr>
    ` : '';

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
                        ${initialBalanceRow}
                        ${tableRows}
                        ${currentYearLedger.length === 0 && previousBalance === 0 ? '<tr><td colspan="5" style="text-align:center; padding:10px;">Sem movimentos registados.</td></tr>' : ''}
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

export const printStudentAttendanceList = (
    student: Student,
    academicYear: number,
    schoolSettings: SchoolSettings
) => {
    const logoHtml = schoolSettings.schoolLogo 
        ? `<img src="${schoolSettings.schoolLogo}" alt="Logo" style="max-height: 80px; max-width: 80px;" />` 
        : '<div style="width: 80px; height: 80px; background: #eee; border-radius: 50%;"></div>';

    const safeExtractYear = (dateInput: any): number => {
        if (!dateInput) return 0;
        try {
            const d = new Date(dateInput);
            if (!isNaN(d.getTime())) return d.getFullYear();
            const s = String(dateInput);
            const match = s.match(/\d{4}/);
            return match ? parseInt(match[0]) : 0;
        } catch (e) {
            return 0;
        }
    };

    const attendance = student.attendance || [];
    const yearAttendance = attendance.filter(a => {
        return safeExtractYear(a.date) === academicYear;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const stats = {
        presente: yearAttendance.filter(a => a.status === 'Presente').length,
        ausente: yearAttendance.filter(a => a.status === 'Ausente').length,
        atrasado: yearAttendance.filter(a => a.status === 'Atrasado').length,
    };

    const rowsHtml = yearAttendance.map(a => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(a.date).toLocaleDateString('pt-BR')}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: ${a.status === 'Presente' ? '#27ae60' : a.status === 'Ausente' ? '#c0392b' : '#f39c12'};">
                ${a.status}
            </td>
        </tr>
    `).join('');

    const documentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Lista de Presença - ${student.name}</title>
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
                
                .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
                .stat-card { border: 1px solid #eee; padding: 10px; border-radius: 8px; text-align: center; }
                .stat-value { font-size: 18px; font-weight: bold; }
                .stat-label { font-size: 10px; text-transform: uppercase; color: #7f8c8d; }

                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { text-align: left; background: #eee; padding: 8px; border-bottom: 2px solid #ccc; font-size: 11px; text-transform: uppercase; }
                
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

                <div class="doc-title">Relatório de Assiduidade</div>

                <div class="student-info">
                    <p><strong>Aluno:</strong> ${student.name}</p>
                    <p><strong>Código:</strong> ${student.id} | <strong>Classe:</strong> ${student.desiredClass}</p>
                    <p><strong>Encarregado:</strong> ${student.guardianName}</p>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value" style="color: #27ae60;">${stats.presente}</div>
                        <div class="stat-label">Presenças</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #c0392b;">${stats.ausente}</div>
                        <div class="stat-label">Faltas</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #f39c12;">${stats.atrasado}</div>
                        <div class="stat-label">Atrasos</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th width="50%">Data</th>
                            <th width="50%">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="2" style="text-align:center; padding:20px;">Sem registos de assiduidade para este ano.</td></tr>'}
                    </tbody>
                </table>

                <div class="footer">
                    Documento informativo gerado pelo Sistema de Gestão Escolar.
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

const getAnnualSummary = (student: Student, subject: Subject, year: number) => {
    const grades = student.grades?.filter(g => g.subject === subject.name && g.academicYear === year) || [];
    const g1 = grades.find(g => g.period === '1º Trimestre')?.grade || 0;
    const g2 = grades.find(g => g.period === '2º Trimestre')?.grade || 0;
    const g3 = grades.find(g => g.period === '3º Trimestre')?.grade || 0;
    const mediaInterna = parseFloat(((g1 + g2 + g3) / 3).toFixed(1));
    const exam = student.examGrades?.find((e: ExamResult) => e.subject === subject.name && e.academicYear === year)?.grade || 0;
    return { g1, g2, g3, mediaInterna, exam };
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
        // General: Student | Sub1 | Sub2 ... | Final Avg | Result
        headersHtml = `
            <th style="text-align:left; width: 25%;">Aluno</th>
            ${subjects.map(s => `<th style="text-align:center;">${s.name.substring(0, 3)}</th>`).join('')}
            <th style="text-align:center; background-color:#eee;">Média</th>
            <th style="text-align:center;">Resultado</th>
        `;

        rowsHtml = students.map(s => {
            let sum = 0;
            let count = 0;
            const cols = subjects.map(sub => {
                let mf = 0;
                if (period === 'Situação Anual') {
                    const { mediaInterna, exam } = getAnnualSummary(s, sub, turma.academicYear);
                    mf = hasExam ? parseFloat(((mediaInterna * 0.4) + (exam * 0.6)).toFixed(1)) : mediaInterna;
                } else {
                    const grades = getDetailedGrades(s, sub, period as string, turma.academicYear, settings);
                    mf = grades.mf;
                }
                
                if (mf > 0) { sum += mf; count++; }
                return `<td style="text-align:center; ${mf < 10 && mf > 0 ? 'color:red;' : ''}">${mf > 0 ? mf.toFixed(1) : '-'}</td>`;
            }).join('');
            
            const avg = count > 0 ? (sum / count).toFixed(1) : '-';
            const avgVal = parseFloat(avg);
            const isApproved = avgVal >= 9.5 && !s.failedByAbsences;
            
            return `
                <tr>
                    <td style="padding: 5px;">${s.name}</td>
                    ${cols}
                    <td style="text-align:center; font-weight:bold; background-color:#f9f9f9; ${avgVal < 10 && avg !== '-' ? 'color:red;' : ''}">${avg}</td>
                    <td style="text-align:center; font-size: 8px;">
                        ${s.failedByAbsences ? '<span style="color:red; font-weight:bold;">RPF</span>' : (avgVal >= 9.5 ? '<span style="color:green;">AP</span>' : '<span style="color:red;">RP</span>')}
                    </td>
                </tr>
            `;
        }).join('');
    } else if (type === 'detailed' && subject) {
        // Detailed for ONE subject: Student | ACS1 | ACS2 | MAC | AT | MF
        if (period === 'Situação Anual') {
            headersHtml = `
                <th style="text-align:left;">Aluno</th>
                <th style="text-align:center;">1º Trim</th>
                <th style="text-align:center;">2º Trim</th>
                <th style="text-align:center;">3º Trim</th>
                <th style="text-align:center;">Média Interna</th>
                ${hasExam ? '<th style="text-align:center;">Exame</th>' : ''}
                <th style="text-align:center; background-color:#eee;">Nota Final</th>
                <th style="text-align:center;">Resultado</th>
            `;
            
            rowsHtml = students.map(s => {
                const { g1, g2, g3, mediaInterna, exam } = getAnnualSummary(s, subject, turma.academicYear);
                const final = hasExam ? parseFloat(((mediaInterna * 0.4) + (exam * 0.6)).toFixed(1)) : mediaInterna;
                const isApproved = final >= 9.5 && !s.failedByAbsences;
                
                return `
                    <tr>
                        <td style="padding: 5px;">${s.name}</td>
                        <td style="text-align:center;">${g1 || '-'}</td>
                        <td style="text-align:center;">${g2 || '-'}</td>
                        <td style="text-align:center;">${g3 || '-'}</td>
                        <td style="text-align:center;">${mediaInterna || '-'}</td>
                        ${hasExam ? `<td style="text-align:center;">${exam || '-'}</td>` : ''}
                        <td style="text-align:center; font-weight:bold; background-color:#f9f9f9; ${final < 10 && final > 0 ? 'color:red;' : ''}">${final || '-'}</td>
                        <td style="text-align:center; font-size: 8px;">
                            ${s.failedByAbsences ? '<span style="color:red; font-weight:bold;">RPF</span>' : (isApproved ? '<span style="color:green;">AP</span>' : '<span style="color:red;">RP</span>')}
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
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
        }
    } else if (type === 'general_detailed') {
        // Very Wide Table
        headersHtml = `
            <th style="text-align:left; min-width: 200px;">Aluno</th>
            ${subjects.map(s => `
                <th colspan="5" style="text-align:center; border-left: 2px solid #ccc;">${s.name}</th>
            `).join('')}
            <th style="text-align:center; border-left: 2px solid #ccc;">Resultado</th>
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
                    ${type === 'general_detailed' ? students.map(s => {
                        let totalSum = 0;
                        let subjectsCount = 0;
                        const cols = subjects.map(sub => {
                            const { acs1, acs2, mac, at, mf } = getDetailedGrades(s, sub, period as string, turma.academicYear, settings);
                            if (mf > 0) { totalSum += mf; subjectsCount++; }
                            return `
                                <td style="text-align:center;">${acs1||'-'}</td>
                                <td style="text-align:center;">${acs2||'-'}</td>
                                <td style="text-align:center;">${mac||'-'}</td>
                                <td style="text-align:center;">${at||'-'}</td>
                                <td style="text-align:center; font-weight:bold; ${mf < 10 && mf > 0 ? 'color:red;' : ''}">${mf||'-'}</td>
                            `;
                        }).join('');
                        
                        const avg = subjectsCount > 0 ? totalSum / subjectsCount : 0;
                        const isApproved = avg >= 9.5 && !s.failedByAbsences;
                        
                        return `
                            <tr>
                                <td>${s.name}</td>
                                ${cols}
                                <td style="text-align:center; font-size: 8px; border-left: 2px solid #ccc;">
                                    ${s.failedByAbsences ? '<span style="color:red; font-weight:bold;">RPF</span>' : (isApproved ? '<span style="color:green;">AP</span>' : '<span style="color:red;">RP</span>')}
                                </td>
                            </tr>
                        `;
                    }).join('') : rowsHtml}
                </tbody>
            </table>
            
            <div style="margin-top: 10px; font-size: 8px; color: #666;">
                <strong>Legenda:</strong> AP: Aprovado | RP: Reprovado | RPF: Reprovado por Faltas
            </div>
            
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

export const printTurmaAttendanceList = (
    turma: Turma,
    students: Student[],
    schoolSettings: SchoolSettings,
    month?: number,
    year?: number
) => {
    const logoHtml = schoolSettings.schoolLogo 
        ? `<img src="${schoolSettings.schoolLogo}" alt="Logo" style="max-height: 60px; max-width: 60px;" />` 
        : '<div style="width: 60px; height: 60px; background: #eee; border-radius: 50%;"></div>';

    // Se não for passado mês/ano, usa o atual
    const now = new Date();
    const targetMonth = month || (now.getMonth() + 1);
    const targetYear = year || turma.academicYear || now.getFullYear();

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = monthNames[targetMonth - 1];

    // Get number of days in month
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    // Generate columns for days
    const daysHeader = Array.from({ length: 31 }, (_, i) => {
        const day = i + 1;
        const isInvalidDay = day > daysInMonth;
        return `<th style="width: 20px; font-size: 8px; ${isInvalidDay ? 'background-color: #eee;' : ''}">${day}</th>`;
    }).join('');
    
    const getAttendanceSymbol = (status?: string, justification?: string) => {
        if (status === 'Ausente' && justification) return 'J';
        switch (status) {
            case 'Presente': return 'P';
            case 'Ausente': return 'A';
            case 'Atrasado': return 'T';
            default: return '';
        }
    };

    const rowsHtml = students.map((s, index) => {
        let countP = 0;
        let countA = 0;
        let countT = 0;
        let countJ = 0;

        const dayCells = Array.from({ length: 31 }, (_, i) => {
            const day = i + 1;
            if (day > daysInMonth) return `<td style="border: 1px solid #ccc; background-color: #eee;"></td>`;

            // Format date as YYYY-MM-DD
            const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = s.attendance?.find(a => a.date === dateStr);
            const symbol = getAttendanceSymbol(record?.status, record?.justification);
            
            if (symbol === 'P') countP++;
            if (symbol === 'A') countA++;
            if (symbol === 'T') countT++;
            if (symbol === 'J') countJ++;

            let color = '#333';
            if (symbol === 'A') color = '#ef4444';
            if (symbol === 'J') color = '#3b82f6';
            if (symbol === 'T') color = '#f59e0b';
            if (symbol === 'P') color = '#10b981';

            return `<td style="border: 1px solid #ccc; text-align: center; font-size: 9px; font-weight: bold; color: ${color};">${symbol}</td>`;
        }).join('');

        return `
            <tr>
                <td style="text-align: center; font-size: 9px;">${index + 1}</td>
                <td style="padding: 4px 8px; font-size: 10px; white-space: nowrap;">${s.name}</td>
                ${dayCells}
                <td style="text-align: center; font-size: 9px; font-weight: bold; background: #f0fff4;">${countP}</td>
                <td style="text-align: center; font-size: 9px; font-weight: bold; background: #fff5f5; color: #ef4444;">${countA}</td>
                <td style="text-align: center; font-size: 9px; font-weight: bold; background: #eff6ff; color: #3b82f6;">${countJ}</td>
                <td style="text-align: center; font-size: 9px; font-weight: bold; background: #fffbeb; color: #f59e0b;">${countT}</td>
            </tr>
        `;
    }).join('');

    const documentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Lista de Presenças - ${turma.name}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #444; padding-bottom: 10px; }
                .school-info { text-align: right; }
                .school-name { font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase; }
                .doc-title { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0; text-transform: uppercase; text-decoration: underline; }
                .class-info { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 11px; font-weight: bold; background: #f5f5f5; padding: 8px; border: 1px solid #ddd; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #666; padding: 2px; }
                th { background-color: #f0f0f0; font-weight: bold; }
                
                .footer { margin-top: 30px; display: flex; justify-content: space-around; font-size: 10px; }
                .sig-box { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; margin-top: 40px; }
                
                @media print {
                    @page { size: landscape; margin: 0.5cm; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">${logoHtml}</div>
                <div class="school-info">
                    <div class="school-name">${schoolSettings.schoolName || 'Instituição de Ensino'}</div>
                    <div style="font-size: 10px;">${schoolSettings.address || ''}</div>
                    <div style="font-size: 10px;">${schoolSettings.contact || ''}</div>
                </div>
            </div>

            <div class="doc-title">Lista de Presenças / Mapa de Assiduidade</div>
            
            <div class="class-info">
                <span>TURMA: ${turma.name}</span>
                <span>CLASSE: ${turma.classLevel}</span>
                <span>TURNO: ${turma.shift}</span>
                <span>ANO LECTIVO: ${turma.academicYear}</span>
                <span>MÊS: ${monthName.toUpperCase()}</span>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 30px; font-size: 9px;">Nº</th>
                        <th style="text-align: left; padding-left: 10px; font-size: 10px;">Nome Completo do Aluno</th>
                        ${daysHeader}
                        <th style="width: 25px; font-size: 8px; background: #e6fffa;">P</th>
                        <th style="width: 25px; font-size: 8px; background: #fff5f5;">A</th>
                        <th style="width: 25px; font-size: 8px; background: #eff6ff;">J</th>
                        <th style="width: 25px; font-size: 8px; background: #fffbeb;">T</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div class="footer">
                <div class="sig-box">O(A) Professor(a)</div>
                <div class="sig-box">O Director de Turma</div>
                <div class="sig-box">A Direcção</div>
            </div>

            <div style="margin-top: 20px; font-size: 8px; text-align: center; color: #888;">
                Legenda: P - Presente | A - Ausente | J - Justificada | T - Atraso
            </div>

            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
        win.document.write(documentHtml);
        win.document.close();
    }
};

export const printSchedule = (
    turma: Turma,
    subjects: Subject[],
    users: User[],
    schoolSettings: SchoolSettings
) => {
    const logoHtml = schoolSettings.schoolLogo 
        ? `<img src="${schoolSettings.schoolLogo}" alt="Logo" style="max-height: 60px; max-width: 60px;" />` 
        : '<div style="width: 60px; height: 60px; background: #eee; border-radius: 50%;"></div>';

    const DAYS: DayOfWeek[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    const lessonDuration = schoolSettings.lessonDurationMinutes || 45;
    const breakDuration = schoolSettings.breakDurationMinutes || 15;

    const getTimeSlots = () => {
        const slots: { start: string, end: string }[] = [];
        let startTime = '07:30';
        let numLessons = 6;

        if (turma.shift === 'Manhã') {
            startTime = '07:30';
        } else if (turma.shift === 'Tarde') {
            startTime = '13:00';
        } else {
            startTime = '18:00';
            numLessons = 5;
        }

        let currentMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);

        for (let i = 0; i < numLessons; i++) {
            const startH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
            const startM = (currentMinutes % 60).toString().padStart(2, '0');
            const startStr = `${startH}:${startM}`;

            currentMinutes += lessonDuration;

            const endH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
            const endM = (currentMinutes % 60).toString().padStart(2, '0');
            const endStr = `${endH}:${endM}`;

            slots.push({ start: startStr, end: endStr });

            if (i === 2) {
                currentMinutes += breakDuration;
            }
        }
        return slots;
    };

    const timeSlots = getTimeSlots();
    const schedule = turma.schedule || [];

    const getEntry = (day: DayOfWeek, startTime: string) => {
        return schedule.find(e => e.dayOfWeek === day && e.startTime === startTime);
    };

    const rowsHtml = timeSlots.map(slot => {
        const dayCells = DAYS.map(day => {
            const entry = getEntry(day, slot.start);
            const subject = entry ? subjects.find(s => s.id === entry.subjectId) : null;
            const teacher = entry ? users.find(u => u.id === entry.teacherId) : null;

            return `
                <td style="border: 1px solid #ccc; padding: 8px; text-align: center; height: 50px; vertical-align: middle;">
                    ${entry ? `
                        <div style="font-weight: bold; font-size: 10px;">${subject?.name || 'Disciplina'}</div>
                        <div style="font-size: 8px; color: #666;">Prof. ${teacher?.name.split(' ')[0] || 'N/A'}</div>
                    ` : ''}
                </td>
            `;
        }).join('');

        return `
            <tr>
                <td style="border: 1px solid #ccc; padding: 8px; text-align: center; background: #f9f9f9; font-weight: bold; font-size: 10px;">
                    ${slot.start} - ${slot.end}
                </td>
                ${dayCells}
            </tr>
        `;
    }).join('');

    const documentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Horário Escolar - ${turma.name}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #444; padding-bottom: 10px; }
                .school-info { text-align: right; }
                .school-name { font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase; }
                .doc-title { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0; text-transform: uppercase; text-decoration: underline; }
                .class-info { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 11px; font-weight: bold; background: #f5f5f5; padding: 8px; border: 1px solid #ddd; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
                th, td { border: 1px solid #666; padding: 4px; }
                th { background-color: #f0f0f0; font-weight: bold; font-size: 10px; }
                
                @media print {
                    @page { size: landscape; margin: 1cm; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">${logoHtml}</div>
                <div class="school-info">
                    <div class="school-name">${schoolSettings.schoolName || 'Instituição de Ensino'}</div>
                    <div style="font-size: 10px;">Ano Lectivo: ${turma.academicYear}</div>
                </div>
            </div>

            <div class="doc-title">Horário Escolar Semanal</div>
            
            <div class="class-info">
                <span>TURMA: ${turma.name}</span>
                <span>CLASSE: ${turma.classLevel}</span>
                <span>TURNO: ${turma.shift}</span>
                <span>SALA: ${turma.room || 'N/A'}</span>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 100px;">Horário</th>
                        ${DAYS.map(day => `<th>${day}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div style="margin-top: 40px; display: flex; justify-content: space-around; font-size: 10px;">
                <div style="border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px;">O Director de Turma</div>
                <div style="border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px;">A Direcção</div>
            </div>

            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
        win.document.write(documentHtml);
        win.document.close();
    }
};

export const printStudentReportCard = (
    student: Student,
    academicYear: number,
    subjects: Subject[],
    schoolSettings: SchoolSettings
) => {
    const logoHtml = schoolSettings.schoolLogo 
        ? `<img src="${schoolSettings.schoolLogo}" alt="Logo" style="max-height: 80px; max-width: 80px;" />` 
        : '<div style="width: 80px; height: 80px; background: #eee; border-radius: 50%;"></div>';

    const periods = ['1º Trimestre', '2º Trimestre', '3º Trimestre'];
    
    const rowsHtml = subjects.map(subject => {
        const periodGrades = periods.map(period => {
            const { mf } = getDetailedGrades(student, subject, period, academicYear, schoolSettings);
            return mf > 0 ? mf.toFixed(1) : '-';
        });

        // Calculate Annual Average
        const validGrades = periodGrades.filter(g => g !== '-').map(Number);
        const annualAvg = validGrades.length > 0 ? (validGrades.reduce((a, b) => a + b, 0) / validGrades.length).toFixed(1) : '-';
        const annualAvgVal = parseFloat(annualAvg);

        return `
            <tr>
                <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${subject.name}</td>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center; ${parseFloat(periodGrades[0]) < 10 ? 'color: red;' : ''}">${periodGrades[0]}</td>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center; ${parseFloat(periodGrades[1]) < 10 ? 'color: red;' : ''}">${periodGrades[1]}</td>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center; ${parseFloat(periodGrades[2]) < 10 ? 'color: red;' : ''}">${periodGrades[2]}</td>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center; font-weight: bold; background: #f5f5f5; ${annualAvgVal < 10 ? 'color: red;' : ''}">${annualAvg}</td>
            </tr>
        `;
    }).join('');

    const documentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Boletim Escolar - ${student.name}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #444; padding-bottom: 10px; }
                .school-info { text-align: right; }
                .school-name { font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase; }
                .doc-title { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0; text-transform: uppercase; text-decoration: underline; }
                .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 12px; background: #f9f9f9; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #666; padding: 8px; }
                th { background-color: #f0f0f0; font-weight: bold; font-size: 11px; text-transform: uppercase; }
                
                .footer { margin-top: 50px; display: flex; justify-content: space-around; font-size: 11px; }
                .sig-box { border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 5px; margin-top: 40px; }
                
                @media print {
                    @page { size: portrait; margin: 1.5cm; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">${logoHtml}</div>
                <div class="school-info">
                    <div class="school-name">${schoolSettings.schoolName || 'Instituição de Ensino'}</div>
                    <div style="font-size: 10px;">Ano Lectivo: ${academicYear}</div>
                </div>
            </div>

            <div class="doc-title">Boletim de Aproveitamento Escolar</div>
            
            <div class="student-info">
                <div><strong>Aluno:</strong> ${student.name}</div>
                <div><strong>Código:</strong> ${student.id}</div>
                <div><strong>Classe:</strong> ${student.desiredClass}</div>
                <div><strong>Turma:</strong> ${student.turmaName || 'N/A'}</div>
                <div><strong>Encarregado:</strong> ${student.guardianName}</div>
                <div><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="text-align: left;">Disciplinas</th>
                        <th>1º Trimestre</th>
                        <th>2º Trimestre</th>
                        <th>3º Trimestre</th>
                        <th style="background: #e0e0e0;">Média Anual</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div style="margin-top: 30px; font-size: 11px; background: #f5f5f5; padding: 10px; border-radius: 4px;">
                <strong>Observações:</strong> ${student.failedByAbsences ? '<span style="color: red;">Reprovado por Faltas.</span>' : 'Aproveitamento regular.'}
            </div>

            <div class="footer">
                <div class="sig-box">O Director de Turma</div>
                <div class="sig-box">A Direcção Pedagógica</div>
            </div>

            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
        win.document.write(documentHtml);
        win.document.close();
    }
};

export const printEnrollmentCertificate = (
    student: Student,
    academicYear: number,
    schoolSettings: SchoolSettings
) => {
    const logoHtml = schoolSettings.schoolLogo 
        ? `<img src="${schoolSettings.schoolLogo}" alt="Logo" style="max-height: 100px; max-width: 100px;" />` 
        : '<div style="width: 100px; height: 100px; background: #eee; border-radius: 50%;"></div>';

    const documentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Declaração de Matrícula - ${student.name}</title>
            <style>
                body { font-family: 'Times New Roman', Times, serif; padding: 50px; line-height: 1.6; color: #000; font-size: 14pt; }
                .header { text-align: center; margin-bottom: 50px; }
                .school-name { font-size: 22pt; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                .school-detail { font-size: 10pt; margin: 2px 0; }
                
                .doc-title { text-align: center; font-size: 18pt; font-weight: bold; text-transform: uppercase; margin: 60px 0; text-decoration: underline; }
                
                .content { text-align: justify; margin-bottom: 60px; text-indent: 50px; }
                
                .date-place { text-align: right; margin-bottom: 80px; }
                
                .signature { text-align: center; }
                .sig-line { border-top: 1px solid #000; width: 300px; margin: 0 auto; padding-top: 5px; font-weight: bold; }
                
                @media print {
                    @page { size: portrait; margin: 2.5cm; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                ${logoHtml}
                <div class="school-name">${schoolSettings.schoolName || 'Instituição de Ensino'}</div>
                <div class="school-detail">${schoolSettings.address || ''}</div>
                <div class="school-detail">Contatos: ${schoolSettings.contact || ''} | Email: ${schoolSettings.email || ''}</div>
                <div class="school-detail"><strong>NUIT: ${schoolSettings.nuit || ''}</strong></div>
            </div>

            <div class="doc-title">Declaração de Matrícula</div>
            
            <div class="content">
                Para os devidos efeitos, declara-se que <strong>${student.name}</strong>, 
                filho(a) de ${student.fatherName || 'N/A'} e de ${student.motherName || 'N/A'}, 
                natural de ${student.placeOfBirth || 'N/A'}, nascido(a) aos ${new Date(student.birthDate).toLocaleDateString('pt-BR')}, 
                portador(a) do documento de identificação ${student.idDocumentType || 'BI'} nº ${student.idDocumentNumber || 'N/A'}, 
                encontra-se regularmente matriculado(a) nesta instituição de ensino, frequentando a 
                <strong>${student.desiredClass}</strong>, no Ano Lectivo de <strong>${academicYear}</strong>.
            </div>

            <div class="content">
                Por ser verdade e ter sido solicitado, mandou-se passar a presente declaração que vai por nós assinada e autenticada com o carimbo a óleo em uso nesta instituição.
            </div>

            <div class="date-place">
                ${schoolSettings.address?.split(',')[0] || 'Cidade'}, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>

            <div class="signature">
                <div class="sig-line">A Direcção da Escola</div>
            </div>

            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
        win.document.write(documentHtml);
        win.document.close();
    }
};

export const printStudentEnrollmentForm = (
    student: Student,
    schoolSettings: SchoolSettings
) => {
    const logoHtml = schoolSettings.schoolLogo 
        ? `<img src="${schoolSettings.schoolLogo}" alt="Logo" style="max-height: 70px; max-width: 70px;" />` 
        : '<div style="width: 70px; height: 70px; background: #eee; border-radius: 50%;"></div>';

    const documentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ficha de Matrícula - ${student.name}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #333; font-size: 11px; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .school-name { font-size: 16px; font-weight: bold; text-transform: uppercase; }
                .doc-title { text-align: center; font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; }
                
                .section { border: 1px solid #ccc; padding: 10px; margin-bottom: 15px; border-radius: 4px; }
                .section-title { font-weight: bold; text-transform: uppercase; background: #eee; padding: 5px; margin: -10px -10px 10px -10px; border-bottom: 1px solid #ccc; font-size: 10px; }
                
                .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
                .field { margin-bottom: 5px; }
                .label { font-weight: bold; color: #666; font-size: 9px; text-transform: uppercase; }
                .value { font-size: 11px; border-bottom: 1px dotted #ccc; display: block; padding: 2px 0; }
                
                .photo-placeholder { width: 100px; height: 120px; border: 1px dashed #999; display: flex; align-items: center; text-align: center; font-size: 9px; color: #999; }
                
                @media print {
                    @page { size: portrait; margin: 1.5cm; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">${logoHtml}</div>
                <div style="text-align: right;">
                    <div class="school-name">${schoolSettings.schoolName || 'Escola'}</div>
                    <div style="font-size: 9px;">Matrícula Nº: ${student.id}</div>
                </div>
            </div>

            <div class="doc-title">Ficha de Matrícula / Renovação</div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div style="flex: 1; margin-right: 20px;">
                    <div class="section">
                        <div class="section-title">Dados do Aluno</div>
                        <div class="field"><span class="label">Nome Completo:</span> <span class="value">${student.name}</span></div>
                        <div class="grid">
                            <div class="field"><span class="label">Data de Nascimento:</span> <span class="value">${new Date(student.birthDate).toLocaleDateString('pt-BR')}</span></div>
                            <div class="field"><span class="label">Género:</span> <span class="value">${student.gender === 'M' ? 'Masculino' : 'Feminino'}</span></div>
                            <div class="field"><span class="label">Naturalidade:</span> <span class="value">${student.placeOfBirth || 'N/A'}</span></div>
                            <div class="field"><span class="label">Nacionalidade:</span> <span class="value">${student.nationality || 'Moçambicana'}</span></div>
                        </div>
                        <div class="grid">
                            <div class="field"><span class="label">Documento:</span> <span class="value">${student.idDocumentType || 'BI'}</span></div>
                            <div class="field"><span class="label">Número:</span> <span class="value">${student.idDocumentNumber || 'N/A'}</span></div>
                        </div>
                    </div>
                </div>
                <div class="photo-placeholder">Colar Foto 3x4</div>
            </div>

            <div class="section">
                <div class="section-title">Filiação</div>
                <div class="field"><span class="label">Nome do Pai:</span> <span class="value">${student.fatherName || 'N/A'}</span></div>
                <div class="field"><span class="label">Nome da Mãe:</span> <span class="value">${student.motherName || 'N/A'}</span></div>
            </div>

            <div class="section">
                <div class="section-title">Dados Académicos</div>
                <div class="grid">
                    <div class="field"><span class="label">Classe:</span> <span class="value">${student.desiredClass}</span></div>
                    <div class="field"><span class="label">Turno:</span> <span class="value">${student.shift || 'N/A'}</span></div>
                    <div class="field"><span class="label">Escola Anterior:</span> <span class="value">${student.previousSchool || 'N/A'}</span></div>
                    <div class="field"><span class="label">Data de Matrícula:</span> <span class="value">${new Date(student.matriculationDate).toLocaleDateString('pt-BR')}</span></div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Dados do Encarregado</div>
                <div class="field"><span class="label">Nome do Encarregado:</span> <span class="value">${student.guardianName}</span></div>
                <div class="grid">
                    <div class="field"><span class="label">Parentesco:</span> <span class="value">${student.guardianRelationship || 'N/A'}</span></div>
                    <div class="field"><span class="label">Contacto:</span> <span class="value">${student.guardianContact}</span></div>
                    <div class="field"><span class="label">Email:</span> <span class="value">${student.guardianEmail || 'N/A'}</span></div>
                    <div class="field"><span class="label">Endereço:</span> <span class="value">${student.address || 'N/A'}</span></div>
                </div>
            </div>

            <div style="margin-top: 50px; display: flex; justify-content: space-around;">
                <div style="text-align: center; border-top: 1px solid #000; width: 200px; padding-top: 5px;">Assinatura do Encarregado</div>
                <div style="text-align: center; border-top: 1px solid #000; width: 200px; padding-top: 5px;">A Secretaria</div>
            </div>

            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
        win.document.write(documentHtml);
        win.document.close();
    }
};

export const printDebtorsList = (
    debtors: { student: Student, debt: number }[],
    academicYear: number,
    schoolSettings: SchoolSettings,
    currency: string = 'MZN'
) => {
    const logoHtml = schoolSettings.schoolLogo 
        ? `<img src="${schoolSettings.schoolLogo}" alt="Logo" style="max-height: 60px; max-width: 60px;" />` 
        : '<div style="width: 60px; height: 60px; background: #eee; border-radius: 50%;"></div>';

    const formatPrice = (price: number) => {
        return price.toLocaleString('pt-MZ', { style: 'currency', currency: currency });
    };

    const totalDebt = debtors.reduce((acc, curr) => acc + curr.debt, 0);

    const rowsHtml = debtors.map((d, index) => `
        <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td>${d.student.name}</td>
            <td>${d.student.desiredClass}</td>
            <td>${d.student.guardianContact}</td>
            <td style="text-align: right; font-weight: bold; color: #c0392b;">${formatPrice(d.debt)}</td>
        </tr>
    `).join('');

    const documentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Lista de Devedores - ${academicYear}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #333; font-size: 11px; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .school-name { font-size: 16px; font-weight: bold; text-transform: uppercase; }
                .doc-title { text-align: center; font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; color: #c0392b; }
                
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ccc; padding: 8px; }
                th { background-color: #f5f5f5; font-weight: bold; text-transform: uppercase; font-size: 10px; }
                
                .total-box { margin-top: 20px; text-align: right; font-size: 14px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; }
                
                @media print {
                    @page { size: portrait; margin: 1.5cm; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">${logoHtml}</div>
                <div style="text-align: right;">
                    <div class="school-name">${schoolSettings.schoolName || 'Escola'}</div>
                    <div style="font-size: 9px;">Ano Lectivo: ${academicYear}</div>
                </div>
            </div>

            <div class="doc-title">Relatório de Alunos com Propinas em Atraso</div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 30px;">Nº</th>
                        <th>Nome do Aluno</th>
                        <th>Classe</th>
                        <th>Contacto Encarregado</th>
                        <th style="text-align: right;">Dívida Estimada</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml || '<tr><td colspan="5" style="text-align:center;">Nenhum devedor encontrado.</td></tr>'}
                </tbody>
            </table>

            <div class="total-box">
                VALOR TOTAL EM DÍVIDA: ${formatPrice(totalDebt)}
            </div>

            <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #666;">
                Este relatório baseia-se nas mensalidades não pagas até ao mês corrente.
            </div>

            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
        win.document.write(documentHtml);
        win.document.close();
    }
};
