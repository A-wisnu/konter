const STORAGE_KEY = "konter_transactions_v1";

const form = document.getElementById("transaction-form");
const dateInput = document.getElementById("date");
const typeInput = document.getElementById("type");
const descInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const formTitle = document.getElementById("form-title");

const listEl = document.getElementById("transaction-list");
const emptyState = document.getElementById("empty-state");
const countLabel = document.getElementById("count-label");

const totalSalesEl = document.getElementById("total-sales");
const totalExpenseEl = document.getElementById("total-expense");
const totalNetEl = document.getElementById("total-net");

const exportXlsxBtn = document.getElementById("export-xlsx");
const exportCsvBtn = document.getElementById("export-csv");
const exportPdfBtn = document.getElementById("export-pdf");

let transactions = [];
let editingId = null;
const cryptoObj = window.crypto || window.msCrypto;

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 2,
});

function formatCurrency(value) {
  return currencyFormatter.format(value || 0);
}

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    transactions = raw ? JSON.parse(raw) : [];
  } catch {
    transactions = [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function resetForm() {
  form.reset();
  dateInput.valueAsDate = new Date();
  editingId = null;
  formTitle.textContent = "Tambah Transaksi";
  submitBtn.textContent = "Simpan";
  cancelBtn.classList.add("hidden");
}

function startEdit(transaction) {
  editingId = transaction.id;
  dateInput.value = transaction.date;
  typeInput.value = transaction.type;
  descInput.value = transaction.description;
  amountInput.value = transaction.amount;
  formTitle.textContent = "Edit Transaksi";
  submitBtn.textContent = "Perbarui";
  cancelBtn.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteTransaction(id) {
  if (!confirm("Hapus transaksi ini?")) {
    return;
  }
  transactions = transactions.filter((item) => item.id !== id);
  saveTransactions();
  render();
}

function getTotals() {
  const totalSales = transactions
    .filter((t) => t.type === "sale")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  return {
    totalSales,
    totalExpense,
    totalNet: totalSales - totalExpense,
  };
}

function renderTotals() {
  const totals = getTotals();
  totalSalesEl.textContent = formatCurrency(totals.totalSales);
  totalExpenseEl.textContent = formatCurrency(totals.totalExpense);
  totalNetEl.textContent = formatCurrency(totals.totalNet);
}

function renderList() {
  listEl.innerHTML = "";
  countLabel.textContent = `${transactions.length} transaksi`;
  if (transactions.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));

  sorted.forEach((transaction) => {
    const li = document.createElement("li");
    li.className = "transaction-item";

    const main = document.createElement("div");
    main.className = "transaction-main";

    const meta = document.createElement("div");
    meta.className = "transaction-meta";
    const title = document.createElement("strong");
    title.textContent = transaction.description;
    const date = document.createElement("span");
    date.textContent = `${transaction.date} - ${
      transaction.type === "sale" ? "Penjualan" : "Pengeluaran"
    }`;
    meta.appendChild(title);
    meta.appendChild(date);

    const amount = document.createElement("div");
    amount.className = "transaction-amount";
    amount.textContent = formatCurrency(transaction.amount);

    main.appendChild(meta);
    main.appendChild(amount);

    const actions = document.createElement("div");
    actions.className = "transaction-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEdit(transaction));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger";
    deleteBtn.textContent = "Hapus";
    deleteBtn.addEventListener("click", () => deleteTransaction(transaction.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(main);
    li.appendChild(actions);
    listEl.appendChild(li);
  });
}

function render() {
  renderTotals();
  renderList();
}

function validateForm() {
  const amount = parseFloat(amountInput.value);
  if (!dateInput.value) {
    alert("Tanggal wajib diisi.");
    return false;
  }
  if (!descInput.value.trim()) {
    alert("Deskripsi wajib diisi.");
    return false;
  }
  if (Number.isNaN(amount) || amount <= 0) {
    alert("Nominal harus lebih besar dari 0.");
    return false;
  }
  return true;
}

function handleSubmit(event) {
  event.preventDefault();
  if (!validateForm()) {
    return;
  }

  const id =
    editingId ||
    (cryptoObj && cryptoObj.randomUUID
      ? cryptoObj.randomUUID()
      : `tx_${Date.now()}_${Math.floor(Math.random() * 10000)}`);

  const payload = {
    id,
    date: dateInput.value,
    type: typeInput.value,
    description: descInput.value.trim(),
    amount: parseFloat(amountInput.value),
  };

  if (editingId) {
    transactions = transactions.map((item) =>
      item.id === editingId ? payload : item
    );
  } else {
    transactions.push(payload);
  }

  saveTransactions();
  render();
  resetForm();
}

function getExportRows() {
  const rows = transactions.map((t) => [
    t.date,
    t.type === "sale" ? "Penjualan" : "Pengeluaran",
    t.description,
    t.amount,
  ]);

  const totals = getTotals();
  rows.push([]);
  rows.push(["", "", "TOTAL PENJUALAN", totals.totalSales]);
  rows.push(["", "", "TOTAL PENGELUARAN", totals.totalExpense]);
  rows.push(["", "", "TOTAL BERSIH", totals.totalNet]);

  return rows;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  if (transactions.length === 0) {
    alert("Belum ada data untuk diunduh.");
    return;
  }
  const header = ["Tanggal", "Jenis", "Deskripsi", "Nominal"];
  const rows = [header, ...getExportRows()];
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell === null || cell === undefined ? "" : String(cell);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");
  downloadBlob(csv, getFilename("laporan_konter", "csv"), "text/csv");
}

function loadXlsxLibrary() {
  if (window.XLSX) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-xlsx="true"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "xlsx.full.min.js";
    script.defer = true;
    script.dataset.xlsx = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat XLSX"));
    document.head.appendChild(script);
  });
}

async function exportXLSX() {
  if (transactions.length === 0) {
    alert("Belum ada data untuk diunduh.");
    return;
  }
  try {
    await loadXlsxLibrary();
  } catch {
    alert("Library Excel belum siap. Periksa koneksi internet.");
    return;
  }
  const header = ["Tanggal", "Jenis", "Deskripsi", "Nominal"];
  const rows = [header, ...getExportRows()];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    data,
    getFilename("laporan_konter", "xlsx"),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function exportPDF() {
  if (transactions.length === 0) {
    alert("Belum ada data untuk diunduh.");
    return;
  }
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF || !window.jspdf) {
    alert("Library PDF belum siap.");
    return;
  }
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Laporan Konter", 14, 18);
  doc.setFontSize(10);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 24);

  const body = transactions.map((t) => [
    t.date,
    t.type === "sale" ? "Penjualan" : "Pengeluaran",
    t.description,
    formatCurrency(t.amount),
  ]);

  doc.autoTable({
    startY: 30,
    head: [["Tanggal", "Jenis", "Deskripsi", "Nominal"]],
    body,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255] },
  });

  const totals = getTotals();
  const lastY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.text(`Total Penjualan: ${formatCurrency(totals.totalSales)}`, 14, lastY);
  doc.text(
    `Total Pengeluaran: ${formatCurrency(totals.totalExpense)}`,
    14,
    lastY + 6
  );
  doc.text(`Total Bersih: ${formatCurrency(totals.totalNet)}`, 14, lastY + 12);

  doc.save(getFilename("laporan_konter", "pdf"));
}

function getFilename(prefix, ext) {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}_${date}.${ext}`;
}

form.addEventListener("submit", handleSubmit);
cancelBtn.addEventListener("click", resetForm);
exportCsvBtn.addEventListener("click", exportCSV);
exportXlsxBtn.addEventListener("click", exportXLSX);
exportPdfBtn.addEventListener("click", exportPDF);

loadTransactions();
resetForm();
render();
