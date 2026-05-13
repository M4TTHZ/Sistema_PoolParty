import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ReservationPdfData {
  reservation: {
    id: number;
    rentalPrice: string | number;
    totalAmount: string | number;
    observations?: string | null;
  };
  client: {
    name: string;
    cpfCnpj: string;
  };
  dates: string[];
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: string | number;
    totalPrice: string | number;
  }>;
  playground?: {
    startTime: string;
    endTime: string;
    price: string | number;
  } | null;
}

function formatBRL(v: number | string): string {
  return parseFloat(String(v) || "0").toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR");
}

export function generateReservationPdfClient(data: ReservationPdfData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const navy  = [10, 22, 40]   as [number, number, number];
  const aqua  = [0, 188, 212]  as [number, number, number];
  const gold  = [245, 200, 66] as [number, number, number];
  const gray  = [90, 100, 114] as [number, number, number];
  const white = [255, 255, 255] as [number, number, number];
  const light = [244, 246, 248] as [number, number, number];

  const pageW = 210;
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageW, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...aqua);
  doc.text("POOL PARTY", pageW / 2, 13, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...white);
  doc.text("Comprovante de Reserva", pageW / 2, 21, { align: "center" });

  // ── Gerado em ─────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    pageW - marginR,
    34,
    { align: "right" },
  );

  let y = 38;

  // ── Section helper ─────────────────────────────────────────────────────────
  function sectionTitle(title: string) {
    y += 4;
    doc.setFillColor(...aqua);
    doc.rect(marginL, y, 3, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...navy);
    doc.text(title, marginL + 6, y + 5);
    y += 11;
  }

  function labelValue(label: string, value: string) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text(label, marginL, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...navy);
    doc.text(value || "—", marginL + 45, y);
    y += 7;
  }

  function divider() {
    y += 3;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, pageW - marginR, y);
    y += 5;
  }

  // ── Dados do Cliente ───────────────────────────────────────────────────────
  sectionTitle("DADOS DO CLIENTE");
  labelValue("Nome:", data.client.name);
  labelValue("CPF / CNPJ:", data.client.cpfCnpj);

  divider();

  // ── Dados da Reserva ───────────────────────────────────────────────────────
  sectionTitle("DADOS DA RESERVA");

  const datesStr = data.dates.length > 0
    ? data.dates.map(formatDate).join("   |   ")
    : "—";

  // Wrap long date strings
  if (datesStr.length > 55) {
    const chunks = data.dates.map(formatDate);
    const lines: string[] = [];
    let line = "";
    for (const d of chunks) {
      if ((line + " | " + d).length > 55) {
        lines.push(line);
        line = d;
      } else {
        line = line ? line + " | " + d : d;
      }
    }
    if (line) lines.push(line);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text("Data(s):", marginL, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...navy);
    lines.forEach((l, i) => {
      doc.text(l, marginL + 45, y + i * 6);
    });
    y += lines.length * 6 + 1;
  } else {
    labelValue("Data(s):", datesStr);
  }

  if (data.playground) {
    labelValue(
      "Brinquedoteca:",
      `${data.playground.startTime} – ${data.playground.endTime}   •   ${formatBRL(data.playground.price)}`,
    );
  } else {
    labelValue("Brinquedoteca:", "Não incluída");
  }

  if (data.reservation.observations) {
    labelValue("Observações:", data.reservation.observations);
  }

  divider();

  // ── Itens Alugados ─────────────────────────────────────────────────────────
  sectionTitle("ITENS ALUGADOS");

  if (data.items.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text("Nenhum item adicionado.", marginL, y);
    y += 10;
  } else {
    // @ts-ignore — autoTable is a jsPDF plugin
    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      head: [["Item", "Qtd", "Valor Unit.", "Total"]],
      body: data.items.map((item) => [
        item.name,
        String(item.quantity),
        formatBRL(item.unitPrice),
        formatBRL(item.totalPrice),
      ]),
      headStyles: {
        fillColor: navy,
        textColor: white,
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: { fontSize: 9, textColor: navy },
      alternateRowStyles: { fillColor: light },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { halign: "center", cellWidth: 20 },
        2: { halign: "right", cellWidth: 35 },
        3: { halign: "right", cellWidth: 35 },
      },
      theme: "plain",
    });

    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Total ──────────────────────────────────────────────────────────────────
  y += 4;
  doc.setFillColor(...navy);
  doc.rect(marginL, y, contentW, 12, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...white);
  doc.text("VALOR TOTAL:", marginL + 4, y + 8);

  doc.setTextColor(...gold);
  doc.text(formatBRL(data.reservation.totalAmount), pageW - marginR - 4, y + 8, {
    align: "right",
  });

  y += 20;

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(
    `Pool Party  •  Documento gerado automaticamente em ${new Date().toLocaleString("pt-BR")}`,
    pageW / 2,
    285,
    { align: "center" },
  );

  // ── Save ───────────────────────────────────────────────────────────────────
  doc.save(`reserva-${data.reservation.id}-${data.client.name.replace(/\s+/g, "_")}.pdf`);
}
