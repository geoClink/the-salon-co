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
const navBar = document.querySelector('nav');

menuToggle.addEventListener('click', () => {
    navBar.classList.toggle('nav-open');
    menuToggle.classList.toggle('menu-open');
});

const navLinks = document.querySelectorAll('nav a');

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


/*-- FAQ --*/
const faqItems = document.querySelectorAll('.faq-item');


faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    const sign = item.querySelector('.faq-sign');

    question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');

        faqItems.forEach(i => {
            i.classList.remove('open');
            i.querySelector('.faq-answer').style.display ='none';
            i.querySelector('.faq-sign').textContent = '+';
        });

        if (!isOpen) {
            item.classList.add('open');
            answer.style.display = 'block';
            sign.textContent = '×';
        }
    });
});

if (faqItems.length > 0) {
    faqItems[0].querySelector('.faq-question').click();
}

/*-- GALLERY FILTER --*/

const filterBtns = document.querySelectorAll('.filter-btn');
const galleryItems = document.querySelectorAll('.gallery-item');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;

        galleryItems.forEach(item => {
            if (filter === 'all') {
                item.style.display = 'block';
            } else if (item.dataset.category === filter) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
});


