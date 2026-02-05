import { format } from 'date-fns';
import type { ParsedOrder } from '../excel/parseDailyOrders';

export async function exportKarigarPdf(date: string, karigar: string, orders: ParsedOrder[]): Promise<void> {
  // Create HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Daily Orders Report - ${karigar}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          color: #333;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 10px;
          color: #000;
        }
        .info {
          margin-bottom: 20px;
          font-size: 14px;
        }
        .info p {
          margin: 5px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
          font-size: 12px;
        }
        th {
          background-color: #333;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 10px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <h1>Daily Orders Report</h1>
      <div class="info">
        <p><strong>Date:</strong> ${format(new Date(date), 'MMMM dd, yyyy')}</p>
        <p><strong>Karigar:</strong> ${karigar}</p>
        <p><strong>Total Orders:</strong> ${orders.length}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Order No</th>
            <th>Design</th>
            <th>Weight</th>
            <th>Size</th>
            <th>Quantity</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(order => `
            <tr>
              <td>${escapeHtml(order.orderNo)}</td>
              <td>${escapeHtml(order.design)}</td>
              <td>${escapeHtml(order.weight)}</td>
              <td>${escapeHtml(order.size)}</td>
              <td>${escapeHtml(order.quantity)}</td>
              <td>${escapeHtml(order.remarks)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">
        <p>Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
      </div>
    </body>
    </html>
  `;

  // Create a blob and download
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orders_${karigar.replace(/\s+/g, '_')}_${date}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
