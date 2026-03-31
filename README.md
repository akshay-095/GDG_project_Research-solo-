# Synthetix: AI-Powered Research Synthesis

## Problem Statement

In the modern digital era, researchers, students, and professionals are constantly overwhelmed by an "information blizzard." Academic papers are becoming longer and more complex, while the sheer volume of web-based resources is growing exponentially. The traditional method of manually reading, highlighting, and summarizing these sources is no longer sustainable. It is a slow, error-prone process that often leads to "cognitive fatigue," where the researcher loses the ability to connect high-level concepts because they are bogged down in the minutiae of the text. This bottleneck hinders innovation and slows down the pace of learning and discovery.

## Project Description: How it Works (The Synthesis Engine)

Synthetix is designed to be more than just a summarizer; it is a cognitive bridge between raw data and actionable knowledge. The core of the application is a sophisticated "Synthesis Engine" built on a React-based frontend and a Node.js backend. 

When a user interacts with Synthetix, they provide either a block of text or a URL. The application first processes this input, ensuring it is clean and ready for analysis. If a URL is provided, the system utilizes specialized tools to fetch and parse the web content. This data is then fed into our AI orchestration layer, which communicates with Google's Gemini models.

The true power of Synthetix lies in its multi-dimensional analysis. Instead of a simple paragraph summary, the engine performs three distinct cognitive tasks simultaneously:
1.  **Executive Summarization**: It distills the core thesis and narrative of the source material into a high-level overview.
2.  **Insight Extraction**: It identifies the "Key Takeaways"—the specific, actionable points or discoveries that are most relevant to a researcher.
3.  **Technical Decoding**: It automatically identifies complex terminology and jargon, generating a "Glossary" with clear definitions. This ensures that even highly technical papers become accessible to non-experts or students new to a field.

To protect researcher privacy, Synthetix implements a secure, email-based isolation system. Each user's research history is stored locally but indexed by their unique email, ensuring that a shared machine can be used by multiple researchers without their data overlapping or leaking.

## Google AI Usage: Technical Proof & Integration

### The Power of Gemini
Synthetix is powered by the **Gemini 3 series** of models, specifically `gemini-3-flash-preview` for high-speed synthesis and `gemini-3.1-pro-preview` for deep academic reasoning. We chose Gemini because of its industry-leading context window and its ability to handle complex, multi-modal data with high precision.

### Technical Integration & Proof
Our integration is handled via the `@google/genai` SDK, which allows for direct, low-latency communication with Google's AI infrastructure. We employ several advanced techniques to ensure the quality of the output:

-   **Structured Output (JSON Schema)**: We don't just "ask" the AI for a summary. We provide a strict JSON schema that forces the model to return data in a machine-readable format. This ensures that our UI can reliably render the summary, takeaways, and glossary without parsing errors.
-   **System Instructions**: We use a specialized system prompt that defines the AI's persona as an "Expert Research Assistant." This prompt includes instructions on tone, academic rigor, and the specific structure required for the glossary.
-   **URL Context Tool**: We utilize the `urlContext` tool, which allows the Gemini model to directly access and analyze web content. This is a "Proof of Usage" of Google's advanced grounding capabilities, moving beyond simple text-based prompts to real-world web integration.

**Proof of Usage Screenshots:**
- [Gemini API Integration](./proof/ai-proof.png) - *Showing the SDK implementation and JSON schema enforcement.*
- [Grounding & Tools](./proof/grounding-proof.png) - *Showing the model utilizing URL context for live web analysis.*

---

## Installation & Usage Guide

### Prerequisites
- **Node.js**: Version 18.x or higher.
- **Gemini API Key**: Obtainable from the [Google AI Studio](https://aistudio.google.com/).

### Installation Steps

1.  **Clone the Repository**:
    ```bash
    git clone <your-repo-link>
    cd synthetix
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env` file in the root directory and add your API key:
    ```env
    GEMINI_API_KEY=your_actual_api_key_here
    ```

4.  **Launch the Application**:
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:3000`.

### How to Use Synthetix

1.  **Sign In**: Enter your email address on the landing page. This creates your private research session.
2.  **Input Content**: 
    - Paste a long research paper or article into the text area.
    - **OR** Paste a URL to a web article or academic blog post.
3.  **Synthesize**: Click the "Synthesize" button. The AI will process the content in real-time.
4.  **Review & Save**: Explore the generated Summary, Takeaways, and Glossary. Your work is automatically saved to your "Recent Work" sidebar.
5.  **Manage History**: You can revisit previous syntheses at any time or delete them to keep your library organized.
