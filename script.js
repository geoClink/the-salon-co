const header = document.querySelector('header')

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

function rotateReview(index) {
    reviews.forEach(review => {
        review.classList.remove('active');
    });
    bars.forEach(bar => {
        bar.classList.remove('active');
    })
    reviews[index].classList.add('active')
    bars[index].classList.add('active');
};

bars.forEach((bar, index) => {
    bar.addEventListener('click', () => {
        rotateReview(index)
    })
});

let currentIndex = 0
setInterval(() => {
    currentIndex = (currentIndex + 1) % reviews.length;
    rotateReview(currentIndex);
}, 3000);