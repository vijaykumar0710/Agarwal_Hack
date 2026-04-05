# Closing Disclosure (CD) Benefit Calculator

An automated full-stack tool designed to extract financial data from standard Closing Disclosure (CD) PDF documents and calculate a two-part benefit summary.

## Live Links
- https://agarwal-hack.vercel.app/
## Tech Stack
- **Frontend:** React.js (Vite), Axios, Lucide-React, CSS3 (Dark Theme).
- **Backend:** Node.js, Express.js, Multer (File Handling), pdf2json (PDF Parsing).

## Key Features & Logic
- **Dynamic Extraction:** Uses Regular Expressions (Regex) to locate financial sections (A, B, C, E, Payoffs, and Escrows) without relying on hardcoded positions.
- **Handling Negative Values:** - Automatically detects and preserves minus signs (`-`) for items like **Lender Credits** and **Aggregate Adjustments**.
    - Displays these values in **Red** with a leading minus sign (e.g., `-$13,482.00`) to match industry standards.
- **Handling Missing Data:** Defaults missing or blank PDF fields to `$0.00` using a robust parsing utility to prevent calculation errors.
- **Benefit Formulas:** Implements complex math to derive total loan costs, escrow totals, and final savings benefits as depicted in standard FinTech models.

## 💻 Local Setup

### 1. Backend Setup
```bash
cd Backend
npm install
node server.js  
 ```
### 2. Frontend Setup
```
cd Frontend
npm install
npm run dev
