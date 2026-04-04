const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const PDFParser = require("pdf2json");
const app = express();

// CORS: It allows React frontend (port 5173)
// to send requests to this Node backend (port 5000) without getting blocked.
app.use(
  cors({
    origin: "https://agarwal-hack.vercel.app/",
  }),
);

//Multer: This middleware handles the incoming file from React
// and temporarily saves it in a folder named "uploads/"
const upload = multer({ dest: "uploads/" });

// ---------------------------------------------------------
// Helper Utilities for Safe Extraction
// ---------------------------------------------------------

/**
 * Parses a string value into a standard currency number.
 */
function parseCurrency(val) {
  if (!val) return 0.0;
  const cleaned = val.replace(/[\$\s,]/g, "");
  return parseFloat(cleaned) || 0.0;
}

function getLastCurrencyInBlock(text, startStr, endStr) {
  if (!text) return 0;
  const start = text.indexOf(startStr);
  if (start === -1) return 0;
  const end = endStr ? text.indexOf(endStr, start) : start + 150;
  const block = text.substring(start, end !== -1 ? end : start + 150);

  const matches = [...block.matchAll(/\$([\d,.]+)/g)];
  if (matches.length > 0) {
    return parseCurrency(matches[matches.length - 1][1]);
  }
  return 0;
}

// ---------------------------------------------------------
// Primary API Endpoint: POST /api/parse-cd
// ---------------------------------------------------------

app.post("/api/parse-cd", upload.single("cdDocument"), (req, res) => {
  // 1. Validate that a file was actually uploaded
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded by the client." });
  }

  // 2. Initialize the PDF2JSON Parser (Mode 1 = Raw Text Extraction)
  const pdfParser = new PDFParser(this, 1);

  // Error Handler
  pdfParser.on("pdfParser_dataError", (errData) => {
    console.error("PDF Parsing Error:", errData.parserError);
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res
      .status(500)
      .json({ error: "Failed to parse the uploaded PDF document." });
  });

  // Success Handler: PDF is parsed into text
  pdfParser.on("pdfParser_dataReady", (pdfData) => {
    const rawText = pdfParser.getRawTextContent();

    try {
      // ---------------------------------------------------------
      // EXTRACTION PHASE
      // ---------------------------------------------------------

      // Part 1: Cost Extractions
      const sectionAMatch = rawText.match(
        /A\.\s*Origination Charges[^\$]*?\$([\d,.]+)/,
      );
      const sectionBMatch = rawText.match(
        /B\.\s*Services Borrower Did Not Shop For[^\$]*?\$([\d,.]+)/,
      );
      const sectionCMatch = rawText.match(
        /C\.\s*Services Borrower Did Shop For[^\$]*?\$([\d,.]+)/,
      );
      const sectionEMatch = rawText.match(
        /E\.\s*Taxes and Other Government Fees[^\$]*?\$([\d,.]+)/,
      );
      const lenderCreditMatch = rawText.match(
        /Lender Credits[^\$]*?(-\$[\d,.]+)/,
      );

      // Part 2: Payoff Extractions
      const loanAmountMatch = rawText.match(/Loan Amount[^\$]*?\$([\d,.]+)/);
      const cashToCloseMatch = rawText.match(/Cash to Close[^\$]*?\$([\d,.]+)/);
      const principalReductionMatch = rawText.match(
        /Principal Reduction to Consumer[^\$]*?\$([\d,.]+)/,
      );

      // Dynamically sum all "Payoff to..." line items
      let totalPayoffAmount = 0;
      const payoffRegex = /Payoff to[^\$]*?\$([\d,.]+)/g;
      let match;
      while ((match = payoffRegex.exec(rawText)) !== null) {
        totalPayoffAmount += parseCurrency(match[1]);
      }

      // Part 2: Smart Escrow Extractions (Isolating sections F & G)
      const sectionFIndex = rawText.indexOf("F. Prepaids");
      const sectionFText =
        sectionFIndex !== -1 ? rawText.substring(sectionFIndex) : rawText;

      const sectionGIndex = rawText.indexOf(
        "G. Initial Escrow Payment at Closing",
      );
      const sectionGText =
        sectionGIndex !== -1 ? rawText.substring(sectionGIndex) : rawText;

      const prepaids = getLastCurrencyInBlock(
        sectionFText,
        "03 Prepaid Interest",
        "04",
      );
      const escHomeIns = getLastCurrencyInBlock(
        sectionGText,
        "01 Homeowner's Insurance",
        "02",
      );
      const escPropTax = getLastCurrencyInBlock(
        sectionGText,
        "03 Property Taxes",
        "04",
      );
      const aggregateAdjustmentMatch = sectionGText.match(
        /08 Aggregate Adjustment[^\$]*?(-\$[\d,.]+)/,
      );

      // ---------------------------------------------------------
      // ASSIGNMENT & CLEANING PHASE
      // ---------------------------------------------------------
      const sectionA = parseCurrency(sectionAMatch?.[1]);
      const sectionB = parseCurrency(sectionBMatch?.[1]);
      const sectionC = parseCurrency(sectionCMatch?.[1]);
      const sectionE = parseCurrency(sectionEMatch?.[1]);
      const lenderCredits = parseCurrency(lenderCreditMatch?.[1]);

      const loanAmount = parseCurrency(loanAmountMatch?.[1]);
      const cashToClose = parseCurrency(cashToCloseMatch?.[1]);
      const principalReduction = parseCurrency(principalReductionMatch?.[1]);
      const escAggrAdj = parseCurrency(aggregateAdjustmentMatch?.[1]);

      // ---------------------------------------------------------
      // BUSINESS LOGIC & MATH PHASE
      // ---------------------------------------------------------

      // Compute Part 1 (Costs)
      const sectionDSum = sectionA + sectionB + sectionC;
      const totalCostOfLoan = sectionDSum + sectionE;
      const benefitsCost = totalCostOfLoan + lenderCredits;

      // Compute Part 2 (Escrows & Payoff)
      const excessOverPayoff =
        totalPayoffAmount + principalReduction - loanAmount;
      const escrowsSectionG = escHomeIns + escPropTax + escAggrAdj;
      const escrowsPlusPrepaid = escrowsSectionG + prepaids;
      const escrowsPrepaidExcess = escrowsPlusPrepaid + excessOverPayoff;
      const benefitsEscrow = escrowsPrepaidExcess - cashToClose;

      // ---------------------------------------------------------
      // RESPONSE PHASE: Send Data to React
      // ---------------------------------------------------------

      // Structure the final result as a clean JSON object
      res.json({
        part1: {
          sectionA,
          sectionB,
          sectionC,
          sectionDSum,
          sectionE,
          totalCostOfLoan,
          lenderCredits,
          benefitsCost,
        },
        part2: {
          loanAmount,
          payoffAmount: totalPayoffAmount,
          principalReduction,
          excessOverPayoff,
          prepaids,
          escHomeIns,
          escPropTax,
          escAggrAdj,
          escrowsSectionG,
          escrowsPlusPrepaid,
          escrowsPrepaidExcess,
          cashToClose,
          benefitsEscrow,
        },
      });
    } catch (error) {
      console.error("Calculation Error:", error);
      res.status(500).json({ error: "Failed to process business logic." });
    } finally {
      // Clean up: Delete the temporary PDF file to save server space
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
  });

  // 3. Trigger the parser to start reading the uploaded file
  pdfParser.loadPDF(req.file.path);
});

const PORT = 5000;
app.listen(PORT);
