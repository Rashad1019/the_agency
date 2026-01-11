# Washing Machine Data Cleaning & Analysis Pipeline

This document summarizes **everything done in this chat**, from raw CSV ingestion to a final **analysis-ready dataset** suitable for a public-facing data analysis website.

---

## 1. Initial Dataset

- **Source file:** `Washingmachine.csv`
- **Nature of data:** E‑commerce washing machine listings
- **Initial issues identified:**
  - Prices stored as strings with currency symbols
  - Capacities and spin speeds stored as text
  - Heavy duplication of the same machine models across multiple URLs
  - Redundant brand columns
  - Too many categorical variants for website use

---

## 2. First-Pass Cleaning (Baseline Hygiene)

Performed standard data hygiene steps:

- Trimmed whitespace from column names and string values
- Removed exact duplicate rows
- Dropped fully empty rows
- Filled missing categorical values with `"Unknown"`
- Preserved numeric nulls (no guessing or imputation)

**Output:**
- `Washingmachine_cleaned.csv`

This step made the data usable, but **not analysis-ready**.

---

## 3. Deep-Dive Audit & Diagnostics

A structural audit revealed critical insights:

### Duplication
- **1056 total rows**
- **33 unique (Brand + Model) combinations**
- Some models appeared **40+ times** as separate listings

### Data-Type Problems
- `Price`, `Washing Capacity`, and `Maximum Spin Speed` were all strings
- Categories like `Function Type` and `Washing Method` had near-duplicates

### Key Conclusion
The dataset required **normalization and deduplication**, not just cleaning.

---

## 4. Two Working Datasets Created

### A. Normalized (Listing-Level)
**Purpose:** Evidence, drilldowns, and price variation

- One row per product URL
- Added parsed numeric columns:
  - `price_inr`
  - `capacity_kg`
  - `spin_rpm`
- Standardized categories
- Split multi-color fields

**File:** `Washingmachine_normalized.csv`

---

### B. Deduped (Model-Level)
**Purpose:** Rankings and comparisons

- One row per **Brand + Model**
- Aggregated listings into:
  - min / max / median price
  - listing count (confidence)
  - representative rating and specs

**File:** `Washingmachine_deduped_by_model.csv`

This became the foundation for the website.

---

## 5. Website-Oriented Design Decisions

Based on your direction, the following constraints were applied:

### Pricing
- Keep **one price only**
- Use **median price** (robust)
- Convert to **USD** using a fixed exchange rate

### Brands
- Remove all redundant brand columns
- Keep exactly **one standardized brand field**

### Categories
- Reduce machine type to exactly:
  - Fully Automatic Front Load
  - Fully Automatic Top Load
  - Semi Automatic Top Load

### Units
- Convert capacity to **imperial (pounds)**
- Keep RPM unchanged (already standard)

---

## 6. Final Analysis-Ready Dataset

All rules were applied in a single clean pass.

### Transformations Applied

- `median_price_inr` → `avg_price_usd`
- `capacity_kg` → `capacity_lb`
- `heater` → `has_heater` (Yes / No)
- Unified brand column
- Dropped unused and redundant fields
- Sorted for presentation (rating ↓, price ↑)

### Final Schema

| Column | Description |
|------|-------------|
| brand | Manufacturer |
| model_name | Machine model |
| avg_price_usd | Single comparable price |
| rating | User rating |
| capacity_lb | Load capacity (imperial) |
| spin_rpm | Spin speed |
| function_type | Machine category |
| has_heater | Feature flag |
| listings | Evidence / confidence |

**File:** `Washingmachine_analysis_ready.csv`

---

## 7. Intended Use

This final dataset is suitable for:

- "Best Washing Machines" rankings
- Value vs performance comparisons
- Filterable tables (price, capacity, type)
- Transparent, methodology-backed reporting

The normalized dataset remains available for **drilldowns and sourcing**, while the analysis-ready dataset powers all rankings.

---

## 8. Next Logical Extensions (Optional)

- Add scoring columns (Overall / Value / Performance)
- Generate a static HTML analysis website
- Create visualizations (price vs rating, capacity vs price)
- Add a methodology & limitations page

---

**Status:** Data is now clean, minimal, honest, and production-ready for a public analysis website.

