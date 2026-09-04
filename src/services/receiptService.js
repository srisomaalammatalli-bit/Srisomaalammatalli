/**
 * Sri Somalamma Talli Temple - Receipt Service
 * Utility functions for generating, formatting, printing, and sharing receipts.
 */

export function generateReceiptNumber(year = 2026) {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BAT-${year}-${rand}`;
}

export function formatINR(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

export function maskMobile(mobile = '') {
  const clean = mobile.replace(/\s+/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 2)}XXXXX${clean.slice(7)}`;
  }
  return mobile;
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function generateWhatsAppMessage(receipt) {
  const amountStr = formatINR(receipt.amount);
  const donor = receipt.donor_name || receipt.donorName || 'Devotee';
  // No fallback number: an unissued receipt shows no reference at all.
  const rNo = receipt.receipt_no || receipt.receiptNo || '—';
  const category = receipt.category || 'General Temple Seva';

  const text = 
`🙏 *శ్రీ సోమలమ్మ తల్లి దేవస్థానం* 🙏
*Sri Somalamma Talli Temple - Official Receipt*

Devotee: ${donor}
Receipt No: ${rNo}
Offering: ${category}
Amount: ${amountStr}
Status: Verified & Blessed ✨

"సర్వే జనాః సుఖినో భవంతు"
May the divine grace of Sri Somalamma Talli be upon you and your family!
Official Digital Receipt verified by Temple Executive Committee.`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

export function printReceiptElement(elementId) {
  const elem = document.getElementById(elementId);
  if (!elem) {
    window.print();
    return;
  }
  window.print();
}
