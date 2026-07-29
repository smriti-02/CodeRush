CodeRush Project: Developer Preferences & Architecture Ledger
1. Architectural Decisions & Tech Stack
Execution Engine: Vercel Sandbox SDK is the definitive choice for code execution to keep the platform free and integrated, completely replacing Judge0, Docker, and RapidAPI.

Language Support: The platform must natively support C, C++, Java, Python, and JavaScript.

Compiler Strategy: Leverage Vercel Sandbox's Amazon Linux environment and sudo access to install gcc, gcc-c++, and java-17-amazon-corretto via dnf.

Sandbox Persistence: Use Named Sandboxes (Sandbox.create({ name: "coderush-engine" })) to cache compiler installations and ensure fast execution after the initial boot.

Concurrency Management: Generate unique execution directories (e.g., via crypto.randomUUID()) inside the shared sandbox to prevent simultaneous users from overwriting files.

2. Data Sourcing & Database Seeding
JSON Schema Mapping: Database models and seed scripts must strictly map to the exact JSON structure provided (e.g., accurately targeting metaData, codeSnippets, and exampleTestcaseList).

Test Case Pragmatism: Prioritize extracting existing data (like ripping expected outputs directly from HTML problem descriptions using regex) over hunting for external open-source datasets to unblock testing immediately.

Stitcher Alignment: The codeStitcher utility must generate code wrappers that perfectly align with compiler expectations (e.g., forcing Java submissions into a public class Main).

3. Workflow & Communication Preferences
Tone: Direct, no-BS communication.

Tooling Instructions: Provide explicit, step-by-step guides for external tools (like Postman) when testing pipelines.

Error Resolution: Address terminal tracebacks and errors with immediate, sequential fix commands rather than lengthy theoretical explanations.

4. Adjustments for Future AI Assistance
Check Tech Assumptions: Do not assume cloud limitations (like Vercel lacking C++ support) without verifying the latest SDK features (e.g., Sandbox microVM root access).

Verify Foundations: Always ensure foundational middleware (express.json()) and environment authentication (vercel env pull) are confirmed before moving to API testing phases.

Stay Lean: Focus on getting a working proof-of-concept for the execution pipeline with a single problem before scaling to thousands of test cases.