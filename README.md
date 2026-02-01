# MediLens: AI-Powered Medicine Verification

MediLens is a web application that uses a multi-agent AI system to help users verify the authenticity of their medication. By simply taking a photo of a pill, users get instant analysis from a team of specialized AIs.

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
-   **Deployment:** Firebase App Hosting (Recommended for >10s runtimes)

## 🚀 Getting Started

### Local Development
1.  **Clone the repository.**
2.  **Install dependencies:** `npm install`
3.  **Set up environment variables:** Create a `.env` file with your `GEMINI_API_KEY`, `EXA_API_KEY`, and `GROQ_API_KEY`.
4.  **Run:** `npm run dev`

### 🚀 Deployment (Recommended: Firebase)
Due to the complexity of the multi-agent AI analysis, this app requires runtimes longer than 10 seconds. We recommend **Firebase App Hosting**:

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project.
3.  In the Build menu, select **App Hosting**.
4.  Connect your GitHub repository.
5.  In the App Hosting settings, add your **Environment Variables** (API Keys).
6.  Firebase will automatically deploy your app with a 60-second timeout.

---
Built with love ❤️ by JARVIS Team
