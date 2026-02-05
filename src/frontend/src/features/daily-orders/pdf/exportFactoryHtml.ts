import { format } from 'date-fns';
import type { ParsedOrder } from '../excel/parseDailyOrders';
import type { KarigarAssignment } from '@/backend';

export async function exportFactoryHtml(
  date: string,
  factory: string,
  orders: ParsedOrder[],
  assignments: KarigarAssignment[]
): Promise<void> {
  // Group orders by karigar
  const assignmentMap = new Map(assignments.map((a) => [a.orderId, a]));
  const ordersByKarigar = new Map<string, ParsedOrder[]>();

  orders.forEach((order) => {
    const assignment = assignmentMap.get(order.orderNo);
    if (assignment) {
      const karigar = assignment.karigar;
      if (!ordersByKarigar.has(karigar)) {
        ordersByKarigar.set(karigar, []);
      }
      ordersByKarigar.get(karigar)!.push(order);
    }
  });

  const karigars = Array.from(ordersByKarigar.keys()).sort();

  // Create HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Factory Orders Report - ${factory}</title>
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
          margin-bottom: 30px;
          font-size: 14px;
          padding: 15px;
          background-color: #f5f5f5;
          border-left: 4px solid #333;
        }
        .info p {
          margin: 5px 0;
        }
        .karigar-section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .karigar-header {
          background-color: #333;
          color: white;
          padding: 10px 15px;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
          font-size: 12px;
        }
        th {
          background-color: #666;
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
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <h1>Factory Orders Report</h1>
      <div class="info">
        <p><strong>Date:</strong> ${format(new Date(date), 'MMMM dd, yyyy')}</p>
        <p><strong>Factory:</strong> ${escapeHtml(factory)}</p>
        <p><strong>Total Orders:</strong> ${orders.length}</p>
        <p><strong>Karigars:</strong> ${karigars.length}</p>
      </div>
      
      ${karigars.map(karigar => {
        const karigarOrders = ordersByKarigar.get(karigar) || [];
        return `
          <div class="karigar-section">
            <div class="karigar-header">
              ${escapeHtml(karigar)} - ${karigarOrders.length} order${karigarOrders.length !== 1 ? 's' : ''}
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
                ${karigarOrders.map(order => `
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
          </div>
        `;
      }).join('')}
      
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
  link.download = `factory_${factory.replace(/\s+/g, '_')}_${date}.html`;
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
