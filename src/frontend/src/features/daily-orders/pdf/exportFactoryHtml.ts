import type { ParsedOrder } from '../excel/parseDailyOrders';
import type { KarigarAssignment } from '@/backend';
import { normalizeDesignCode } from '@/utils/textNormalize';

export async function exportFactoryHtml(
  date: string,
  factory: string,
  orders: ParsedOrder[],
  assignments: KarigarAssignment[],
  mappingLookup: Map<string, { karigar: string; genericName?: string }>
): Promise<void> {
  const assignmentMap = new Map(assignments.map((a) => [a.orderId, a]));

  // Group orders by karigar
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

  // Sort karigars and orders within each group
  const sortedKarigars = Array.from(ordersByKarigar.keys()).sort();
  ordersByKarigar.forEach((orders) => {
    orders.sort((a, b) => a.design.localeCompare(b.design));
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${factory} Orders - ${date}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      font-size: 12px;
    }
    h1 {
      font-size: 20px;
      margin-bottom: 5px;
    }
    h2 {
      font-size: 16px;
      color: #333;
      margin-top: 30px;
      margin-bottom: 10px;
      padding: 8px;
      background-color: #f0f0f0;
      border-left: 4px solid #666;
    }
    h3 {
      font-size: 14px;
      color: #666;
      margin-top: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      margin-bottom: 30px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .header {
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    .karigar-section {
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${factory} - All Orders</h1>
    <h3>Date: ${date}</h3>
    <p><strong>Total Orders:</strong> ${orders.length}</p>
    <p><strong>Total Karigars:</strong> ${sortedKarigars.length}</p>
  </div>
  
  ${sortedKarigars.map((karigar) => {
    const karigarOrders = ordersByKarigar.get(karigar) || [];
    return `
    <div class="karigar-section">
      <h2>${karigar} (${karigarOrders.length} orders)</h2>
      <table>
        <thead>
          <tr>
            <th>Sr. No.</th>
            <th>Order No</th>
            <th>Design Code</th>
            <th>Generic Name</th>
          </tr>
        </thead>
        <tbody>
          ${karigarOrders.map((order, index) => {
            // Normalize design code before lookup
            const normalizedDesign = normalizeDesignCode(order.design);
            const mapping = mappingLookup.get(normalizedDesign);
            const genericName = mapping?.genericName || '-';
            return `
            <tr>
              <td>${index + 1}</td>
              <td>${order.orderNo}</td>
              <td>${order.design}</td>
              <td>${genericName}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    `;
  }).join('')}
</body>
</html>
  `;

  // Create a blob and download
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${factory}_${date}_all_orders.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
