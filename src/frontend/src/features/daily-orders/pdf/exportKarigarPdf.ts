import type { ParsedOrder } from '../excel/parseDailyOrders';
import { normalizeDesignCode } from '@/utils/textNormalize';

export async function exportKarigarPdf(
  date: string, 
  karigar: string, 
  orders: ParsedOrder[],
  mappingLookup: Map<string, { karigar: string; genericName?: string }>
): Promise<void> {
  // Sort orders by design code
  const sortedOrders = [...orders].sort((a, b) => a.design.localeCompare(b.design));

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Orders for ${karigar} - ${date}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      font-size: 12px;
    }
    h1 {
      font-size: 18px;
      margin-bottom: 5px;
    }
    h2 {
      font-size: 14px;
      color: #666;
      margin-top: 0;
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
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .header {
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Orders for ${karigar}</h1>
    <h2>Date: ${date}</h2>
    <p><strong>Total Orders:</strong> ${sortedOrders.length}</p>
  </div>
  
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
      ${sortedOrders.map((order, index) => {
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
</body>
</html>
  `;

  // Create a blob and download
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${karigar}_${date}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
