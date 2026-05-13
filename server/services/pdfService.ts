import fs from "fs";
import path from "path";
import { pdfLogger } from "../utils/logger";

export interface PdfReservationData {
  reservation: {
    id: number;
    totalAmount: string | number;
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

function formatBRL(value: string | number): string {
  return parseFloat(String(value)).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR");
}

export async function generateReservationPdf(
  data: PdfReservationData
): Promise<string | null> {
  try {
    const PDFDocument = (await import("pdfkit")).default;

    const uploadsDir = path.resolve(process.cwd(), "uploads", "reservas");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `reserva-${data.reservation.id}-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    const relativeUrl = `/uploads/reservas/${fileName}`;

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const C = {
      navy:      "#0a1628",
      aqua:      "#00bcd4",
      gold:      "#f5c842",
      gray:      "#5a6472",
      lightGray: "#e8ecf0",
      white:     "#ffffff",
      bg:        "#f4f6f8",
    };

    const W = 495; // 595 - 50*2

    // ── HEADER ───────────────────────────────────────────────────────────────
    doc.rect(0, 0, 595, 90).fill(C.navy);

    // Title: POOL PARTY centred
    doc
      .fontSize(32)
      .fillColor(C.aqua)
      .font("Helvetica-Bold")
      .text("POOL PARTY", 50, 24, { width: W, align: "center" });

    doc
      .fontSize(10)
      .fillColor(C.white)
      .font("Helvetica")
      .text("Comprovante de Reserva", 50, 62, { width: W, align: "center" });

    doc.y = 110;

    // ── HELPERS ───────────────────────────────────────────────────────────────
    function sectionTitle(title: string) {
      doc.y += 6;
      // accent bar
      doc.rect(50, doc.y, 4, 15).fill(C.aqua);
      doc
        .fontSize(10)
        .fillColor(C.navy)
        .font("Helvetica-Bold")
        .text(title, 60, doc.y + 2);
      doc.y += 22;
    }

    function labelValue(label: string, value: string) {
      const y = doc.y;
      doc.fontSize(9).fillColor(C.gray).font("Helvetica").text(label, 50, y, { width: 150 });
      doc.fontSize(9).fillColor(C.navy).font("Helvetica-Bold").text(value || "—", 200, y, { width: W - 150 });
      doc.y = y + 16;
    }

    function divider() {
      doc.y += 6;
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(C.lightGray).lineWidth(0.5).stroke();
      doc.y += 10;
    }

    // ── DADOS DO CLIENTE ─────────────────────────────────────────────────────
    sectionTitle("DADOS DO CLIENTE");
    labelValue("Nome", data.client.name);
    labelValue("CPF / CNPJ", data.client.cpfCnpj);

    divider();

    // ── DADOS DA RESERVA ─────────────────────────────────────────────────────
    sectionTitle("DADOS DA RESERVA");

    const datesStr = data.dates.length > 0
      ? data.dates.map(formatDate).join("   |   ")
      : "—";
    labelValue("Data(s)", datesStr);

    if (data.playground) {
      labelValue(
        "Brinquedoteca",
        `${data.playground.startTime} – ${data.playground.endTime}   •   ${formatBRL(data.playground.price)}`
      );
    } else {
      labelValue("Brinquedoteca", "Não incluída");
    }

    divider();

    // ── ITENS ALUGADOS ───────────────────────────────────────────────────────
    sectionTitle("ITENS ALUGADOS");

    if (data.items.length === 0) {
      doc.fontSize(9).fillColor(C.gray).font("Helvetica").text("Nenhum item adicionado.", 50, doc.y);
      doc.y += 18;
    } else {
      const col = { item: 54, qty: 300, unit: 370, total: 460 };
      const headerY = doc.y;

      // Table header
      doc.rect(50, headerY, W, 20).fill(C.navy);
      doc
        .fontSize(9).fillColor(C.white).font("Helvetica-Bold")
        .text("Item",        col.item,  headerY + 6)
        .text("Qtd",         col.qty,   headerY + 6)
        .text("Valor Unit.", col.unit,  headerY + 6)
        .text("Total",       col.total, headerY + 6);

      doc.y = headerY + 22;

      // Rows
      data.items.forEach((item, idx) => {
        const rowY = doc.y;
        if (idx % 2 === 0) doc.rect(50, rowY, W, 18).fill(C.bg);
        doc
          .fontSize(9).fillColor(C.navy).font("Helvetica")
          .text(item.name,              col.item,  rowY + 4, { width: 240 })
          .text(String(item.quantity),  col.qty,   rowY + 4)
          .text(formatBRL(item.unitPrice), col.unit, rowY + 4)
          .text(formatBRL(item.totalPrice), col.total, rowY + 4);
        doc.y = rowY + 20;
      });

      doc.y += 4;
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(C.aqua).lineWidth(1).stroke();
      doc.y += 8;
    }

    // ── VALOR TOTAL ───────────────────────────────────────────────────────────
    doc.y += 10;

    const totalY = doc.y;
    doc.rect(50, totalY, W, 30).fill(C.navy);
    doc
      .fontSize(13)
      .fillColor(C.white)
      .font("Helvetica-Bold")
      .text("VALOR TOTAL:", 60, totalY + 9);
    doc
      .fontSize(13)
      .fillColor(C.gold)
      .font("Helvetica-Bold")
      .text(formatBRL(data.reservation.totalAmount), 50, totalY + 9, {
        width: W - 10,
        align: "right",
      });

    doc.y = totalY + 44;

    // ── FOOTER ────────────────────────────────────────────────────────────────
    doc.y += 20;
    doc
      .fontSize(8)
      .fillColor(C.gray)
      .font("Helvetica")
      .text(
        `Pool Party  •  Gerado em ${new Date().toLocaleString("pt-BR")}`,
        50, doc.y,
        { width: W, align: "center" }
      );

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    return relativeUrl;
  } catch (error) {
    pdfLogger.error({ err: error, reservationId: data.reservation.id }, "PDF generation failed");
    return null;
  }
}
