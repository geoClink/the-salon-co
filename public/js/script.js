// ==========================================
// 1. GLOBAL UI & LAYOUT SCRIPTS
// ==========================================

const header = document.querySelector('header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

/*-- carousel quote rotation --*/
const reviews = document.querySelectorAll('.review');
const bars = document.querySelectorAll('.review-bar');

if (reviews.length > 0) {
    function rotateReview(index) {
        reviews.forEach(review => {
            review.classList.remove('active');
        });
        bars.forEach(bar => {
            bar.classList.remove('active');
        });
        reviews[index].classList.add('active');
        bars[index].classList.add('active');
    }

    bars.forEach((bar, index) => {
        bar.addEventListener('click', () => {
            rotateReview(index);
        });
    });

    let currentIndex = 0;
    setInterval(() => {
        currentIndex = (currentIndex + 1) % reviews.length;
        rotateReview(currentIndex);
    }, 3000);
}

/*--MOBILE-HAMBURGER-MENU--*/
const menuToggle = document.querySelector('.menu-toggle');
const navBar = document.querySelector('header nav');

if (menuToggle && navBar) {
    menuToggle.addEventListener('click', () => {
        navBar.classList.toggle('nav-open');
        menuToggle.classList.toggle('menu-open');
    });

    const navLinks = document.querySelectorAll('header nav a');

    function closeNav() {
        navBar.classList.remove('nav-open');
        menuToggle.classList.remove('menu-open');
    }

    navLinks.forEach(link => {
        link.addEventListener('click', closeNav);
    });

    document.addEventListener('click', (event) => {
        if (!navBar.contains(event.target) && !menuToggle.contains(event.target)) {
            closeNav();
        }
    });
}

/*-- FAQ --*/
const faqItems = document.querySelectorAll('.faq-item');

if (faqItems.length > 0) {
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const sign = item.querySelector('.faq-sign');

        if (question && answer && sign) {
            question.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');

                faqItems.forEach(i => {
                    i.classList.remove('open');
                    const ans = i.querySelector('.faq-answer');
                    const s = i.querySelector('.faq-sign');
                    if (ans) ans.style.display = 'none';
                    if (s) s.textContent = '+';
                });

                if (!isOpen) {
                    item.classList.add('open');
                    answer.style.display = 'block';
                    sign.textContent = '×';
                }
            });
        }
    });
    // Open the first FAQ by default
    const firstFaqQ = faqItems[0].querySelector('.faq-question');
    if (firstFaqQ) firstFaqQ.click();
}

/*-- GALLERY FILTER --*/
const filterBtns = document.querySelectorAll('.filter-btn');
const galleryItems = document.querySelectorAll('.gallery-item');

if (filterBtns.length > 0 && galleryItems.length > 0) {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;

            galleryItems.forEach(item => {
                if (filter === 'all' || item.dataset.category === filter) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
}


// ==========================================
// 2. RESERVATION / BOOKING FLOW DATA & LOGIC
// ==========================================

// Map services to the valid stylists who perform them
const serviceToStylists = {
    '01': ['marguax', 'sana'],       // Signature Cut & Finish
    '02': ['marguax', 'théo', 'iris', 'sana'], // Returning Cut
    '03': ['iris'],                  // Texture & Curl Cut
    '04': ['théo'],                  // Single-process Color
    '05': ['théo'],                  // Hand-painted Balayage
    '06': ['marguax']                // The Long Ritual
};

// Add an explicit availability flag for each stylist
const stylistAvailability = {
    'marguax': { times: ['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'], isAvailable: true },
    'théo': { times: [], isAvailable: false }, // Greyed out due to waitlist
    'iris': { times: ['09:30 AM', '11:00 AM', '01:30 PM'], isAvailable: true },
    'sana': { times: ['09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM', '04:00 PM'], isAvailable: true }
};

// Global state tracking for the booking flow
let currentCalendarDate = new Date();
let selectedServiceId = null;
let selectedStylistId = null;
let selectedDateString = null;
let selectedTimeSlot = null;

// Step 1: Service Selection
const serviceRadioButtons = document.querySelectorAll('input[name="service"]');
const serviceContinueBtn = document.querySelector('#step-1 .booking-continue-btn');

if (serviceContinueBtn) {
    serviceContinueBtn.disabled = true;

    serviceRadioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
            serviceContinueBtn.disabled = false;
            selectedServiceId = radio.value;
        });
    });
}

// Step 2: Stylist Selection
const stylistContinueBtn = document.querySelector('#step-2 .booking-continue-btn');
if (stylistContinueBtn) {
    stylistContinueBtn.disabled = true;

    // Listen for selection changes on step-2 radio buttons
    document.querySelectorAll('#step-2 input[name="stylist"]').forEach(radio => {
        radio.addEventListener('change', () => {
            stylistContinueBtn.disabled = false;
            selectedStylistId = radio.value;
        });
    });
}

// Navigation Function (Handles showing steps, data filtering, and calendar generation)
function nextStep(stepNumber) {
    // 1. Hide all booking steps
    const steps = document.querySelectorAll('.booking-step');
    steps.forEach(step => {
        step.style.display = 'none';
    });

    // 2. Show the requested step
    const targetStep = document.getElementById('step-' + stepNumber);
    if (targetStep) {
        targetStep.style.display = 'block';
    }

    // 3. Data processing rules based on destination step
    if (stepNumber === 2) {
        const validStylists = serviceToStylists[selectedServiceId] || [];

        document.querySelectorAll('.stylist-card').forEach(card => {
            const radioInput = card.querySelector('input[name="stylist"]');
            const availabilityText = card.querySelector('.availability');
            const stylistId = radioInput ? radioInput.value : null;

            // Check both service compatibility AND global availability
            const isEligible = validStylists.includes(stylistId) &&
                (stylistAvailability[stylistId] ? stylistAvailability[stylistId].isAvailable : false);

            if (radioInput && isEligible) {
                card.classList.remove('disabled-card');
                radioInput.disabled = false;
                if (availabilityText) {
                    availabilityText.textContent = "Available";
                    availabilityText.style.color = "#222";
                }
            } else {
                card.classList.add('disabled-card');
                if (radioInput) {
                    radioInput.disabled = true;
                    radioInput.checked = false;
                }
                if (availabilityText) {
                    // Keep the "Waitlist" custom text if they have it, otherwise use fallback
                    if (stylistId === 'théo') {
                        availabilityText.textContent = "Waitlist · 8 weeks out (Unavailable)";
                    } else {
                        availabilityText.textContent = "Does not perform this service";
                    }
                    availabilityText.style.color = "#999";
                }
            }
        });

        if (stylistContinueBtn) stylistContinueBtn.disabled = true;
    }

    if (stepNumber === 3) {
        // Initialize the calendar for the current month when stepping into Date & Time
        populateCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());

        // Ensure continue button starts disabled on Step 3 until date/time are picked
        const step3ContinueBtn = document.querySelector('#step-3 .booking-continue-btn');
        if (step3ContinueBtn) step3ContinueBtn.disabled = true;
        selectedDateString = null;
        selectedTimeSlot = null;

        // Update instruction text dynamically showing the chosen stylist's name
        const stylistSubtitle = document.querySelector('#step-3 .section-subtext');
        const selectedStylistLabel = document.querySelector(`input[name="stylist"]:checked + .stylist-img-wrap-reserve ~ .stylist-content h3, input[name="stylist"]:checked ~ .stylist-content h3`);

        if (stylistSubtitle && selectedStylistLabel) {
            // Strips out HTML tags from elements like <em>Hale</em>
            const cleanName = selectedStylistLabel.textContent.replace(/\s+/g, ' ').trim();
            stylistSubtitle.innerHTML = `Real-time availability for <em>${cleanName}</em>. Studio is closed Sundays and Mondays. Choose a date to see open times.`;
        }
    }

    if (stepNumber === 4) {
        const selectedServiceLabel = document.querySelector('input[name="service"]:checked ~ .booking-service-details h3');
        const selectedStylistLabel = document.querySelector('input[name="stylist"]:checked ~ .stylist-content h3');
        const selectedDateBtn = document.querySelector('.calander-day-btn.selected-date');

        const summaryService = document.querySelector('.summary-service');
        const summaryStylist = document.querySelector('.summary-stylist');
        const summaryDate = document.querySelector('.summary-date');
        const summaryTime = document.querySelector('.summary-time');

        if (summaryService) {
            summaryService.textContent = selectedServiceLabel ? selectedServiceLabel.textContent.trim() : 'Not Selected';
        }
        if (summaryStylist) {
            summaryStylist.textContent = selectedStylistLabel ? selectedStylistLabel.textContent.replace(/\s+/g, ' ').trim() : 'Not selected';
        }
        if (summaryDate) {
            summaryDate.textContent = selectedDateBtn ? selectedDateBtn.dataset.date : 'Not selected';
        }
        if (summaryTime) {
            summaryTime.textContent = selectedTimeSlot || 'Not selected';
        }
    }

    // 4. Update active state in the progress bar
    const progressItems = document.querySelectorAll('.step-item');
    progressItems.forEach((item, index) => {
        if (index + 1 === stepNumber) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // 5. Smooth scroll to top of booking flow
    const bookingFlowElement = document.querySelector('.booking-flow');
    if (bookingFlowElement) {
        window.scrollTo({
            top: bookingFlowElement.offsetTop - 100,
            behavior: 'smooth'
        });
    }
}

// ==========================================
// 3. CALENDAR GENERATION & DYNAMIC TIMES
// ==========================================

function getDaysOfMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDay(year, month) {
    return new Date(year, month, 1).getDay();
}

function populateCalendar(year, month) {
    const days = getDaysOfMonth(year, month);
    const firstDay = getFirstDay(year, month);

    const grabAndClear = document.querySelector('#calendar-grid');
    if (!grabAndClear) return;

    // Reset grid with header days
    grabAndClear.innerHTML = `
        <span class="calendar-day-header">S</span>
        <span class="calendar-day-header">M</span>
        <span class="calendar-day-header">T</span>
        <span class="calendar-day-header">W</span>
        <span class="calendar-day-header">T</span>
        <span class="calendar-day-header">F</span>
        <span class="calendar-day-header">S</span>
    `;

    // Empty spaces for padding out the starting day of the week
    for (let i = 0; i < firstDay; i++) {
        grabAndClear.innerHTML += '<span></span>';
    }

    // Render clickable day nodes
    for (let i = 1; i <= days; i++) {
        const dayDate = new Date(year, month, i);
        const dayIndex = dayDate.getDay();

        // Check if day is Sunday (0) or Monday (1) -> Salon closed
        if (dayIndex === 0 || dayIndex === 1) {
            grabAndClear.innerHTML += `<span class="calendar-number disabled">${i}</span>`;
        } else {
            grabAndClear.innerHTML += `<label class="calendar-number calendar-day-btn" data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}">
                <input type="radio" name="date">${i}
            </label>`;
        }
    }

    // Update month and year labels in the top header
    const currentMonth = document.querySelector('.calendar-month');
    const currentYear = document.querySelector('.calendar-year');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    if (currentMonth) currentMonth.textContent = monthNames[month] + ' ';
    if (currentYear) currentYear.textContent = year;

    // Attach click triggers on selectable calendar days
    attachCalendarDayClicks();
}

// Calendar Month Button Pagination Listeners
const prevBtn = document.querySelector('.prev-button');
const nextBtn = document.querySelector('.next-button');

if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        populateCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        populateCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
    });
}

// Click event for generating dynamic timeslots per stylist
function attachCalendarDayClicks() {
    document.querySelectorAll('.calendar-day-btn').forEach(dayNode => {
        dayNode.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day-btn').forEach(d => d.classList.remove('selected-date'));
            dayNode.classList.add('selected-date');
            selectedDateString = dayNode.dataset.date;

            const step3ContinueBtn = document.querySelector('#step-3 .booking-continue-btn');
            if (step3ContinueBtn) step3ContinueBtn.disabled = true;
            selectedTimeSlot = null;

            const timeSlotsContainer = document.querySelector('.time-slots');
            if (!timeSlotsContainer) return;
            timeSlotsContainer.innerHTML = '';

            // Pull times array from object property
            const stylistData = stylistAvailability[selectedStylistId];
            const times = (stylistData && stylistData.isAvailable) ? stylistData.times : [];

            if (times.length === 0) {
                timeSlotsContainer.innerHTML = '<p>No available times found for this stylist.</p>';
                return;
            }

            fetch(`/booked-slots?stylist=${selectedStylistId}&date=${selectedDateString}`)
                .then(res => res.json())
                .then(({ bookedTimes }) => {
                    times.forEach(time => {
                        const slotBtn = document.createElement('div');
                        slotBtn.classList.add('time-slot-btn');
                        slotBtn.textContent = time;

                        if (bookedTimes.includes(time)) {
                            slotBtn.classList.add('booked');
                            slotBtn.disabled = true;
                        } else {
                            slotBtn.addEventListener('click', (e) => {
                                timeSlotsContainer.querySelectorAll('.time-slot-btn').forEach(s => s.classList.remove('selected'));
                                e.target.classList.add('selected');
                                selectedTimeSlot = time;
                                if (step3ContinueBtn) step3ContinueBtn.disabled = false;
                            });
                        }

                        timeSlotsContainer.appendChild(slotBtn);
                    });
                });
        });
    });
}

// ==========================================
// 4. STEP 4 FORM VALIDATION
// ==========================================

const depositBtn = document.getElementById('deposit-btn');
const nameInput = document.getElementById('client-name');
const emailInput = document.getElementById('client-email');
const phoneInput = document.getElementById('client-phone');

if (depositBtn && nameInput && emailInput && phoneInput) {
    const isValidName = val => val.trim().length >= 2;
    const isValidEmail = val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
    const isValidPhone = val => val.replace(/\D/g, '').length === 10;

    const showError = (input, errorId, message) => {
        input.classList.add('input-error');
        document.getElementById(errorId).textContent = message;
    };
    const clearError = (input, errorId) => {
        input.classList.remove('input-error');
        document.getElementById(errorId).textContent = '';
    };

    const checkFormValidity = () => {
        depositBtn.disabled = !(
            isValidName(nameInput.value) &&
            isValidEmail(emailInput.value) &&
            isValidPhone(phoneInput.value)
        );
    };

    nameInput.addEventListener('blur', () => {
        if (nameInput.value.trim() && !isValidName(nameInput.value)) {
            showError(nameInput, 'name-error', 'Please enter your full name.');
        } else {
            clearError(nameInput, 'name-error');
        }
        checkFormValidity();
    });
    nameInput.addEventListener('input', () => {
        if (isValidName(nameInput.value)) clearError(nameInput, 'name-error');
        checkFormValidity();
    });

    emailInput.addEventListener('blur', () => {
        if (emailInput.value.trim() && !isValidEmail(emailInput.value)) {
            showError(emailInput, 'email-error', 'Please enter a valid email address.');
        } else {
            clearError(emailInput, 'email-error');
        }
        checkFormValidity();
    });
    emailInput.addEventListener('input', () => {
        if (isValidEmail(emailInput.value)) clearError(emailInput, 'email-error');
        checkFormValidity();
    });

    phoneInput.addEventListener('blur', () => {
        if (phoneInput.value.trim() && !isValidPhone(phoneInput.value)) {
            showError(phoneInput, 'phone-error', 'Please enter a 10-digit phone number.');
        } else {
            clearError(phoneInput, 'phone-error');
        }
        checkFormValidity();
    });
    phoneInput.addEventListener('input', () => {
        if (isValidPhone(phoneInput.value)) clearError(phoneInput, 'phone-error');
        checkFormValidity();
    });
}

// ==========================================
// 5. FINAL SUBMISSION HANDLING
// ==========================================

function submitReservation(event) {
    event.preventDefault();

    const name = document.getElementById('client-name').value;
    const phone = document.getElementById('client-phone').value;
    const email = document.getElementById('client-email').value;

    const service = document.querySelector('.summary-service').textContent;
    const stylist = document.querySelector('.summary-stylist').textContent;
    const date = document.querySelector('.summary-date').textContent;
    const time = document.querySelector('.summary-time').textContent;

    console.log("Submitting Reservation:", { name, phone, email, service, stylist, date, time });

    alert(`Thank you, ${name}! Your request for a ${service} with ${stylist} on ${date} at ${time} has been submitted successfully.`);

    window.location.href = "index.html"
}

if (depositBtn) {
    depositBtn.addEventListener('click', async () => {
        depositBtn.textContent = 'Redirecting...';
        depositBtn.disabled = true;

        const serviceId = selectedServiceId;
        const serviceName = document.querySelector('.summary-service').textContent;
        const stylist = selectedStylistId;
        const date = selectedDateString;
        const time = selectedTimeSlot;
        const customerName = document.getElementById('client-name').value;
        const customerEmail = document.getElementById('client-email').value;
        const customerPhone = document.getElementById('client-phone').value;

        const response = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceId, serviceName, stylist, date, time, customerName, customerEmail, customerPhone }),
        });

        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert('Something went wrong. Please try again.');
            depositBtn.textContent = 'RESERVE & PAY DEPOSIT';
            depositBtn.disabled = false;
        }
    });
}