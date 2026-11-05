# System Architecture & Business Overview

The Quarterly Sales & Region Revenue Analyzer is an executive analytics platform designed to ingest commercial sales transaction data, audit data quality, and provide high-level visibility into regional performance and quarter-over-quarter revenue trends. By combining interactive pivot tables, grouped visual charts, and automated error auditing, the application enables business leaders and finance teams to pinpoint revenue trajectories, drill down into product and sales channel drivers, and instantly review concise, three-sentence AI-generated briefings explaining which sales region experienced the greatest financial shift between Q2 and Q3.

## File Inventory

| File | Purpose |
| :--- | :--- |
| `ARCHITECTURE.md` | Provides a business-oriented overview of the application purpose, workflow, and a file-by-file inventory. |
| `.env.example` | Documents the required environment variables, such as server port and Gemini API credentials, needed to configure the application. |
| `.gitignore` | Specifies files and directories that Git version control should ignore, such as dependencies, build outputs, and private environment files. |
| `index.html` | Serves as the web page entry point that mounts the user interface and configures SEO titles, meta tags, and typography. |
| `metadata.json` | Defines the AI Studio application profile, including title, description, and required server-side API permissions. |
| `package.json` | Manages the project's dependencies, development libraries, and automated run scripts for building and serving the app. |
| `server.ts` | Powers the Node.js Express backend that hosts the API endpoint for Gemini-powered Q2-to-Q3 revenue summaries and serves the web application. |
| `tsconfig.json` | Configures the TypeScript compiler rules, module resolution, and path aliases across the codebase. |
| `vite.config.ts` | Controls the frontend build pipeline, styling plugins, alias routing, and local development server settings. |
| `src/App.tsx` | Acts as the central application container orchestrating state management, data calculations, user notifications, and high-level dashboard layout. |
| `src/index.css` | Sets up global styling and imports the Tailwind CSS framework used across all user interface elements. |
| `src/main.tsx` | Bootstraps the React framework and mounts the root application component into the DOM. |
| `src/types.ts` | Defines data structures and TypeScript interfaces for sales orders, calculation matrices, and error audit findings. |
| `src/components/AiSummaryCard.tsx` | Displays an executive briefing summarizing Q2 to Q3 regional revenue changes along with supporting mathematical proof. |
| `src/components/ErrorAuditModal.tsx` | Provides an interactive audit dialog where business analysts can inspect, correct, or simulate common data entry errors. |
| `src/components/Navbar.tsx` | Delivers the top navigation bar with headline revenue figures, data health indicators, and quick action buttons for demo data and uploads. |
| `src/components/OrdersExplorer.tsx` | Enables granular exploration, search, sorting, and pagination of individual sales transaction records. |
| `src/components/RevenueChart.tsx` | Renders visual bar charts comparing total gross revenue across quarters grouped by geographical territory. |
| `src/components/RevenueTable.tsx` | Displays a structured financial pivot table calculating quarterly regional revenue and total margin breakdowns. |
| `src/components/UploadModal.tsx` | Offers a drag-and-drop CSV file uploader that validates columns and imports custom enterprise sales datasets. |
| `src/utils/analytics.ts` | Contains mathematical computation engines that aggregate revenue matrices and calculate quarter-over-quarter regional rank changes. |
| `src/utils/csvParser.ts` | Handles parsing, validating, generating sample data, and exporting sales records to CSV format. |
| `src/utils/errorAuditor.ts` | Runs automated quality control scans to identify data anomalies, excessive discounts, duplicate transactions, and typo errors. |
