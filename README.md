# MediLens: AI-Powered Medicine Verification

MediLens is a web application that uses generative AI to help users verify the authenticity of their medication. By simply taking a photo of a pill or its packaging, users can get instant analysis, including information about the drug, a forensic assessment of its physical characteristics, and a cross-reference against global health alerts.

## ✨ Features

-   **Instant Medicine Information:** Upload a photo of medicine packaging to get details on its primary uses, mechanism, and common indications.
-   **Multi-Step Forensic Analysis:** Upload a photo of a pill for a deep forensic analysis that checks physical characteristics (imprint, color, shape) against known data.
-   **Authenticity Score & Verdict:** Receive a clear verdict (`Authentic`, `Inconclusive`, `Counterfeit Risk`) with a detailed score breakdown.
-   **Global Threat Intelligence:** Cross-references medicine information against a simulated database of global health threats.
-   **Responsive Design:** A modern, interactive UI that works on both desktop and mobile devices.
-   **Live Counterfeit Alerts:** A ticker displays real-time simulated alerts about counterfeit medicines worldwide.

## 🛠️ Tech Stack

-   **Frontend:** [Next.js](https://nextjs.org/) (React Framework), [TypeScript](https://www.typescriptlang.org/)
-   **UI:** [ShadCN UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
-   **Generative AI:** [Genkit](https://firebase.google.com/docs/genkit) (Google's Generative AI toolkit) with Google's Gemini models.
-   **Deployment:** Firebase App Hosting

## 🚀 Getting Started

To run the project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add your Google AI API key:
    ```env
    GEMINI_API_KEY=AIza...
    ```
    You can get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9002`.

## 🤖 AI Flows

The core AI logic is managed by Genkit flows located in `src/ai/flows/`.

-   **`analyze-drug-data.ts`**: Takes an image of medicine packaging and returns general information about the drug.
-   **`forensic-analysis-flow.ts`**: A multi-step flow that performs a detailed forensic analysis of a pill image, comparing it to "ground truth" data to generate an authenticity verdict.
-   **`cross-reference-global-health-threats.ts`**: Simulates checking the medicine against a database of known counterfeit drugs.
-   **`integrate-previous-reports.ts`**: Simulates integrating patient history to identify trends or anomalies.

## 📂 Project Structure

```
.
├── src
│   ├── app/                # Next.js App Router pages
│   ├── ai/                 # Genkit AI flows and configuration
│   │   ├── flows/
│   │   └── genkit.ts
│   ├── components/         # React components
│   │   ├── layout/         # Header, Footer, etc.
│   │   ├── medilens/       # Application-specific components
│   │   └── ui/             # ShadCN UI components
│   ├── hooks/              # Custom React hooks (e.g., useScanner)
│   └── lib/                # Shared utilities and type definitions
├── public/                 # Static assets
├── tailwind.config.ts      # Tailwind CSS configuration
└── next.config.ts          # Next.js configuration
```

## 📄 License

This project is licensed under the MIT License.
# medi-lens
