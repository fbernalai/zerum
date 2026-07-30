import React, { useState } from 'react';
import { X, Printer, Download, Calendar, DollarSign, FileText, CheckCircle2, TrendingDown, PieChart, ShieldCheck, Target, Award, Loader2 } from 'lucide-react';
import { AppState, BuroRecord, DebtPayment, Expense, Income, UserProfileDoc } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  payments: DebtPayment[];
  userProfile?: UserProfileDoc | null;
  buroRecord?: BuroRecord | null;
}

export default function ReportExportModal({
  isOpen,
  onClose,
  state,
  payments,
  userProfile,
  buroRecord
}: ReportExportModalProps) {
  const [filterMonth, setFilterMonth] = useState<string>('todos');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatMXN = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
  };

  // Calculations
  const totalInicial = state.debts.reduce((sum, d) => sum + Number(d.inicial || d.actual || 0), 0);
  const totalActual = state.debts.reduce((sum, d) => sum + Number(d.actual || 0), 0);
  const totalPagadoAcumulado = payments.reduce((sum, p) => sum + Number(p.monto || 0), 0);
  const porcentajePagado = totalInicial > 0 ? Math.min(100, Math.max(0, ((totalInicial - totalActual) / totalInicial) * 100)) : 0;

  // Expenses grouped by Day
  const groupedExpensesByDay: { [fecha: string]: Expense[] } = {};
  const sortedExpenses = [...state.expenses].sort((a, b) => b.fecha.localeCompare(a.fecha));

  sortedExpenses.forEach((g) => {
    if (!groupedExpensesByDay[g.fecha]) {
      groupedExpensesByDay[g.fecha] = [];
    }
    groupedExpensesByDay[g.fecha].push(g);
  });

  const uniqueDays = Object.keys(groupedExpensesByDay).sort((a, b) => b.localeCompare(a));

  // Pure Vector PDF Builder using jsPDF
  const generateZerumPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
    const margin = 12;
    let y = margin;

    const checkAddPage = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, y, pageWidth - margin * 2, 22, 'F');

    // Yellow Z Box
    doc.setFillColor(245, 158, 11); // amber-500
    doc.roundedRect(margin + 4, y + 3.5, 15, 15, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('Z', margin + 11.5, y + 14, { align: 'center' });

    // Header Titles
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text('ZERUM - La Fragua Financiera', margin + 23, y + 10);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text('REPORTE OFICIAL DE ESTADO FINANCIERO & BURÓ DE CRÉDITO', margin + 23, y + 16);

    y += 27;

    // Metadata Box (Titular / Fecha)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(`Titular: ${userProfile?.nombre || 'Usuario Registrado'}`, margin + 4, y + 6);
    doc.text(`Correo: ${userProfile?.correo || 'N/A'}`, margin + 4, y + 11);

    const fechaStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Emisión: ${fechaStr}`, pageWidth - margin - 4, y + 6, { align: 'right' });
    doc.text(`Sistema: ZERUM Intelligence`, pageWidth - margin - 4, y + 11, { align: 'right' });

    y += 21;

    // Section 1: Progress Summary
    checkAddPage(30);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 6);
    doc.text('1. AVANCE GLOBAL DE LIBERACIÓN DE DEUDAS', margin, y);
    y += 4;

    const boxWidth = (pageWidth - margin * 2 - 8) / 3;

    // Box 1: Inicial
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, boxWidth, 16, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('DEUDA INICIAL', margin + 3, y + 5);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatMXN(totalInicial), margin + 3, y + 12);

    // Box 2: Actual
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(margin + boxWidth + 4, y, boxWidth, 16, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.text('POR PAGAR ACTUAL', margin + boxWidth + 7, y + 5);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 53, 15);
    doc.text(formatMXN(totalActual), margin + boxWidth + 7, y + 12);

    // Box 3: Pagado
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(margin + (boxWidth + 4) * 2, y, boxWidth, 16, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(6, 95, 70);
    doc.text('LIBERADO / ABONADO', margin + (boxWidth + 4) * 2 + 3, y + 5);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 78, 59);
    doc.text(`${formatMXN(totalPagadoAcumulado)} (${porcentajePagado.toFixed(1)}%)`, margin + (boxWidth + 4) * 2 + 3, y + 12);

    y += 22;

    // Section 2: Buró de Crédito Record (If available)
    if (buroRecord) {
      checkAddPage(48);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text('2. DIAGNÓSTICO DE BURÓ DE CRÉDITO Y PLAN DE RESCATE', margin, y);
      y += 5;

      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(252, 211, 77);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 38, 2, 2, 'FD');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 53, 15);
      doc.text(`SCORE BC: ${buroRecord.score} PUNTOS (${buroRecord.categoriaScore || 'Evaluado'})`, margin + 4, y + 6);
      doc.text(`Riesgo: ${buroRecord.analisisIA?.nivelRiesgo || 'Evaluado'}`, pageWidth - margin - 4, y + 6, { align: 'right' });

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);

      if (buroRecord.analisisIA?.diagnosticoGeneral) {
        const diagLines = doc.splitTextToSize(`Diagnóstico IA: ${buroRecord.analisisIA.diagnosticoGeneral}`, pageWidth - margin * 2 - 8);
        doc.text(diagLines, margin + 4, y + 13);
      }

      if (buroRecord.deudasEnfocar && buroRecord.deudasEnfocar.length > 0) {
        const focusText = 'Deudas Prioritarias: ' + buroRecord.deudasEnfocar.map(d => `${d.deudaNombre} (${d.prioridad})`).join(' | ');
        const focusLines = doc.splitTextToSize(focusText, pageWidth - margin * 2 - 8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(146, 64, 14);
        doc.text(focusLines, margin + 4, y + 28);
      }

      y += 43;
    }

    // Section 3: Debts Table
    checkAddPage(35);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 6);
    doc.text('3. ESTADO DETALLADO DE CUENTAS Y DEUDAS', margin, y);
    y += 5;

    if (state.debts.length === 0) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text('No hay deudas registradas actualmente.', margin, y);
      y += 8;
    } else {
      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);

      doc.text('Cuenta / Crédito', margin + 2, y + 4.5);
      doc.text('Tipo', margin + 55, y + 4.5);
      doc.text('Monto Inicial', margin + 95, y + 4.5);
      doc.text('Saldo Actual', margin + 130, y + 4.5);
      doc.text('Tasa %', margin + 160, y + 4.5);
      doc.text('Pago Mínimo', margin + 184, y + 4.5, { align: 'right' });

      y += 7;

      state.debts.forEach((debt) => {
        checkAddPage(8);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text((debt.nombre || 'Cuenta').slice(0, 24), margin + 2, y + 4);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text((debt.tipo || 'Crédito').slice(0, 18), margin + 55, y + 4);
        doc.text(formatMXN(debt.inicial || debt.actual), margin + 95, y + 4);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(146, 64, 14);
        doc.text(formatMXN(debt.actual), margin + 130, y + 4);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(`${debt.tasa || 0}%`, margin + 160, y + 4);
        doc.text(formatMXN(debt.pago), margin + 184, y + 4, { align: 'right' });

        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + 5.5, pageWidth - margin, y + 5.5);

        y += 6.5;
      });
      y += 3;
    }

    // Section 4: Expenses Summary
    if (uniqueDays.length > 0) {
      checkAddPage(30);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('4. RESUMEN DIARIO DE GASTOS REGISTRADOS', margin, y);
      y += 5;

      uniqueDays.slice(0, 10).forEach((fecha) => {
        checkAddPage(15);
        const dayExpenses = groupedExpensesByDay[fecha];
        const dayTotal = dayExpenses.reduce((sum, g) => sum + Number(g.monto || 0), 0);

        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, pageWidth - margin * 2, 5.5, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`Fecha: ${fecha}`, margin + 2, y + 4);
        doc.setTextColor(190, 18, 60);
        doc.text(`Total Día: ${formatMXN(dayTotal)}`, pageWidth - margin - 2, y + 4, { align: 'right' });

        y += 6.5;

        dayExpenses.forEach((g) => {
          checkAddPage(6);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.text(`• [${g.categoria}] ${g.nota || 'Gasto registrado'}`, margin + 4, y + 3.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(formatMXN(g.monto), pageWidth - margin - 2, y + 3.5, { align: 'right' });
          y += 5;
        });
        y += 2;
      });
    }

    // Footer
    checkAddPage(12);
    y = Math.max(y + 6, pageHeight - 12);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Generado automáticamente por ZERUM - La Fragua Financiera. Documento privado para control personal.', pageWidth / 2, y, { align: 'center' });

    return doc;
  };

  const handleDownloadPdf = () => {
    setIsExporting(true);
    try {
      const doc = generateZerumPdf();
      const fileName = `Reporte_ZERUM_${new Date().toISOString().slice(0, 10)}.pdf`;

      // Save PDF via jsPDF
      doc.save(fileName);

      // Create Blob URL for fallback direct download / opening in new tab
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(blobUrl);

      // Try opening in new window as secondary trigger
      try {
        const w = window.open(blobUrl, '_blank');
        if (!w) {
          console.log('Pop-up window blocked, blob URL saved for manual click');
        }
      } catch (e) {
        console.warn('Window open error:', e);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Ocurrió un error al generar el PDF. Por favor reintenta.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    try {
      const doc = generateZerumPdf();
      doc.autoPrint();
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const printWin = window.open(blobUrl, '_blank');
      if (!printWin) {
        window.print();
      }
    } catch (err) {
      console.warn('Direct print window error, calling window.print()', err);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        
        {/* Modal Header (Hidden on Print) */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg">
              Z
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white leading-tight">
                Generador de Reporte Financiero & Avances
              </h3>
              <p className="text-xs text-slate-300">
                Resumen ejecutable para descarga inmediata en PDF o impresión
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-md"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold rounded-xl text-xs transition-all cursor-pointer border border-slate-700"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Body */}
        <div id="printable-report" className="p-6 sm:p-8 overflow-y-auto space-y-8 print:p-0 print:overflow-visible">
          
          {/* Download Fallback Banner if generated */}
          {pdfBlobUrl && (
            <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs print:hidden">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                <span>¡Documento PDF listo! Si la descarga no inició automáticamente, usa este enlace:</span>
              </div>
              <a
                href={pdfBlobUrl}
                download={`Reporte_ZERUM_${new Date().toISOString().slice(0, 10)}.pdf`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shrink-0 transition-all shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Abrir / Guardar PDF</span>
              </a>
            </div>
          )}

          {/* Letterhead Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-slate-900">ZERUM</span>
                <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-200">
                  REPORTE OFICIAL
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                La Fragua Financiera • Control de Deudas, Gastos e Historial de Avances
              </p>
            </div>
            
            <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
              <p><strong className="text-slate-900">Titular:</strong> {userProfile?.nombre || 'Usuario Registrado'}</p>
              <p><strong className="text-slate-900">Correo:</strong> {userProfile?.correo || 'N/A'}</p>
              <p><strong className="text-slate-900">Fecha de Emisión:</strong> {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          {/* Executive Progress Cards */}
          <div>
            <h4 className="text-xs uppercase font-extrabold text-slate-500 tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              1. Avance Global de Liberación de Deudas
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 block uppercase">Deuda Inicial Contratada</span>
                <span className="text-lg font-black text-slate-900">{formatMXN(totalInicial)}</span>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200">
                <span className="text-[11px] font-bold text-amber-800 block uppercase">Falta Por Pagar Actual</span>
                <span className="text-lg font-black text-amber-900">{formatMXN(totalActual)}</span>
              </div>

              <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-800 block uppercase">Abonado / Liberado</span>
                <span className="text-lg font-black text-emerald-900">{formatMXN(totalPagadoAcumulado)} ({porcentajePagado.toFixed(1)}%)</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 bg-slate-100 rounded-full h-3 w-full overflow-hidden border border-slate-200">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full transition-all duration-500"
                style={{ width: `${porcentajePagado}%` }}
              />
            </div>
          </div>

          {/* Section 2: Detailed Debts Table */}
          <div>
            <h4 className="text-xs uppercase font-extrabold text-slate-500 tracking-wider mb-3 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-600" />
              2. Estado Detallado de Cuentas y Deudas Pendientes
            </h4>

            {state.debts.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl">No hay deudas registradas actualmente.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Cuenta / Institución</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3 text-right">Monto Inicial</th>
                      <th className="p-3 text-right">Saldo Actual</th>
                      <th className="p-3 text-right">Tasa Anual</th>
                      <th className="p-3 text-right">Pago Mínimo</th>
                      <th className="p-3 text-center">Día Límite</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                    {state.debts.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-900">{d.nombre}</td>
                        <td className="p-3 text-slate-600">{d.tipo}</td>
                        <td className="p-3 text-right font-mono">{formatMXN(d.inicial || d.actual)}</td>
                        <td className="p-3 text-right font-mono font-bold text-amber-900">{formatMXN(d.actual)}</td>
                        <td className="p-3 text-right font-mono">{d.tasa ? `${d.tasa}%` : '0%'}</td>
                        <td className="p-3 text-right font-mono">{formatMXN(d.pago)}</td>
                        <td className="p-3 text-center font-bold">Día {d.diaLimite}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Daily Expense Summaries (Resumen por Día de Gastos) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs uppercase font-extrabold text-slate-500 tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                3. Resumen Diario de Gastos Registrados
              </h4>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {state.expenses.length} Gastos Registrados
              </span>
            </div>

            {uniqueDays.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl">No se han registrado gastos aún.</p>
            ) : (
              <div className="space-y-4">
                {uniqueDays.slice(0, 15).map((fecha) => {
                  const dayExpenses = groupedExpensesByDay[fecha];
                  const dayTotal = dayExpenses.reduce((sum, g) => sum + Number(g.monto || 0), 0);
                  const dateObj = new Date(fecha + 'T12:00:00');
                  const dateFormatted = dateObj.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                  return (
                    <div key={fecha} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                      <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                        <span className="text-xs font-extrabold text-slate-800 capitalize flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {dateFormatted}
                        </span>
                        <span className="text-xs font-black text-rose-700 font-mono">
                          Total Día: {formatMXN(dayTotal)}
                        </span>
                      </div>

                      <div className="p-3 divide-y divide-slate-100 space-y-1">
                        {dayExpenses.map((g) => (
                          <div key={g.id} className="pt-1 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
                                {g.categoria}
                              </span>
                              <span className="text-slate-800 font-medium">{g.nota || 'Gasto registrado'}</span>
                            </div>
                            <span className="font-bold font-mono text-slate-900">
                              {formatMXN(g.monto)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4: Payments Log */}
          {payments.length > 0 && (
            <div>
              <h4 className="text-xs uppercase font-extrabold text-slate-500 tracking-wider mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                4. Historial Reciente de Abonos Realizados a Deudas
              </h4>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Fecha</th>
                      <th className="p-2.5">Deuda Beneficiada</th>
                      <th className="p-2.5 text-right">Monto Abonado</th>
                      <th className="p-2.5">Nota / Folio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                    {payments.slice(0, 10).map((p) => (
                      <tr key={p.id}>
                        <td className="p-2.5 font-mono text-slate-600">{p.fecha}</td>
                        <td className="p-2.5 font-bold text-slate-900">{p.deudaNombre}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-700 font-mono">+{formatMXN(p.monto)}</td>
                        <td className="p-2.5 text-slate-500">{p.nota || 'Abono verificado'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 5: Buró de Crédito e Inteligencia Financiera */}
          {buroRecord && (
            <div>
              <h4 className="text-xs uppercase font-extrabold text-slate-500 tracking-wider mb-3 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                5. Diagnóstico de Buró de Crédito y Plan de Rescate
              </h4>

              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                  <span className="font-bold text-amber-950">
                    Score BC Registrado: <strong className="text-amber-900 text-sm">{buroRecord.score} Puntos</strong> ({buroRecord.categoriaScore})
                  </span>
                  <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300">
                    {buroRecord.analisisIA?.nivelRiesgo || 'Evaluado'}
                  </span>
                </div>

                {buroRecord.analisisIA?.diagnosticoGeneral && (
                  <p className="text-slate-800 leading-relaxed font-medium">
                    <strong>Diagnóstico IA:</strong> {buroRecord.analisisIA.diagnosticoGeneral}
                  </p>
                )}

                {buroRecord.deudasEnfocar && buroRecord.deudasEnfocar.length > 0 && (
                  <div className="pt-2 border-t border-amber-200/60 space-y-1.5">
                    <span className="text-[11px] font-black uppercase text-amber-900 block">Deudas Prioritarias para Enfocar Pagos:</span>
                    {buroRecord.deudasEnfocar.map((item, idx) => (
                      <div key={idx} className="p-2 bg-white rounded-lg border border-amber-200 text-[11px]">
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900">{idx + 1}. {item.deudaNombre}</strong>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                            Prioridad: {item.prioridad}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{item.motivo}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Disclaimer Footer */}
          <div className="pt-6 border-t border-slate-200 text-[10px] text-slate-400 text-center space-y-1">
            <p>Este informe fue generado automáticamente por la aplicación ZERUM - La Fragua Financiera.</p>
            <p>Documento privado para control personal y estrategia de pago de deudas.</p>
          </div>

        </div>

      </div>
    </div>
  );
}
