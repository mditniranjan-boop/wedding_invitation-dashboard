/* ================================
COUNTDOWN TIMER
================================ */

const weddingDate = new Date("January 24, 2027 10:00:00").getTime();

const countdown = setInterval(function () {

const now = new Date().getTime();

const distance = weddingDate - now;


const days = Math.floor(
    distance / (1000 * 60 * 60 * 24)
);


const hours = Math.floor(
    (distance % (1000 * 60 * 60 * 24)) /
    (1000 * 60 * 60)
);


const minutes = Math.floor(
    (distance % (1000 * 60 * 60)) /
    (1000 * 60)
);


const seconds = Math.floor(
    (distance % (1000 * 60)) / 1000
);


document.getElementById("days").innerText = days;
document.getElementById("hours").innerText = hours;
document.getElementById("minutes").innerText = minutes;
document.getElementById("seconds").innerText = seconds;


if (distance < 0) {

    clearInterval(countdown);

    document.getElementById("countdown").innerHTML =
        "<h3>The Wedding Day Has Arrived ❤️</h3>";

}

}, 1000);

/* ================================
SMOOTH SCROLL
================================ */

function scrollToSection(sectionId) {

document.getElementById(sectionId).scrollIntoView({
    behavior: "smooth"
});

}

/* ================================
RSVP BUTTON
================================ */

function showRSVP() {

const modal = document.getElementById("rsvp-modal");
const nameInput = document.getElementById("guest-name");

modal.hidden = false;
nameInput.focus();

}

function closeRSVP() {

document.getElementById("rsvp-modal").hidden = true;
document.getElementById("rsvp-form").reset();
updateGuestCountDisplay();
document.getElementById("rsvp-confirmation").textContent = "";

}

function changeGuestCount(amount) {

const guestCountInput = document.getElementById("guest-count");
const currentCount = Number(guestCountInput.value);
const nextCount = Math.min(10, Math.max(1, currentCount + amount));

guestCountInput.value = nextCount;
updateGuestCountDisplay();

}

function updateGuestCountDisplay() {

document.getElementById("guest-count-display").textContent = document.getElementById("guest-count").value;

}

async function submitRSVP(event) {

event.preventDefault();

const guestName = document.getElementById("guest-name").value.trim();
const guestCount = document.getElementById("guest-count").value;
const confirmation = document.getElementById("rsvp-confirmation");

confirmation.textContent = "Saving your RSVP...";

try {
    const response = await fetch("/api/rsvps", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            guestName,
            guestCount
        })
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Unable to save your RSVP.");
    }

    confirmation.textContent = `Thank you, ${guestName}! Your RSVP for ${guestCount} ${guestCount === "1" ? "person" : "people"} has been saved.`;
    document.getElementById("rsvp-form").reset();
} catch (error) {
    confirmation.textContent = "We could not save your RSVP. Please try again.";
    console.error(error);
}

}
