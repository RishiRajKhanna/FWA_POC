# Healthcare Fraud Detection System - Development Prompts

This document outlines the prompts and development approach used to build the Healthcare Fraud Detection System using various AI-assisted development tools.

## Tools Used

- **Frontend Design**: Figma
- **API Development**: Gemini Code Assist, Gemini CLI
- **Code Editing**: Cursor
- **Project Management**: Vibe Coding

## Frontend Development Prompts

### Landing Page
```
Create a professional healthcare fraud detection dashboard landing page using React and TypeScript with:
- Modern, clean design with healthcare-themed color scheme (blues, greens, whites)
- Header with logo and title "Healthcare FWA Analytics"
- Hero section with headline "Advanced Healthcare Claims Analysis"
- Feature grid showcasing 6 key capabilities:
  * Machine Learning Detection
  * Business Rules Engine
  * Comprehensive Analytics
  * Risk Scoring
  * Provider Analysis
  * Case Management
- "How It Works" section with 4 steps
- Call-to-action button for uploading claims data
- Responsive design using Tailwind CSS
- Use Lucide React icons for visual elements
```

### CSV Upload Component
```
Create a React component for CSV file upload with the following features:
- File selection with drag-and-drop capability
- CSV field mapping interface with automatic column recognition
- Progress indicators for file processing
- Validation for required healthcare claim fields:
  * Claim ID, Member ID, Provider ID
  * Service dates, procedure codes, diagnosis codes
  * Billing amounts (billed, allowed, paid)
  * Provider information and demographics
- Descriptive analysis of uploaded data
- Error handling for invalid files
- Integration with PapaParse for CSV parsing
- Responsive design with loading states
```

### Main Dashboard
```
Create a comprehensive analytics dashboard for healthcare fraud detection with:
- Key Performance Indicators (KPIs) display
- Risk trend visualization over time using line charts
- Top risk providers ranking with risk scores
- Top procedures analysis with fraud indicators
- Scenario breakdown of detected anomalies
- Sample flagged claims with detailed information
- Export functionality for reports
- Interactive charts using Recharts library
- Responsive grid layout with cards
- Professional healthcare-themed styling
```

### Scenario Details
```
Create a detailed scenario analysis component that:
- Shows comprehensive information about flagged claims
- Displays claim details in organized sections:
  * Financial information
  * Provider and service details
  * Medical and benefit information
  * Additional claim metadata
- Risk scoring visualization
- Export options for specific scenarios
- Modal-based detailed view
- Responsive design for all screen sizes
```

## Backend/API Development Prompts

### Fraud Detection Scenarios
```
Create 22 Python-based fraud detection scenarios for healthcare claims analysis:

Scenario 1 - Benefit Outlier Detection:
- Use statistical analysis to identify unusual benefit amounts
- Apply IQR method for outlier detection
- Consider provider, country, and benefit-specific thresholds
- Return flagged claim IDs with risk scores

Scenario 2 - Chemotherapy Gap Detection:
- Identify suspicious gaps in chemotherapy treatment sequences
- Flag patients with irregular treatment intervals
- Return gap analysis with dates and durations

Scenario 3 - Cross-Country Fraud Detection:
- Detect patients receiving treatment in multiple countries within 24 hours
- Flag geographic impossibilities
- Return conflicting claims with country details

Scenario 4 - Sunday Claims Analysis:
- Identify claims for treatments provided on Sundays
- Flag unusual weekend treatment patterns
- Return Sunday claims with service dates

Scenario 5 - Multiple Claims Same Invoice:
- Detect duplicate claims with identical invoice reference numbers
- Flag potential billing fraud
- Return duplicate claim sets

Scenario 6 - Inpatient/Outpatient Same Date:
- Identify patients with both inpatient and outpatient services on same date
- Flag conflicting service types
- Return conflicting claims

Scenario 7 - Provider Multi-Country:
- Flag non-global providers operating in more than 3 countries
- Identify unusual provider geographic patterns
- Return multi-country providers

Scenario 8 - Multiple Provider Same Date:
- Detect patients visiting more than 2 providers on the same date
- Flag potential duplicate billing
- Return overlapping provider visits

Scenario 9 - Member Multi-Currency:
- Identify members with claims in 3 or more different currencies
- Flag unusual currency usage patterns
- Return multi-currency members

Scenario 10 - Gender-Procedure Mismatch:
- Detect gender-specific procedures assigned to wrong gender
- Use ICD-10 and CPT code validation
- Return mismatched claims

Scenario 11 - Early Invoice Date:
- Flag claims where invoice date is before treatment date
- Identify temporal inconsistencies
- Return early-dated claims

Scenario 12 - Adult Pediatric Diagnosis:
- Identify adults with pediatric/neonatal diagnoses
- Flag age-inappropriate medical codes
- Return mismatched claims

Scenario 13 - Multiple Payee Types:
- Flag same member with different payee types on same invoice date
- Identify billing inconsistencies
- Return conflicting payee claims

Scenario 14 - Excessive Diagnoses:
- Detect members with more than 8 diagnoses on same day
- Flag potentially fraudulent diagnosis patterns
- Return excessive diagnosis claims

Scenario 15 - Hospital Benefits from Non-Hospital Providers:
- Flag non-hospital providers using hospital-only benefit codes
- Validate provider type against benefit codes
- Return mismatched claims

Scenario 16 - Paid Claims from Veterinary Providers:
- Flag paid claims from specific veterinary providers
- Identify inappropriate provider types
- Return veterinary claims

Scenario 17 - Multiple MRI/CT Same Day:
- Detect multiple MRI/CT procedures on same day for same diagnosis
- Flag potentially unnecessary procedures
- Return duplicate imaging claims

Scenario 18 - Placeholder Scenario:
- Create template for future fraud detection scenarios

Scenario 19 - Multiple Screenings Same Year:
- Flag members with multiple screenings in same year
- Identify potentially excessive preventive care
- Return screening claims

Scenario 20 - Dialysis Without Kidney Diagnosis:
- Flag dialysis claims without kidney/renal diagnoses
- Validate medical necessity
- Return inconsistent claims

Scenario 21 - Unusual Dentistry Claims:
- Flag dentistry claims with non-dental diagnosis codes
- Validate specialty appropriateness
- Return mismatched claims

Scenario 22 - Invalid Migraine Claims:
- Flag migraine diagnoses with invalid benefit codes
- Validate diagnosis-benefit combinations
- Return inconsistent claims
```

### API Implementation
```
Create a Flask-based REST API for the healthcare fraud detection system with:

Core Endpoints:
- GET /api/health - System health check
- POST /api/upload - File upload with validation
- POST /api/analyze - Fraud detection analysis
- GET /api/scenario/<id> - Detailed scenario analysis

Features:
- CORS support for frontend integration
- Temporary file storage for uploaded CSVs
- Dynamic module loading for fraud scenarios
- JSON response formatting
- Error handling and logging
- Risk scoring for detected anomalies
- Result aggregation and summary statistics
- Export functionality for flagged claims

Integration Requirements:
- Accept CSV files with healthcare claim data
- Process claims using all 22 fraud detection scenarios
- Return structured results with risk scores
- Support scenario-specific detailed analysis
- Enable selective scenario execution
```

## Integration Prompts

### Frontend-Backend Integration
```
Integrate the React frontend with the Flask backend API:

API Connection:
- Create service layer for API calls
- Implement error handling for network requests
- Manage loading states during data processing
- Handle authentication and session management

Data Flow:
- Upload CSV files to backend via /api/upload
- Trigger analysis via /api/analyze endpoint
- Display results in dashboard components
- Show detailed scenario information via /api/scenario endpoints
- Enable export of flagged claims

State Management:
- Manage application state with React hooks
- Handle data transformation between API and UI
- Implement caching for improved performance
- Manage user preferences and settings
```

### Deployment and Configuration
```
Create deployment configuration for the healthcare fraud detection system:

Frontend:
- Vite build configuration
- Environment variables for API endpoints
- Production optimization settings
- Static asset handling

Backend:
- Flask application configuration
- CORS settings for frontend integration
- Logging and error reporting
- Temporary file storage management

Infrastructure:
- Development and production environment setup
- API endpoint configuration
- Security considerations
- Performance optimization
```

## UI/UX Design Prompts

### Component Design System
```
Create a consistent design system for healthcare fraud detection dashboard:

Color Palette:
- Primary: Professional blues (#2563eb, #3b82f6)
- Secondary: Supporting greens and purples
- Accent: Warning oranges and reds for risk indicators
- Neutral: Grays for backgrounds and text

Typography:
- Clean, readable fonts
- Consistent heading hierarchy
- Appropriate font sizing for data displays

Components:
- Cards for data grouping
- Badges for status and risk indicators
- Buttons with consistent styling
- Forms with proper validation
- Tables for data display
- Charts with clear labeling

Responsive Design:
- Mobile-first approach
- Grid-based layouts
- Adaptive component sizing
- Touch-friendly interactions
```

### Data Visualization
```
Create effective data visualizations for fraud detection analytics:

Chart Types:
- Line charts for trend analysis
- Bar charts for scenario comparisons
- Pie charts for categorical data
- Area charts for cumulative metrics

Data Presentation:
- Clear axis labeling
- Consistent color coding
- Interactive tooltips
- Responsive sizing
- Export capabilities

Dashboard Layout:
- Grid-based organization
- Priority-based information hierarchy
- Consistent spacing and alignment
- Visual flow from summary to details
```
