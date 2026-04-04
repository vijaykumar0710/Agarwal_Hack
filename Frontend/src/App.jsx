import React, { useState } from "react";
import axios from "axios";
import { Upload, FileText, AlertCircle } from "lucide-react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  
  const formatCurrency = (num, useMinusSign = false) => {
    if (num === undefined || num === null) return "$0.00";
    const isNegative = num < 0;
    const formatted = Math.abs(num).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });

    if (isNegative) {
      return useMinusSign ? `-${formatted}` : `(${formatted})`;
    }
    return formatted;
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError("Please select a valid PDF document.");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("cdDocument", file);

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await axios.post(
        "https://agarwal-hack1.onrender.com/api/parse-cd",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setResults(response.data);
    } catch (err) {
      console.error("Upload failed", err);
      setError(
        "Failed to process the document. Ensure the backend server is running on port 5000.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Closing Disclosure Calculator</h1>
        <p>
          Upload a standard CD PDF to instantly extract data and calculate
          benefits.
        </p>
      </header>

      <main className="main-content">
        {/* Upload Section */}
        <div className="upload-card">
          <div className="upload-area">
            <FileText size={48} className="upload-icon" />
            <input
              type="file"
              id="file-upload"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden-input"
            />
            <label htmlFor="file-upload" className="upload-label">
              Choose PDF File
            </label>
            {file && <span className="file-name">{file.name}</span>}
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            className="calculate-btn"
            onClick={handleUpload}
            disabled={!file || loading}
          >
            {loading ? "Processing..." : "Calculate Benefits"}
            {!loading && <Upload size={18} className="btn-icon" />}
          </button>
        </div>

        {results && (
          <div className="results-container">
            <div className="result-card">
              <div className="card-header">
                <h2>Part 1 — Savings Depicted by Cost</h2>
                <span className="subtitle">How Benefits are received</span>
              </div>

              <div className="table-body">
                <div className="section-title">LOAN COST</div>
                <div className="data-row">
                  <span>Section A</span>
                  <span>{formatCurrency(results.part1.sectionA)}</span>
                </div>
                <div className="data-row">
                  <span>Section B</span>
                  <span>{formatCurrency(results.part1.sectionB)}</span>
                </div>
                <div className="data-row">
                  <span>Section C</span>
                  <span>{formatCurrency(results.part1.sectionC)}</span>
                </div>
                <div className="data-row highlight">
                  <span>Section D (Sum)</span>
                  <span>{formatCurrency(results.part1.sectionDSum)}</span>
                </div>
                <div className="data-row">
                  <span>Section E</span>
                  <span>{formatCurrency(results.part1.sectionE)}</span>
                </div>

                <div className="divider"></div>

                <div className="data-row summary">
                  <span>Total Cost of Loan</span>
                  <span>{formatCurrency(results.part1.totalCostOfLoan)}</span>
                </div>

                <div className="data-row negative">
                  <span>Lenders Credit</span>
                  <span>
                    {formatCurrency(results.part1.lenderCredits, true)}
                  </span>
                </div>

                <div className="data-row grand-total">
                  <span>Benefits</span>
                  <span>{formatCurrency(results.part1.benefitsCost)}</span>
                </div>
              </div>
            </div>

            {/* ---------------- PART 2 TABLE ---------------- */}
            <div className="result-card">
              <div className="card-header">
                <h2>Part 2 — Savings Depicted by Escrows & Payoff</h2>
                <span className="subtitle">Escrow & Payoff breakdown</span>
              </div>

              <div className="table-body">
                <div className="data-row">
                  <span>Loan Amount (Page 1)</span>
                  <span>{formatCurrency(results.part2.loanAmount)}</span>
                </div>
                <div className="data-row">
                  <span>Payoff Amount (Summed)</span>
                  <span>{formatCurrency(results.part2.payoffAmount)}</span>
                </div>
                <div className="data-row">
                  <span>Principal Reduction</span>
                  <span>
                    {formatCurrency(results.part2.principalReduction)}
                  </span>
                </div>
                <div className="data-row highlight">
                  <span>Excess Amount over Payoff</span>
                  <span>{formatCurrency(results.part2.excessOverPayoff)}</span>
                </div>

                <div className="section-title">PREPAID (SECTION F)</div>
                <div className="data-row indented">
                  <span>Home Owners Insurance</span>
                  <span>$0.00</span>
                </div>
                <div className="data-row indented">
                  <span>Prepaid Interest</span>
                  <span>{formatCurrency(results.part2.prepaids)}</span>
                </div>
                <div className="data-row highlight">
                  <span>Prepaid (Section F)</span>
                  <span>{formatCurrency(results.part2.prepaids)}</span>
                </div>

                <div className="section-title">ESCROWS (SECTION G)</div>
                <div className="data-row indented">
                  <span>01 Homeowner's Insurance</span>
                  <span>{formatCurrency(results.part2.escHomeIns)}</span>
                </div>
                <div className="data-row indented">
                  <span>02 Mortgage Insurance per month</span>
                  <span>$0.00</span>
                </div>
                <div className="data-row indented">
                  <span>03 Property Taxes</span>
                  <span>{formatCurrency(results.part2.escPropTax)}</span>
                </div>
                <div className="data-row indented">
                  <span>04 City Property Tax</span>
                  <span>$0.00</span>
                </div>

                {/* ⭐️ AGGREGATE ADJUSTMENT WITH MINUS SIGN AND RED COLOR */}
                <div className="data-row indented negative">
                  <span>Aggregate Adjustment</span>
                  <span>{formatCurrency(results.part2.escAggrAdj, true)}</span>
                </div>

                <div className="data-row highlight">
                  <span>Escrows (Section G)</span>
                  <span>{formatCurrency(results.part2.escrowsSectionG)}</span>
                </div>

                <div className="divider"></div>

                <div className="data-row summary">
                  <span>Escrows + Prepaid</span>
                  <span>
                    {formatCurrency(results.part2.escrowsPlusPrepaid)}
                  </span>
                </div>
                <div className="data-row summary">
                  <span>Escrows + Prepaid + Excess Payoff</span>
                  <span>
                    {formatCurrency(results.part2.escrowsPrepaidExcess)}
                  </span>
                </div>
                <div className="data-row">
                  <span>Cash to Close (Page 1)</span>
                  <span>{formatCurrency(results.part2.cashToClose)}</span>
                </div>

                <div className="data-row grand-total">
                  <span>Benefits</span>
                  {/* Part 2 ka benefit normally positive hai, toh normally print hoga */}
                  <span
                    style={{
                      color:
                        results.part2.benefitsEscrow < 0 ? "#FF5A5F" : "white",
                    }}
                  >
                    {formatCurrency(results.part2.benefitsEscrow)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
