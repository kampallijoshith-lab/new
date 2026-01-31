# MediLens: AI-Powered Medicine Verification

MediLens is a web application that uses a multi-agent AI system to help users verify the authenticity of their medication. By simply taking a photo of a pill, users get instant analysis from a team of specialized AIs:

- **Gemini (Vision):** Describes the pill's physical characteristics.
- **Exa (Research):** Searches global health databases for ground-truth information.
- **Groq (Analysis):** Performs a rapid forensic analysis and provides the final verdict.

## ✨ Features

-   **Multi-Agent AI Analysis:** A sophisticated AI architecture using Gemini, Exa, and Groq for fast, accurate results.
-   **Instant Medicine Information:** Get details on primary uses, mechanism, and common indications.
-   **Deep Forensic Analysis:** Checks physical characteristics (imprint, color, shape) against known data.
-   **Authenticity Score & Verdict:** Receive a clear verdict (`Authentic`, `Inconclusive`, `Counterfeit Risk`) with a detailed score breakdown.
-   **Responsive Design:** A modern, interactive UI that works on both desktop and mobile devices.
-   **Live Counterfeit Alerts:** A ticker displays real-time simulated alerts about counterfeit medicines worldwide.

## 🛠️ Tech Stack

-   **Frontend:** [Next.js](https://nextjs.org/) (React Framework), [TypeScript](https://www.typescriptlang.org/)
-   **UI:** [ShadCN UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
-   **Generative AI:**
    -   [Genkit](https://firebase.google.com/docs/genkit) with **Google Gemini** for vision.
    -   **Exa AI** for intelligent, deep-web research.
    -   **Groq** for ultra-fast analysis and response generation.
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
    Create a `.env` file in the root of the project and add your API keys:
    ```env
    # For Gemini Vision
    GEMINI_API_KEY=AIza...

    # For Exa Research - Get a key from https://exa.ai
    EXA_API_KEY=...

    # For Groq Analysis - Get a key from https://console.groq.com/keys
    GROQ_API_KEY=gsk_...
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9002`.

## 🤖 AI Flows

The core AI logic is managed by Genkit flows and other SDKs in `src/ai/flows/`.

-   **`forensic-analysis-flow.ts`**: An orchestrated, multi-agent flow that uses Gemini, Exa, and Groq to perform a detailed forensic analysis of a pill image and generate an authenticity verdict.
-   **`cross-reference-global-health-threats.ts`**: Simulates checking the medicine against a database of known counterfeit drugs.
-   **`integrate-previous-reports.ts`**: Simulates integrating patient history to identify trends or anomalies.

## 📂 Project Structure

```
.
├── src
│   ├── app/                # Next.js App Router pages
│   ├── ai/                 # AI flows and configuration
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
