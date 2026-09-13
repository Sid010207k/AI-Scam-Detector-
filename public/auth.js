// ===============================
// SUPABASE CONFIG
// ===============================

const SUPABASE_URL =
    "https://wncvlbivjwbybcsqwkde.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_WKXEF272reViPm3eSsTsMQ_wZmvTC9r";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


// ===============================
// ELEMENTS
// ===============================

const loginForm =
    document.getElementById("loginForm");

const signupForm =
    document.getElementById("signupForm");

const showSignup =
    document.getElementById("showSignup");

const showLogin =
    document.getElementById("showLogin");


// ===============================
// SWITCH LOGIN / SIGNUP
// ===============================

showSignup.addEventListener("click", function () {

    loginForm.classList.add("hidden");

    signupForm.classList.remove("hidden");

});


showLogin.addEventListener("click", function () {

    signupForm.classList.add("hidden");

    loginForm.classList.remove("hidden");

});


// ===============================
// LOGIN
// ===============================

document
    .getElementById("loginFormElement")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        const email =
            document.getElementById("loginEmail").value.trim();

        const password =
            document.getElementById("loginPassword").value;

        const message =
            document.getElementById("loginMessage");

        const button =
            this.querySelector("button");

        button.disabled = true;

        button.textContent = "Signing in...";

        message.textContent = "";


        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });


        if (error) {

            console.error("Login error:", error);

            message.textContent =
                error.message;

            button.disabled = false;

            button.textContent = "Sign In";

            return;
        }


        console.log(
            "Login successful:",
            data.user
        );


        window.location.href = "/";

    });


// ===============================
// SIGNUP
// ===============================

document
    .getElementById("signupFormElement")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        const email =
            document.getElementById("signupEmail").value.trim();

        const password =
            document.getElementById("signupPassword").value;

        const confirmPassword =
            document.getElementById("signupConfirmPassword").value;

        const message =
            document.getElementById("signupMessage");

        const button =
            this.querySelector("button");


        if (password !== confirmPassword) {

            message.textContent =
                "Passwords do not match.";

            return;
        }


        button.disabled = true;

        button.textContent =
            "Creating account...";

        message.textContent = "";


        const { data, error } =
            await supabaseClient.auth.signUp({
                email: email,
                password: password
            });


        if (error) {

            console.error(
                "Signup error:",
                error
            );

            message.textContent =
                error.message;

            button.disabled = false;

            button.textContent =
                "Create Account";

            return;
        }


        console.log(
            "Signup successful:",
            data
        );


        if (data.session) {

            message.textContent =
                "Account created! Redirecting...";

            window.location.href = "/";

        } else {

            message.textContent =
                "Account created! Check your email to confirm your account.";

            button.disabled = false;

            button.textContent =
                "Create Account";

        }

    });