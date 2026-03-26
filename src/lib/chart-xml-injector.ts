// src/lib/chart-xml-injector.ts
// CLIENT-ONLY — browser only. Uses JSZip to post-process an ExcelJS-generated
// XLSX ArrayBuffer and inject 3 native DrawingML charts + a "Grafik" sheet.
import JSZip from 'jszip';

export interface ChartInjectorInput {
  buffer: ArrayBuffer;
  scopeLabel: string;
  generatedAt: Date;
  expCatCount: number; // number of expense categories — determines pie chart range
}

// OOXML color palette for pie/donut slices (fully opaque ARGB)
const PIE_COLORS = [
  'FF2563EB', 'FF10B981', 'FFF59E0B', 'FFEF4444',
  'FF8B5CF6', 'FF06B6D4', 'FFF97316', 'FF84CC16', 'FFEC4899',
];

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Chart XML templates ──────────────────────────────────────────────────────

function donutChartXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:autoTitleDeleted val="1"/>
    <c:plotArea>
      <c:doughnutChart>
        <c:varyColors val="0"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:dPt><c:idx val="0"/><c:spPr><a:solidFill><a:srgbClr val="10B981"/></a:solidFill></c:spPr></c:dPt>
          <c:dPt><c:idx val="1"/><c:spPr><a:solidFill><a:srgbClr val="EF4444"/></a:solidFill></c:spPr></c:dPt>
          <c:cat>
            <c:strRef><c:f>Grafik!$A$44:$A$45</c:f></c:strRef>
          </c:cat>
          <c:val>
            <c:numRef><c:f>Grafik!$B$44:$B$45</c:f></c:numRef>
          </c:val>
        </c:ser>
        <c:holeSize val="50"/>
      </c:doughnutChart>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/></c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

function cashflowBarChartXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:autoTitleDeleted val="1"/>
    <c:plotArea>
      <c:barChart>
        <c:barDir val="bar"/>
        <c:grouping val="clustered"/>
        <c:varyColors val="1"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:dPt><c:idx val="0"/><c:spPr><a:solidFill><a:srgbClr val="10B981"/></a:solidFill></c:spPr></c:dPt>
          <c:dPt><c:idx val="1"/><c:spPr><a:solidFill><a:srgbClr val="EF4444"/></a:solidFill></c:spPr></c:dPt>
          <c:dPt><c:idx val="2"/><c:spPr><a:solidFill><a:srgbClr val="2563EB"/></a:solidFill></c:spPr></c:dPt>
          <c:cat>
            <c:strRef><c:f>Grafik!$A$44:$A$46</c:f></c:strRef>
          </c:cat>
          <c:val>
            <c:numRef><c:f>Grafik!$B$44:$B$46</c:f></c:numRef>
          </c:val>
        </c:ser>
      </c:barChart>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/></c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

function expensePieChartXml(lastRow: number): string {
  const dPts = PIE_COLORS.map((clr, i) =>
    `<c:dPt><c:idx val="${i}"/><c:spPr><a:solidFill><a:srgbClr val="${clr.slice(2)}"/></a:solidFill></c:spPr></c:dPt>`
  ).join('\n        ');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:autoTitleDeleted val="1"/>
    <c:plotArea>
      <c:pieChart>
        <c:varyColors val="1"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          ${dPts}
          <c:cat>
            <c:strRef><c:f>Laporan!$D$18:$D$${lastRow}</c:f></c:strRef>
          </c:cat>
          <c:val>
            <c:numRef><c:f>Laporan!$E$18:$E$${lastRow}</c:f></c:numRef>
          </c:val>
        </c:ser>
        <c:firstSliceAng val="0"/>
      </c:pieChart>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/></c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

// ── Drawing XML (anchors 3 charts on Grafik sheet) ────────────────────────────

function drawingXml(includePie: boolean): string {
  // Rows are 0-indexed in OOXML twoCellAnchor.
  // Spec layout (1-indexed): rows 6–22 = donut+bar; rows 23–40 = pie
  // 0-indexed: donut+bar rows 5–21; pie rows 22–39
  // Cols: donut A–H = 0–7; bar I–T = 8–19; pie A–T = 0–19
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>5</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>7</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>21</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro=""><xdr:nvGraphicFramePr>
      <xdr:cNvPr id="2" name="Donut"/><xdr:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></xdr:cNvGraphicFramePr>
    </xdr:nvGraphicFramePr>
    <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <c:chart r:id="rId1"/>
    </a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/>
  </xdr:twoCellAnchor>
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>5</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>19</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>21</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro=""><xdr:nvGraphicFramePr>
      <xdr:cNvPr id="3" name="Cashflow"/><xdr:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></xdr:cNvGraphicFramePr>
    </xdr:nvGraphicFramePr>
    <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <c:chart r:id="rId2"/>
    </a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/>
  </xdr:twoCellAnchor>
  ${includePie ? `<xdr:twoCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>22</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>19</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>39</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro=""><xdr:nvGraphicFramePr>
      <xdr:cNvPr id="4" name="Pie"/><xdr:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></xdr:cNvGraphicFramePr>
    </xdr:nvGraphicFramePr>
    <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <c:chart r:id="rId3"/>
    </a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/>
  </xdr:twoCellAnchor>` : ''}
</xdr:wsDr>`;
}

// ── Grafik sheet XML ──────────────────────────────────────────────────────────

function grafikSheetXml(scopeLabel: string, generatedAt: Date): string {
  const dateStr = formatDateShort(generatedAt);
  // Rows 44–46 are helper data cells for chart series references.
  // A44:A46 = category labels (used as c:strRef in chart XML)
  // B44:B46 = formula values referencing Laporan KPI cells (used as c:numRef)
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>Grafik Keuangan \u2014 ${scopeLabel}</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>Dibuat: ${dateStr}</t></is></c>
    </row>
    <row r="3">
      <c r="B3" t="inlineStr"><is><t>Pemasukan</t></is></c>
      <c r="D3" t="inlineStr"><is><t>Pengeluaran</t></is></c>
      <c r="F3" t="inlineStr"><is><t>Saldo</t></is></c>
    </row>
    <row r="4">
      <c r="B4"><f>Laporan!H10</f><v>0</v></c>
      <c r="D4"><f>Laporan!H12</f><v>0</v></c>
      <c r="F4"><f>Laporan!B13</f><v>0</v></c>
    </row>
    <row r="44">
      <c r="A44" t="inlineStr"><is><t>Total Pemasukan</t></is></c>
      <c r="B44"><f>Laporan!H10</f><v>0</v></c>
    </row>
    <row r="45">
      <c r="A45" t="inlineStr"><is><t>Total Pengeluaran</t></is></c>
      <c r="B45"><f>Laporan!H12</f><v>0</v></c>
    </row>
    <row r="46">
      <c r="A46" t="inlineStr"><is><t>Saldo</t></is></c>
      <c r="B46"><f>Laporan!B13</f><v>0</v></c>
    </row>
  </sheetData>
  <mergeCells count="1">
    <mergeCell ref="A1:H1"/>
  </mergeCells>
  <drawing r:id="rId1"/>
</worksheet>`;
}

// ── Main injection function ───────────────────────────────────────────────────

/**
 * Opens the ExcelJS-generated XLSX ArrayBuffer with JSZip, injects:
 *   - xl/charts/chart1.xml (donut)
 *   - xl/charts/chart2.xml (cashflow bar)
 *   - xl/charts/chart3.xml (expense pie)
 *   - xl/drawings/drawing1.xml
 *   - xl/drawings/_rels/drawing1.xml.rels
 *   - xl/worksheets/sheet{N}.xml  (Grafik sheet)
 *   - xl/worksheets/_rels/sheet{N}.xml.rels
 * Updates [Content_Types].xml, workbook.xml (prepend Grafik as first sheet),
 * workbook.xml.rels. Returns new ArrayBuffer.
 */
export async function injectCharts(input: ChartInjectorInput): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(input.buffer);
  const lastExpCatRow = 17 + input.expCatCount; // e.g., 5 cats → row 22
  // Skip pie chart if no expense categories (degenerate range would break Excel)
  const hasPieData = input.expCatCount > 0;

  // ── Step 1: Count existing worksheets to determine N ─────────────────────
  const existingSheets = Object.keys(zip.files).filter((f) =>
    /^xl\/worksheets\/sheet\d+\.xml$/.test(f)
  );
  const N = existingSheets.length + 1; // Grafik sheet file index

  // ── Step 2: Parse existing sheetId and rId maxima ────────────────────────
  const wbFile = zip.file('xl/workbook.xml');
  if (!wbFile) throw new Error('injectCharts: xl/workbook.xml not found in XLSX buffer');
  const wbXml = await wbFile.async('string');
  const sheetIdMatches = [...wbXml.matchAll(/sheetId="(\d+)"/g)];
  const maxSheetId = sheetIdMatches.reduce((max, m) => Math.max(max, parseInt(m[1])), 0);
  const rIdMatches = [...wbXml.matchAll(/r:id="rId(\d+)"/g)];
  const maxRid = rIdMatches.reduce((max, m) => Math.max(max, parseInt(m[1])), 0);
  const newSheetId = maxSheetId + 1;
  const newRid = `rId${maxRid + 1}`;

  // ── Step 3: Add chart XML files ───────────────────────────────────────────
  zip.file('xl/charts/chart1.xml', donutChartXml());
  zip.file('xl/charts/chart2.xml', cashflowBarChartXml());
  if (hasPieData) {
    zip.file('xl/charts/chart3.xml', expensePieChartXml(lastExpCatRow));
  }

  // ── Step 4: Add drawing XML and its rels ─────────────────────────────────
  zip.file('xl/drawings/drawing1.xml', drawingXml(hasPieData));
  zip.file(
    'xl/drawings/_rels/drawing1.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart3.xml"/>
</Relationships>`
  );

  // ── Step 5: Add Grafik worksheet and its rels ─────────────────────────────
  zip.file(
    `xl/worksheets/sheet${N}.xml`,
    grafikSheetXml(input.scopeLabel, input.generatedAt)
  );
  zip.file(
    `xl/worksheets/_rels/sheet${N}.xml.rels`,
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`
  );

  // ── Step 6: Update [Content_Types].xml ───────────────────────────────────
  const ctFile = zip.file('[Content_Types].xml');
  if (!ctFile) throw new Error('injectCharts: [Content_Types].xml not found in XLSX buffer');
  const ctXml = await ctFile.async('string');
  const chartOverrides = [
    `<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`,
    `<Override PartName="/xl/charts/chart2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`,
    ...(hasPieData
      ? [
          `<Override PartName="/xl/charts/chart3.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`,
        ]
      : []),
    `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`,
    `<Override PartName="/xl/worksheets/sheet${N}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ].join('\n');
  zip.file('[Content_Types].xml', ctXml.replace('</Types>', `${chartOverrides}\n</Types>`));

  // ── Step 7: Prepend Grafik as first sheet in workbook.xml ─────────────────
  const grafikSheetEl = `<sheet name="Grafik" sheetId="${newSheetId}" r:id="${newRid}"/>`;
  // Insert Grafik before the first existing <sheet element inside <sheets>
  zip.file(
    'xl/workbook.xml',
    wbXml.replace(/<sheets>/, `<sheets>${grafikSheetEl}`)
  );

  // ── Step 8: Add Grafik relationship in workbook.xml.rels ──────────────────
  const wbRelsFile = zip.file('xl/_rels/workbook.xml.rels');
  if (!wbRelsFile)
    throw new Error('injectCharts: xl/_rels/workbook.xml.rels not found in XLSX buffer');
  const wbRelsXml = await wbRelsFile.async('string');
  const grafikRel = `<Relationship Id="${newRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${N}.xml"/>`;
  zip.file('xl/_rels/workbook.xml.rels', wbRelsXml.replace('</Relationships>', `${grafikRel}\n</Relationships>`));

  // ── Step 9: Generate and return new buffer ────────────────────────────────
  return zip.generateAsync({ type: 'arraybuffer' });
}
