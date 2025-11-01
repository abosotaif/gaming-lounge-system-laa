import React, { useState, useRef } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Report } from '../../types';
import jsPDF from 'jspdf';
// FIX: Switched to functional usage of jspdf-autotable to resolve module augmentation error.
import autoTable from 'jspdf-autotable';
import { useTranslation } from '../../hooks/useTranslation';

const ReportsView: React.FC = () => {
  const { reports } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  const filteredReports = reports.filter(r => r.date === selectedDate);
  const totalRevenue = filteredReports.reduce((sum, r) => sum + r.cost, 0);

  const handleSaveHTML = () => {
    const tableRows = filteredReports.map(r => `
      <tr>
        <td>${r.deviceId}</td>
        <td>${new Date(r.startTime).toLocaleTimeString('ar-EG')}</td>
        <td>${new Date(r.endTime).toLocaleTimeString('ar-EG')}</td>
        <td>${r.durationMinutes} ${t('minute_short')}</td>
        <td>${t(r.gameType)}</td>
        <td>${r.cost.toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${t('report_details')} - ${selectedDate}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
          <style>
              body {
                  font-family: 'Cairo', sans-serif;
                  direction: rtl;
                  text-align: right;
                  background-color: #f9fafb;
                  color: #111827;
                  margin: 0;
                  padding: 20px;
              }
              .container {
                  max-width: 800px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  border-radius: 8px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                  padding: 30px;
              }
              .header {
                  text-align: center;
                  border-bottom: 2px solid #e5e7eb;
                  padding-bottom: 20px;
                  margin-bottom: 30px;
              }
              .header h1 {
                  color: #11224E;
                  font-size: 28px;
                  margin: 0;
              }
              .header p {
                  color: #4b5563;
                  font-size: 16px;
                  margin: 5px 0 0;
              }
              table {
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 14px;
              }
              th, td {
                  padding: 12px 15px;
                  border: 1px solid #e5e7eb;
              }
              thead th {
                  background-color: #1a2e66;
                  color: #ffffff;
                  font-size: 16px;
                  font-weight: 700;
              }
              tbody tr:nth-child(even) {
                  background-color: #f3f4f6;
              }
              tbody tr:hover {
                  background-color: #e5e7eb;
              }
              tfoot {
                  font-weight: 700;
                  color: #111827;
              }
              tfoot td {
                  font-size: 18px;
                  background-color: #f3f4f6;
              }
              .total-value {
                  color: #16a34a;
                  font-weight: bold;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>${t('app_title')}</h1>
                  <p>${t('total_revenue_for')} ${selectedDate}</p>
              </div>
              <table>
                  <thead>
                      <tr>
                          <th>${t('device_id')}</th>
                          <th>${t('start_time')}</th>
                          <th>${t('end_time')}</th>
                          <th>${t('duration')}</th>
                          <th>${t('game_type')}</th>
                          <th>${t('cost')}</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${tableRows}
                  </tbody>
                   <tfoot>
                      <tr>
                          <td colspan="5">${t('total')}</td>
                          <td class="total-value">${totalRevenue.toFixed(2)}</td>
                      </tr>
                  </tfoot>
              </table>
          </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${selectedDate}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = async () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text("Gaming Lounge Daily Report", pageWidth / 2, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Date: ${selectedDate}`, pageWidth / 2, 30, { align: 'center' });

    autoTable(doc, {
      startY: 40,
      head: [['Device ID', 'Start Time', 'End Time', 'Duration (min)', 'Game Type', 'Cost']],
      body: filteredReports.map(r => [
        r.deviceId,
        new Date(r.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        new Date(r.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        r.durationMinutes,
        r.gameType.charAt(0).toUpperCase() + r.gameType.slice(1),
        r.cost.toFixed(2),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }, // A professional blue color (indigo-600)
      foot: [['Total', '', '', '', '', totalRevenue.toFixed(2)]],
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
      didDrawPage: (data) => {
        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.text(`Page ${doc.getCurrentPageInfo().pageNumber} of ${pageCount}`, data.settings.margin.left, pageHeight - 10);
        doc.text(`Generated on: ${new Date().toLocaleString('en-US')}`, pageWidth - data.settings.margin.right, pageHeight - 10, { align: 'right' });
      },
    });

    doc.save(`report_${selectedDate}.pdf`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">{t('total_revenue_for')} {selectedDate}</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
        />
      </div>

      <div ref={printRef} className="printable-content">
        {filteredReports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('device_id')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('start_time')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('end_time')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('duration')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('game_type')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('cost')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReports.map(report => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{report.deviceId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{new Date(report.startTime).toLocaleTimeString('ar-EG')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{new Date(report.endTime).toLocaleTimeString('ar-EG')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{report.durationMinutes} دقيقة</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{t(report.gameType)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{report.cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-right font-bold text-lg text-gray-900 dark:text-gray-100">{t('total')}</td>
                  <td className="px-6 py-4 font-bold text-lg text-gray-900 dark:text-gray-100">{totalRevenue.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-center py-10 text-gray-500">{t('no_reports_for_selected_date')}</p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <button onClick={handlePrintPDF} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">{t('print_pdf')}</button>
        <button onClick={handleSaveHTML} className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700">{t('save_html')}</button>
      </div>
    </div>
  );
};

export default ReportsView;