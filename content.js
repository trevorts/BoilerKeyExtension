/*
 * @author Ben Scholer <benscholer3248511@gmail.com>
 *
 * A Chrome/Firefox Extension that authenticates through Purdue's CAS automatically,
 * alleviating BoilerKey for the device it's installed on.
 */


/*
JavaScript Password Prompt by Luc (luc@ltdinteractive.com)
Originaly posted to http://stackoverflow.com/questions/9554987/how-can-i-hide-the-password-entered-via-a-javascript-dialog-prompt
This code is Public Domain :)

Syntax:
password_prompt(label_message, button_message, callback);
password_prompt(label_message, button_message, width, height, callback);

Example usage:
password_prompt("Please enter your password:", "Submit", function(password) {
    alert("Your password is: " + password);
});
*/

window.password_prompt = function(label_message, button_message, arg3, arg4, arg5) {
    if (typeof label_message !== "string") var label_message = "Password:";
    if (typeof button_message !== "string") var button_message = "Submit";
    if (typeof arg3 === "function") {
        var callback = arg3;
    }
    else if (typeof arg3 === "number" && typeof arg4 === "number" && typeof arg5 === "function") {
        var width = arg3;
        var height = arg4;
        var callback = arg5;
    }
    if (typeof width !== "number") var width = 200;
    if (typeof height !== "number") var height = 100;
    if (typeof callback !== "function") var callback = function(password){};

    var submit = function() {
        callback(input.value);
        document.body.removeChild(div);
        window.removeEventListener("resize", resize, false);
    };
    var resize = function() {
        div.style.left = ((window.innerWidth / 2) - (width / 2)) + "px";
        div.style.top = ((window.innerHeight / 2) - (height / 2)) + "px";
    };

    var div = document.createElement("div");
    div.id = "password_prompt";
    div.style.background = "white";
    div.style.color = "black";
    div.style.border = "1px solid black";
    div.style.width = width + "px";
    div.style.height = height + "px";
    div.style.padding = "16px";
    div.style.position = "fixed";
    div.style.left = ((window.innerWidth / 2) - (width / 2)) + "px";
    div.style.top = ((window.innerHeight / 2) - (height / 2)) + "px";

    var label = document.createElement("label");
    label.id = "password_prompt_label";
    label.innerHTML = label_message;
    label.for = "password_prompt_input";
    div.appendChild(label);

    div.appendChild(document.createElement("br"));

    var input = document.createElement("input");
    input.id = "password_prompt_input";
    input.type = "password";
//    input.onblur = function() {document.getElementById("password_prompt_input").focus();};
    input.addEventListener("keyup", function(e) {
        if (e.keyCode == 13) submit();
    }, false);
    div.appendChild(input);

    div.appendChild(document.createElement("br"));
    div.appendChild(document.createElement("br"));

    var button = document.createElement("button");
    button.innerHTML = button_message;
    button.addEventListener("click", submit, false);
    div.appendChild(button);

    document.body.appendChild(div);
    window.addEventListener("resize", resize, false);
    setTimeout(function() {document.getElementById("password_prompt_input").focus();}, 800);
};

//Click on the "Purdue Account Login" button
if (window.location.href.startsWith("https://mycourses.purdue.edu/") === true
    && document.getElementsByClassName("purdue-btn-bottom-row")[0] !== null
    && document.getElementsByClassName("purdue-btn-bottom-row")[0] !== undefined) {

    document.getElementsByClassName("purdue-btn-bottom-row")[0].click();
}

//Make sure we're on Purdue's CAS, otherwise, don't do anything.
if (window.location.href.startsWith("https://www.purdue.edu/apps/account/cas/login") === true) {
    let url = new URL(window.location.href);
    let reset = url.searchParams.get("reset");
    if (reset === "true") {
        alert("Reset time!");
        localStorage.removeItem("pin");
        localStorage.removeItem("code");
        localStorage.removeItem("hotpSecret");
        localStorage.removeItem("username");
        localStorage.removeItem("counter");
        window.close();
    }
}

//Make sure we're on Purdue's CAS, otherwise, don't do anything.
if (window.location.href.startsWith("https://www.purdue.edu/apps/account/cas/login") === true) {
    //Retrieve everything from localStorage.
    let pin, code, hotpSecret, username;
    pin = get("pin");
    code = get("code");
    hotpSecret = get("hotpSecret");
    username = get("username");

    //If the browser has been activated, go through the login process.
    if (hotpSecret) {
        hmacCode = generateHmacCode(hotpSecret);
        //If we have the username/pin, log the user in automatically.
        if (username && pin) {
            //Auto-fill username field
            document.getElementById("username").value = username;
            //Auto-fill password field
            document.getElementById("password").value = (pin + "," + hmacCode);
            //Find the login button, and click it.
            document.querySelectorAll("input[name='submit'][accesskey='s'][value='Login'][tabindex='3'][type='submit']")[0].click();
            //Otherwise, just show the user the password they should use in an alert.
        } else if (pin && !username) {
            //Otherwise, just fill the password in for the user.
            username = prompt("Please enter your username");
            document.getElementById("username").value = username;
            document.getElementById("password").value = pin + "," + hmacCode;
            document.querySelectorAll("input[name='submit'][accesskey='s'][value='Login'][tabindex='3'][type='submit']")[0].click();
        } else if (username && !pin) {
          password_prompt("Please enter your PIN:", "Submit", function(pin) {
            document.getElementById("password").value = (pin + "," + hmacCode);
            document.getElementById("username").value = username;
            document.querySelectorAll("input[name='submit'][accesskey='s'][value='Login'][tabindex='3'][type='submit']")[0].click();
          });
        } else {
            //If we don't have activation data, remove the info currently stored, as it needs to be replaced.
            localStorage.removeItem("pin");
            localStorage.removeItem("code");
            localStorage.removeItem("username");
            localStorage.removeItem("count");
            localStorage.removeItem("hotpSecret");
            //Get the user's info to setup a new BoilerKey
            askForInfo();
        }
    } else {
        //If we don't have activation data, remove the info currently stored, as it needs to be replaced.
        localStorage.removeItem("pin");
        localStorage.removeItem("code");
        localStorage.removeItem("username");
        localStorage.removeItem("count");
        localStorage.removeItem("hotpSecret");
        //Get the user's info to setup a new BoilerKey
        askForInfo();
    }
}

//Collecting user-info, and setting up the new BoilerKey.
async function askForInfo() {
    let code, pin, username, hotpSecret;
    //Traps user until they enter a valid activation link, or code.
    while (!code) {
        let link = prompt("Setup steps:\n" +
            "1) In a different browser, please navigate to your BoilerKey settings (https://purdue.edu/boilerkey), and click 'Set up a new Duo Mobile BoilerKey'.\n" +
            "2) Follow the steps, enter PIN, and choose name for the new BoilerKey e.g. 'Laptop_Chrome', 'Desktop_Firefox'.\n" +
            "3) Paste the link (https://m-1b9bef70.duosecurity.com/activate/XXXXXXXXXXXXXXXXXXXX) found under the QR code (required):");
        code = validateLink(link);
        if (!code) {
            alert("Invalid link. Please try again");
        }
    }

    hotpSecret = await makeRequest("POST", 'https://api-1b9bef70.duosecurity.com/push/v2/activation/' +
        code + '?app_id=com.duosecurity.duomobile.app.DMApplication' +
        '&app_version=2.3.3&app_build_number=323206&full_disk_encryption=false&manufacturer=Google&model=Pixel&' +
        'platform=Android&jailbroken=false&version=6.0&language=EN&customer_protocol=1');

    hotpSecret = JSON.parse(hotpSecret);
    hotpSecret = hotpSecret.response["hotp_secret"];

    //If activation was successful, save the hotp-secret and reset the counter.
    if (hotpSecret) {
        set("hotpSecret", hotpSecret);
        set("counter", 0);
        alert("Activation successful! Press OK to continue to setup auto-login.")
    } else {
        alert("Activation failed, please try again. A new BoilerKey will need to be created.");
        location.reload();
    }

    username = prompt("For a fully automated login, please enter username (recommended):");

    //Traps user until they either enter a valid pin/username, or no pin at all.
    while (!pin || !(pin.match(/(\d{4})/) && pin.length === 4)) {
        if (username) {
            pin = prompt("To complete auto-login setup, please enter BoilerKey PIN (recommended):");
        } else {
            pin = prompt("To enable password auto-fill, please enter BoilerKey PIN (recommended):");
        }
        if (pin.match(/(\d{4})/) && pin.length === 4) {
            if (username) {
                alert("Auto-login has been set-up and enabled!");
            } else {
                alert("PIN,code will be auto-filled on each login!")
            }
        } else if (!pin) {
            alert("No PIN set. A login code will be provided when you open this site.");
        } else {
            alert("Invalid PIN, please try again.");
        }
    }
    //Save username/PIN if they exist.
    if (username) {
        set("username", username);
    }
    if (pin) {
        set("pin", pin);
    }
    //Refresh the page to start auto-login.
    location.reload();
}

//Simply validate the link the user enters, and return the code found at the end of it.
function validateLink(link) {
    if (link != null && link.startsWith("https://m-1b9bef70.duosecurity.com/activate/")) {
        let chunks = link.split("/");
        if (chunks[chunks.length - 1].length === 20) {
            return chunks[chunks.length - 1];
        } else return null;
    } else if (link.length === 20) {
        return link;
    }
}

function makeRequest(method, url) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
    });
}

//Generating the HMAC code using the jsOTP library with our hotp-secret and counter.
function generateHmacCode(hotpSecret) {
    //Get counter into an int
    let counter = parseInt(get("counter"));
    //Get hmacCode
    var hotp = new jsOTP.hotp();
    var hmacCode = hotp.getOtp(hotpSecret, counter);
    //Increment the counter
    set("counter", counter + 1);
    return hmacCode;
}

//A simple wrapper for localStorage.get(key) with a bit of error handling.
function get(key) {
    if (localStorage.getItem(key)) {
        let data = localStorage.getItem(key);
        if (data) {
            return data;
        } else return null;
    } else return null;
}

//A simple wrapper for localStorage.set(key, value)
function set(key, value) {
    localStorage.setItem(key, value);
}
