// ===============================
// SUPABASE CLIENT
// ===============================

const SUPABASE_URL =
    "https://wncvlbivjwbybcsqwkde.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_WKXEF272reViPm3eSsTsMQ_wZmvTC9rY";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


// ===============================
// ELEMENTS
// ===============================

const imageInput =
    document.getElementById("imageInput");

const imagePreview =
    document.getElementById("imagePreview");

const imagePreviewContainer =
    document.getElementById("imagePreviewContainer");

const fileName =
    document.getElementById("fileName");

const analyzeBtn =
    document.getElementById("analyzeBtn");

const messageInput =
    document.getElementById("messageInput");

const resultSection =
    document.getElementById("resultSection");


// ===============================
// IMAGE SELECTION
// ===============================

if (imageInput) {

    imageInput.addEventListener(
        "change",
        function () {

            const file =
                imageInput.files[0];

            if (!file) {
                imagePreviewContainer.style.display =
                    "none";

                fileName.textContent = "";

                return;
            }

            console.log(
                "Image selected:",
                file.name
            );

            fileName.textContent =
                `Selected: ${file.name}`;

            const reader =
                new FileReader();

            reader.onload =
                function (event) {

                    imagePreview.src =
                        event.target.result;

                    imagePreviewContainer.style.display =
                        "flex";
                };

            reader.onerror =
                function () {

                    console.error(
                        "Could not read image."
                    );

                    alert(
                        "Could not read the selected image."
                    );
                };

            reader.readAsDataURL(file);
        }
    );
}


// ===============================
// ANALYZE BUTTON
// ===============================

if (analyzeBtn) {

    analyzeBtn.addEventListener(
        "click",
        async function () {

            console.log(
                "Analyze button clicked."
            );

            const message =
                messageInput.value.trim();

            const imageFile =
                imageInput.files[0];


            // ===============================
            // VALIDATION
            // ===============================

            if (!message && !imageFile) {

                alert(
                    "Please paste a suspicious message or select a screenshot."
                );

                return;
            }


            // ===============================
            // LOADING
            // ===============================

            analyzeBtn.disabled = true;

            analyzeBtn.innerHTML = `
                ⏳ Analyzing with Gemini...
            `;


            try {

                let imageData = null;

                let mimeType = null;


                // ===============================
                // CONVERT IMAGE TO BASE64
                // ===============================

                if (imageFile) {

                    console.log(
                        "Converting image to Base64..."
                    );

                    imageData =
                        await fileToBase64(
                            imageFile
                        );

                    mimeType =
                        imageFile.type;

                    console.log(
                        "Image converted:",
                        mimeType,
                        imageData.length
                    );
                }


                // ===============================
                // GET LOGIN SESSION
                // ===============================

                const {
                    data: {
                        session
                    }
                } =
                    await supabaseClient
                        .auth
                        .getSession();


                if (!session) {

                    alert(
                        "Please log in to use TRUTH."
                    );

                    return;
                }


                // ===============================
                // SEND TO BACKEND
                // ===============================

                console.log(
                    "Sending request to /api/analyze..."
                );


                const response =
                    await fetch(
                        "/api/analyze",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${session.access_token}`
                            },

                            body:
                                JSON.stringify({

                                    message:
                                        message,

                                    imageData:
                                        imageData,

                                    mimeType:
                                        mimeType,

                                    situation:
                                        selectedSituation

                                })
                        }
                    );


                console.log(
                    "Backend response status:",
                    response.status
                );


                const data =
                    await response.json();


                console.log(
                    "Backend response:",
                    data
                );


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.error ||
                        "Analysis failed."
                    );
                }


                // ===============================
                // DISPLAY RESULT
                // ===============================

                displayAnalysis(
                    data.analysis
                );

            }


            catch (error) {

                console.error(
                    "TRUTH analysis error:",
                    error
                );

                alert(
                    "Analysis failed. Check the VS Code terminal for the exact error."
                );
            }


            finally {

                analyzeBtn.disabled = false;

                analyzeBtn.innerHTML = `
                    <span>🔍</span>
                    Analyze with TRUTH
                `;
            }

        }
    );
}


// ===============================
// FILE → BASE64
// ===============================

function fileToBase64(file) {

    return new Promise(
        function (resolve, reject) {

            const reader =
                new FileReader();


            reader.onload =
                function () {

                    const result =
                        reader.result;

                    const base64 =
                        result.split(",")[1];

                    resolve(base64);
                };


            reader.onerror =
                function (error) {

                    reject(error);
                };


            reader.readAsDataURL(file);

        }
    );
}


// ===============================
// DISPLAY AI ANALYSIS
// ===============================

function displayAnalysis(
    analysis
) {

    console.log(
        "Displaying analysis:",
        analysis
    );


    // ===============================
    // SHOW RESULTS
    // ===============================

    resultSection.classList.remove(
        "hidden"
    );


    // ===============================
    // THREAT SCORE
    // ===============================

    document.getElementById(
        "threatScore"
    ).textContent =
        analysis.threatScore;


    // ===============================
    // RISK BADGE
    // ===============================

    const riskBadge =
        document.getElementById(
            "riskBadge"
        );


    riskBadge.textContent =
        `${analysis.riskLevel} RISK`;


    if (
        analysis.riskLevel === "HIGH"
    ) {

        riskBadge.style.background =
            "#3a1720";

        riskBadge.style.color =
            "#ff6b7d";
    }


    else if (
        analysis.riskLevel === "MEDIUM"
    ) {

        riskBadge.style.background =
            "#3a3017";

        riskBadge.style.color =
            "#ffcc66";
    }


    else {

        riskBadge.style.background =
            "#153526";

        riskBadge.style.color =
            "#72e6a8";
    }


    // ===============================
    // DESCRIPTION
    // ===============================

    document.getElementById(
        "riskDescription"
    ).textContent =
        `TRUTH identified this content as ${analysis.riskLevel.toLowerCase()} risk based on the detected signals.`;


    // ===============================
    // CATEGORY
    // ===============================

    document.getElementById(
        "scamCategory"
    ).textContent =
        analysis.scamCategory;


    // ===============================
    // RED FLAGS
    // ===============================

    const redFlags =
        document.getElementById(
            "redFlags"
        );


    redFlags.innerHTML = "";


    if (
        Array.isArray(
            analysis.redFlags
        )
    ) {

        analysis.redFlags.forEach(
            function (flag) {

                const li =
                    document.createElement(
                        "li"
                    );

                li.textContent =
                    flag;

                redFlags.appendChild(
                    li
                );
            }
        );
    }


    // ===============================
    // EXPLANATION
    // ===============================

    document.getElementById(
        "explanation"
    ).textContent =
        analysis.explanation;


    // ===============================
    // PROTECTION STEPS
    // ===============================

    const protectionSteps =
        document.getElementById(
            "protectionSteps"
        );


    protectionSteps.innerHTML = "";


    if (
        Array.isArray(
            analysis.protectionSteps
        )
    ) {

        analysis.protectionSteps.forEach(
            function (step) {

                const li =
                    document.createElement(
                        "li"
                    );

                li.textContent =
                    step;

                protectionSteps.appendChild(
                    li
                );
            }
        );
    }


    // ===============================
    // ATTACK PATTERN
    // ===============================

    const attackPatternItems =
        document.querySelectorAll(
            ".timeline-item"
        );


    if (
        Array.isArray(
            analysis.attackPattern
        )
    ) {

        attackPatternItems.forEach(
            function (
                item,
                index
            ) {

                const pattern =
                    analysis.attackPattern[
                        index
                    ];


                if (!pattern) {

                    item.style.display =
                        "none";

                    return;
                }


                item.style.display = "";


                const title =
                    item.querySelector(
                        "strong"
                    );


                const description =
                    item.querySelector(
                        "p"
                    );


                if (title) {

                    title.textContent =
                        pattern.title;
                }


                if (description) {

                    description.textContent =
                        pattern.description;
                }

            }
        );
    }


    // ===============================
    // SCROLL TO RESULTS
    // ===============================

    resultSection.scrollIntoView(
        {
            behavior: "smooth"
        }
    );
}


// ===============================
// USER SITUATION
// ===============================

const situationOptions =
    document.querySelectorAll(
        ".situation-option"
    );


let selectedSituation =
    "none";


situationOptions.forEach(
    function (option) {

        option.addEventListener(
            "click",
            function () {

                // Remove selection
                // from all options

                situationOptions.forEach(
                    function (item) {

                        item.classList.remove(
                            "selected"
                        );
                    }
                );


                // Select clicked option

                option.classList.add(
                    "selected"
                );


                // Store situation

                selectedSituation =
                    option.dataset.situation;


                console.log(
                    "User situation:",
                    selectedSituation
                );

            }
        );

    }
);


// ===============================
// SCAN HISTORY
// ===============================

const historyContainer =
    document.getElementById(
        "historyContainer"
    );


const refreshHistoryBtn =
    document.getElementById(
        "refreshHistoryBtn"
    );


// ===============================
// LOAD HISTORY
// ===============================

async function loadHistory() {

    if (!historyContainer) {
        return;
    }


    historyContainer.innerHTML = `
        <div class="history-loading">
            Loading your scan history...
        </div>
    `;


    try {

        // ===============================
        // GET LOGIN SESSION
        // ===============================

        const {
            data: {
                session
            }
        } =
            await supabaseClient
                .auth
                .getSession();


        if (!session) {

            throw new Error(
                "Please log in to view scan history."
            );
        }


        // ===============================
        // REQUEST HISTORY
        // ===============================

        const response =
            await fetch(
                "/api/history",
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${session.access_token}`
                    }
                }
            );


        const data =
            await response.json();


        console.log(
            "History response:",
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                "Failed to load history."
            );
        }


        // ===============================
        // DISPLAY HISTORY
        // ===============================

        displayHistory(
            data.history
        );

    }


    catch (error) {

        console.error(
            "History loading error:",
            error
        );


        historyContainer.innerHTML = `
            <div class="history-error">
                Could not load scan history.
            </div>
        `;
    }
}


// ===============================
// DISPLAY HISTORY
// ===============================

function displayHistory(
    history
) {

    if (
        !Array.isArray(history) ||
        history.length === 0
    ) {

        historyContainer.innerHTML = `
            <div class="history-empty">
                No scans yet.
            </div>
        `;

        return;
    }


    historyContainer.innerHTML = "";


    history.forEach(
        function (scan) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "history-card";


            const riskLevel =
                (
                    scan.risk_level ||
                    "LOW"
                ).toLowerCase();


            const score =
                scan.threat_score ??
                "—";


            const category =
                scan.scam_category ||
                "Unknown";


            const situation =
                getSituationLabel(
                    scan.situation
                );


            const date =
                formatHistoryDate(
                    scan.created_at
                );


            card.innerHTML = `

                <div class="history-card-top">

                    <span
                        class="history-risk ${riskLevel}"
                    >
                        ${(scan.risk_level || "LOW")} RISK
                    </span>


                    <span class="history-score">
                        Threat Score:
                        ${score}/100
                    </span>

                </div>


                <div class="history-category">
                    ${escapeHtml(category)}
                </div>


                <div class="history-meta">

                    <span>
                        ${escapeHtml(situation)}
                    </span>


                    <span>
                        ${escapeHtml(date)}
                    </span>

                </div>

            `;


            historyContainer.appendChild(
                card
            );

        }
    );
}


// ===============================
// SITUATION LABEL
// ===============================

function getSituationLabel(
    situation
) {

    const labels = {

        none:
            "🛡️ Did nothing",

        clicked:
            "🔗 Clicked link",

        password:
            "🔑 Shared password",

        otp:
            "📱 Shared OTP",

        money:
            "💳 Sent money"

    };


    return (
        labels[situation] ||
        "🛡️ Did nothing"
    );
}


// ===============================
// DATE FORMAT
// ===============================

function formatHistoryDate(
    dateString
) {

    if (!dateString) {

        return "Unknown date";
    }


    const date =
        new Date(
            dateString
        );


    return date.toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}


// ===============================
// HTML SAFETY
// ===============================

function escapeHtml(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value;


    return div.innerHTML;
}


// ===============================
// REFRESH BUTTON
// ===============================

if (refreshHistoryBtn) {

    refreshHistoryBtn.addEventListener(
        "click",
        loadHistory
    );

}


// ===============================
// LOAD HISTORY
// ===============================

// Only run history loading
// if the history page exists.

if (historyContainer) {

    loadHistory();
}