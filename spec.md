\# spec.md



\## Core Description

The \*\*Appliance Analytics Platform (AAP)\*\* is a web-based business intelligence tool designed to visualize, filter, and analyze the washing machine market. It processes raw product specifications and listing data to generate interactive dashboards, enabling users to evaluate market positioning, pricing strategies, and technical performance metrics across various brands and models.



\## Core Idea

The appliance market is saturated with models varying in capacity, spin speed, and functionality, making it difficult for consumers to discern value and for retailers to identify competitive gaps. The AAP solves this by aggregating technical specifications (capacity, RPM, heater presence) alongside market data (price, listings, ratings) into a unified interface. This facilitates data-driven decision-making regarding purchasing, inventory stocking, and competitive benchmarking.



\## Inferred Content



\### 1. Data Architecture \& Ingestion

\* \*\*CSV Pipeline\*\*: Automated ingestion of standard CSV datasets containing fields such as `brand`, `model\_name`, `avg\_price\_usd`, `spin\_rpm`, and `rating`.

\* \*\*Data Normalization\*\*: Automatic cleaning of currency fields (e.g., stripping `$` symbols) and standardization of boolean indicators (e.g., `has\_heater`).

\* \*\*Schema Validation\*\*: strict typing for numerical metrics (`capacity\_lb`, `spin\_rpm`) to ensure accurate aggregation.



\### 2. Analytical Dashboard

\* \*\*Market Overview\*\*:

&nbsp;   \* \*\*Price vs. Performance Scatter Plot\*\*: X-axis representing Price, Y-axis representing Rating or Spin RPM, allowing users to identify outliers (high value/low cost).

&nbsp;   \* \*\*Brand Dominance\*\*: Pie and bar charts visualizing market share based on `listings` count and average rating per manufacturer.

\* \*\*Technical Breakdown\*\*:

&nbsp;   \* \*\*Capacity Distribution\*\*: Histogram analysis of `capacity\_lb` to identify the most common form factors.

&nbsp;   \* \*\*Feature Correlation\*\*: Analysis of how specific features (e.g., `has\_heater`, `function\_type`) correlate with price premiums.



\### 3. Interactive Tools

\* \*\*Dynamic Filtering\*\*: Sidebar controls to filter data by Brand, Price Range, Capacity, and Heater availability.

\* \*\*Comparator View\*\*: Side-by-side technical comparison of selected models (e.g., comparing `LG P7020NGAZ` vs. `Samsung WT60R2000LL/TL`).

\* \*\*Search Functionality\*\*: Real-time keyword search for specific model names.



\### 4. Milestones \& Implementation

\* \*\*Phase 1 (MVP)\*\*: Parsing engine, basic tabular view with sorting, and static summary statistics.

\* \*\*Phase 2\*\*: Implementation of Chart.js/D3.js visualizations and interactive filtering.

\* \*\*Phase 3\*\*: Export functionality (PDF reports) and comparative analysis module.

