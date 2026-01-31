# **App Name**: MediLens

## Core Features:

- Medicine Search: Allow users to search for medicines by name or batch number without authentication.
- Multi-Source Data Analysis: Simulate a backend using Firebase Genkit and Gemini to analyze data from WHO Alerts, FDA Counterfeit lists, and CDSCO spurious drug reports. The Genimi tool should be used for performing the data analysis task. It must decide whether or not the searched input matches those alerts.
- Global Health Threats Cross-Reference: Cross-reference user input against a 'Global Health Threats' Firestore collection to identify potential risks.
- Red Alert Display: Display a prominent 'Red Alert' card with the flagged batch/serial number, source of the alert, and reason for failure if a match is found.
- Safety Checklist: Provide a 'Safety Checklist' for manual packaging inspection (spelling errors, missing seals) if no direct match is found in the database.
- Live Global Alerts Ticker: Display a scrolling ticker on the dashboard showing real-time falsified medicine reports from 2024-2025.
- Firestore integration: Global Health Threats stored in Firestore
- Integrate Previous Medical Reports: Integrate with previous medical reports and history to identify fake medicines

## Style Guidelines:

- Primary color: Deep blue (#2962FF) to evoke trust and reliability in healthcare information.
- Background color: Light blue (#E0F7FA) for a clean, clinical feel.
- Accent color: Yellow-orange (#FFAB40) to highlight critical alerts and interactive elements.
- Body font: 'Inter' sans-serif font providing clear readability.
- Headline font: 'Space Grotesk' sans-serif font giving a modern and technical look.
- Use clear, standard medical icons for medicine categories and alert types.
- Emphasize a clean, easy-to-navigate layout with prominent search and alert sections.
- Subtle animations for loading indicators and alert transitions to enhance user experience.