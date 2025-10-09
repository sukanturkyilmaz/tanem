import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { getDocument } from "npm:pdfjs-dist@4.0.379";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PDFExtractionRequest {
  fileUrl: string;
}

interface PDFExtractionResponse {
  insuranceCompany: string | null;
  policyNumber: string | null;
  startDate: string | null;
  endDate: string | null;
  premiumAmount: string | null;
  rawText: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { fileUrl }: PDFExtractionRequest = await req.json();

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "File URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const pdfResponse = await fetch(fileUrl);
    if (!pdfResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to download PDF" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfText = await extractTextFromPDF(pdfBuffer);

    console.log("Extracted text length:", pdfText.length);
    console.log("First 500 chars:", pdfText.substring(0, 500));

    const extractedInfo: PDFExtractionResponse = {
      insuranceCompany: extractInsuranceCompany(pdfText),
      policyNumber: extractPolicyNumber(pdfText),
      startDate: extractDate(pdfText, "start"),
      endDate: extractDate(pdfText, "end"),
      premiumAmount: extractPremiumAmount(pdfText),
      rawText: pdfText.substring(0, 2000),
    };

    console.log("Extracted info:", extractedInfo);

    return new Response(JSON.stringify(extractedInfo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error extracting PDF info:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error("Failed to parse PDF");
  }
}

function extractInsuranceCompany(text: string): string | null {
  const companies = [
    "Türk Nippon Sigorta",
    "Anadolu Sigorta",
    "Allianz Sigorta",
    "Aksigorta",
    "HDI Sigorta",
    "Axa Sigorta",
    "Mapfre Sigorta",
    "Sompo Sigorta",
    "Zurich Sigorta",
    "Groupama Sigorta",
    "Generali Sigorta",
    "Unico Sigorta",
    "Neova Sigorta",
    "Quick Sigorta",
    "Ankara Sigorta",
    "Ray Sigorta",
    "Ethica Sigorta",
    "Bereket Sigorta",
    "Corpus Sigorta",
    "Magdeburger Sigorta",
  ];

  const upperText = text.toUpperCase();
  for (const company of companies) {
    if (upperText.includes(company.toUpperCase())) {
      return company;
    }
  }

  return null;
}

function extractPolicyNumber(text: string): string | null {
  const patterns = [
    /POLİÇE\s*NO[:\.\s]*([A-Z0-9\-\/]{5,})/gi,
    /POLİÇE\s*NUM[:\.\s]*([A-Z0-9\-\/]{5,})/gi,
    /POLICE\s*NO[:\.\s]*([A-Z0-9\-\/]{5,})/gi,
    /POLICE\s*NUM[BER]*[:\.\s]*([A-Z0-9\-\/]{5,})/gi,
    /(?:^|\s)([A-Z]{2,4}[\-\/]?\d{6,})(?:$|\s)/gm,
  ];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const candidate = match[1]?.trim();
      if (candidate && candidate.length >= 5 && candidate.length <= 30) {
        console.log("Found policy number:", candidate);
        return candidate;
      }
    }
  }

  return null;
}

function extractDate(text: string, type: "start" | "end"): string | null {
  const keywords = type === "start"
    ? ["BAŞLANGIÇ", "BAŞLAMA", "START", "GEÇERLİLİK", "TANIMLAMA"]
    : ["BİTİŞ", "END", "SON", "VADE"];

  const datePattern = /(\d{1,2})[\.\/ \-](\d{1,2})[\.\/ \-](\d{4})/g;

  const lines = text.split(/[\n\r]+/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    const isRelevant = keywords.some(kw => {
      return upperLine.includes(kw.toUpperCase());
    });

    if (isRelevant) {
      const searchText = lines.slice(Math.max(0, i - 1), i + 3).join(" ");
      const matches = [...searchText.matchAll(datePattern)];

      if (matches.length > 0) {
        const match = matches[0];
        const day = match[1].padStart(2, "0");
        const month = match[2].padStart(2, "0");
        const year = match[3];
        console.log(`Found ${type} date:`, `${day}.${month}.${year}`);
        return `${year}-${month}-${day}`;
      }
    }
  }

  const allDates = [...text.matchAll(datePattern)];
  if (allDates.length >= 2) {
    const dateIndex = type === "start" ? 0 : 1;
    if (allDates[dateIndex]) {
      const match = allDates[dateIndex];
      const day = match[1].padStart(2, "0");
      const month = match[2].padStart(2, "0");
      const year = match[3];
      console.log(`Fallback ${type} date:`, `${day}.${month}.${year}`);
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

function extractPremiumAmount(text: string): string | null {
  const patterns = [
    /PRİM[:\s]+([\d\.\,]+)/gi,
    /PREMIUM[:\s]+([\d\.\,]+)/gi,
    /NET\s*PRİM[:\s]+([\d\.\,]+)/gi,
    /BRÜT\s*PRİM[:\s]+([\d\.\,]+)/gi,
    /TOPLAM[:\s]+([\d\.\,]+)/gi,
    /TUTAR[:\s]+([\d\.\,]+)/gi,
    /(?:^|\s)([\d]{1,3}[\.,][\d]{3}[\.,][\d]{2})(?:$|\s|TL)/gm,
  ];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const candidate = match[1]?.trim();
      if (candidate) {
        let amount = candidate.replace(/\./g, "").replace(",", ".");
        const numValue = parseFloat(amount);
        if (!isNaN(numValue) && numValue > 0 && numValue < 1000000) {
          console.log("Found premium:", amount);
          return amount;
        }
      }
    }
  }

  return null;
}
