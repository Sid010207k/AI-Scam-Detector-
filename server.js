const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const { createClient } = require("@supabase/supabase-js");

// ===============================
// URL EXTRACTION
// ===============================

function extractUrls(text) {

    if (!text) {
        return [];
    }

    const urlRegex =
        /https?:\/\/[^\s<>"']+/gi;

    return text.match(urlRegex) || [];
}

const app = express();
const PORT = 3000;


// ===============================
// GEMINI
// ===============================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY
);

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());

app.use(express.json({
    limit: "20mb"
}));

app.use(express.static(path.join(__dirname, "public")));
app.get("/login", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "auth.html")
    );
});


// ===============================
// TEST ROUTE
// ===============================

app.get("/api/test", (req, res) => {

    res.json({
        success: true,
        message: "TRUTH backend is working!"
    });

});
// ===============================
// SCAN HISTORY
// ===============================

app.get("/api/history", async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
    .from("scan_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
            console.log("HISTORY DATA:", data);
console.log("HISTORY ERROR:", error);

        if (error) {
            console.error("Supabase history error:", error);

            return res.status(500).json({
                success: false,
                error: "Failed to load scan history."
            });
        }

        res.json({
            success: true,
            history: data
        });

    } catch (error) {
        console.error("History error:", error);

        res.status(500).json({
            success: false,
            error: "Failed to load scan history."
        });
    }
});


// ===============================
// GEMINI ANALYSIS
// ===============================

app.post("/api/analyze", async (req, res) => {

    try {

       const {
    message,
    imageData,
    mimeType,
    situation
} = req.body;
const detectedUrls = extractUrls(message);

console.log("Detected URLs:", detectedUrls);

        // At least text OR image must be provided

        if (!message && !imageData) {

            return res.status(400).json({
                success: false,
                error: "Please provide a message or screenshot."
            });

        }


        // ===============================
        // PROMPT
        // ===============================

        const prompt = `
You are TRUTH, an AI-powered scam detection and response system.

The user's current situation is:

${situation || "none"}

Tailor the protectionSteps specifically to this situation.

Situation meanings:

- none = The user has not interacted with the scam.
- clicked = The user clicked or opened the suspicious link.
- password = The user shared a password or login credentials.
- otp = The user shared an OTP or verification code.
- money = The user transferred or paid money.

For "none", focus on prevention.

For "clicked", focus on securing the device or browser, avoiding further interaction, and securing affected accounts if credentials were entered.

For "password", prioritize changing the exposed password, securing accounts where the same password was reused, and enabling two-factor authentication.

For "otp", prioritize contacting the relevant bank or service provider immediately if applicable and securing the affected account.

For "money", prioritize contacting the bank or payment provider immediately, attempting to stop or reverse the transaction where possible, preserving evidence, and reporting the incident through appropriate channels.

Do not tell the user that recovery is guaranteed.

Analyze the suspicious content provided by the user.

The content may contain:
- A text message
- An email
- A WhatsApp or SMS screenshot
- A social media message
- A payment request
- A fake job offer
- A phishing attempt
- An impersonation attempt

If an image is provided, carefully inspect the image and use visible text, names, URLs, logos, requests, warnings, and social-engineering signals as evidence.

Look for:
- Phishing
- Impersonation
- Financial fraud
- Credential theft
- OTP theft
- Fake job scams
- Investment scams
- Social engineering
- Urgency
- Fear tactics
- Suspicious links
- Requests for money
- Requests for passwords or OTPs
- Attempts to prevent independent verification

IMPORTANT:
Do not automatically claim something is definitely a scam.
Give a risk assessment based on the evidence available.

Return ONLY valid JSON.

Use exactly this structure:

{
    "threatScore": 0,
    "riskLevel": "LOW",
    "scamCategory": "Unknown",
    "redFlags": [],
    "explanation": "",
    "protectionSteps": [],
    "attackPattern": []
}

Rules:
- threatScore must be an integer from 0 to 100.
- riskLevel must be LOW, MEDIUM, or HIGH.
- scamCategory should describe the most likely category.
- redFlags must contain concise evidence.
- explanation should clearly explain why the content is suspicious or appears safe.
- protectionSteps must contain practical actions for the user's situation.
- Do not use markdown.
- Do not use code fences.
- attackPattern must contain the psychological/social-engineering stages detected in the content.
- Each stage must have a short title and a concise explanation.
- Only include stages supported by evidence in the message or screenshot.
- Use between 2 and 5 stages.
- Possible stages include Fear, Urgency, Isolation, Trust, Reward, Authority, Request, Payment, Credential Theft, or other appropriate stages.
- Do not force the standard Fear → Urgency → Isolation → Request sequence.
`;


        // ===============================
        // BUILD GEMINI CONTENT
        // ===============================

        const contents = [];

        if(message){
        // Add text message if provided

        contents.push({
    text: `
${prompt}

Detected URLs from the user's message:

${detectedUrls.length > 0
    ? detectedUrls.join("\n")
    : "No URLs detected."}

When evaluating the message, consider the URLs as additional evidence.

Look for:
- suspicious or unusual domain names
- domains that do not match the claimed organization
- lookalike or misleading domains
- suspicious URL paths
- links requesting credentials, OTPs, payments, or verification
- URL shorteners or unusual redirects when visible

Do not claim a URL is malicious solely because its domain looks unusual.
Describe URL characteristics as risk indicators unless there is stronger evidence.
`
});

        }


        // Add image if provided

        if (imageData) {

            contents.push({

                inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: imageData
                }

            });

        }


        // Add analysis instructions

        contents.push({
            text: prompt
        });


        console.log("Sending content to Gemini...");


        // ===============================
        // GEMINI REQUEST
        // ===============================

        const response = await ai.models.generateContent({

            model: "gemini-3.5-flash-lite",

            contents: contents

        });


        const text = response.text;


        console.log("Gemini response received.");


        // ===============================
        // CLEAN RESPONSE
        // ===============================

        const cleanedText = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();


       const analysis = JSON.parse(cleanedText);


// ===============================
// SAVE SCAN TO SUPABASE
// ===============================

const { error: supabaseError } = await supabase
    .from("scan_history")
    .insert({
        message: message || null,
        threat_score: analysis.threatScore,
        risk_level: analysis.riskLevel,
        scam_category: analysis.scamCategory,
        red_flags: analysis.redFlags,
        explanation: analysis.explanation,
        protection_steps: analysis.protectionSteps,
        situation: situation || "none"
    });


if (supabaseError) {

    console.error(
        "Supabase save error:",
        supabaseError
    );

} else {

    console.log(
        "Scan saved to Supabase."
    );

}


res.json({
    success: true,
    analysis: analysis
});

    } catch (error) {

        console.error("Gemini error:", error);

        res.status(500).json({

            success: false,

            error: "Failed to analyze the content."

        });

    }

});


// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {

    console.log(
        `TRUTH server running at http://localhost:${PORT}`
    );

});