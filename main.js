/* ── shared site js ── */

// header scroll
const H = document.querySelector('.hdr');
if (H) window.addEventListener('scroll', () => H.classList.toggle('sc', scrollY > 50), { passive: true });

// burger — mobile-first: nav hidden by default, .op shows it
const brg = document.getElementById('brg');
const nav = document.getElementById('nav');
if (brg && nav) {
  const S = brg.querySelectorAll('span');

  function closeNav() {
    nav.classList.remove('op');
    S[0].style.cssText = '';
    S[1].style.cssText = '';
    S[2].style.cssText = '';
    document.body.style.overflow = '';
  }

  function openNav() {
    nav.classList.add('op');
    S[0].style.cssText = 'transform:rotate(45deg) translate(5px,5px)';
    S[1].style.cssText = 'opacity:0';
    S[2].style.cssText = 'transform:rotate(-45deg) translate(5px,-5px)';
    document.body.style.overflow = 'hidden';
  }

  brg.addEventListener('click', (e) => {
    e.stopPropagation();
    nav.classList.contains('op') ? closeNav() : openNav();
  });

  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));

  document.addEventListener('click', e => {
    if (nav.classList.contains('op') && !H.contains(e.target)) closeNav();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('op')) closeNav();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900 && nav.classList.contains('op')) closeNav();
  });
}

// fade-up observer
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
}), { threshold: .1, rootMargin: '0px 0px -32px 0px' });
document.querySelectorAll('.fu').forEach(el => io.observe(el));

// smooth anchor scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const t = document.querySelector(id);
    if (t) { e.preventDefault(); window.scrollTo({ top: t.getBoundingClientRect().top + scrollY - 76, behavior: 'smooth' }); }
  });
});

// counter animation
function countUp(el) {
  const raw = el.textContent, n = parseInt(raw);
  if (isNaN(n)) return;
  const sfx = raw.replace(/\d/g, ''), dur = 1400, t0 = performance.now();
  const tick = now => {
    const p = Math.min((now - t0) / dur, 1), e2 = 1 - 2 ** (-10 * p);
    el.textContent = Math.round(e2 * n) + sfx;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
const ci = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { countUp(e.target); ci.unobserve(e.target); }
}), { threshold: .6 });
document.querySelectorAll('[data-c]').forEach(el => ci.observe(el));

// modal — use flex for centering
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImage');
const modalClose = document.querySelector('.modal-close');

if (modal && modalImg) {
  document.querySelectorAll('.rev-img-expand, .cert-c img').forEach(img => {
    img.style.cursor = 'pointer';
    img.addEventListener('click', function () {
      modal.style.display = 'flex';
      modalImg.src = this.src;
      modalImg.alt = this.alt || '';
      document.body.style.overflow = 'hidden';
    });
  });

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

// FAQ accordion
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.faq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
});

// Функционал отзывов
document.addEventListener('DOMContentLoaded', function () {
  // Элементы
  const modal = document.getElementById('reviewModal');
  const addBtn = document.getElementById('addReviewBtn');
  const closeBtn = document.querySelector('.close-modal-review');
  const form = document.getElementById('reviewForm');
  const reviewsContainer = document.querySelector('.rev-g');

  // Загрузка отзывов
  loadReviews();

  // Открытие модального окна
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    });
  }

  // Закрытие модального окна
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  if (modal) {
    window.addEventListener('click', function (e) {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  function closeModal() {
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    if (form) form.reset();
    resetStars();
  }

  // Рейтинг звездами
  const stars = document.querySelectorAll('.star');
  let selectedRating = 0;

  if (stars.length > 0) {
    stars.forEach(star => {
      star.addEventListener('click', function () {
        selectedRating = parseInt(this.getAttribute('data-rating'));
        updateStars(selectedRating);
      });

      star.addEventListener('mouseenter', function () {
        const hoverRating = parseInt(this.getAttribute('data-rating'));
        updateStars(hoverRating);
      });
    });
  }

  const starRating = document.querySelector('.star-rating');
  if (starRating) {
    starRating.addEventListener('mouseleave', function () {
      updateStars(selectedRating);
    });
  }

  function updateStars(rating) {
    if (stars.length === 0) return;
    
    stars.forEach((star, index) => {
      if (index < rating) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
  }

  function resetStars() {
    selectedRating = 0;
    updateStars(0);
  }

  // Отправка формы
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitReview();
    });
  }

  function submitReview() {
    if (selectedRating === 0) {
      alert('Пожалуйста, выберите оценку');
      return;
    }

    const name = document.getElementById('reviewName').value.trim();
    const text = document.getElementById('reviewText').value.trim();

    if (!name || !text) {
      alert('Пожалуйста, заполните все поля');
      return;
    }

    const review = {
      id: Date.now(),
      name: name,
      rating: selectedRating,
      text: text,
      date: new Date().toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    };

    saveReview(review);
    addReviewToPage(review);
    closeModal();

    // Показываем уведомление
    showNotification('Спасибо! Ваш отзыв отправлен');
  }

  function saveReview(review) {
    const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
    reviews.unshift(review);
    localStorage.setItem('reviews', JSON.stringify(reviews));
  }

  function loadReviews() {
    const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
    reviews.forEach(review => addReviewToPage(review));
  }

  function addReviewToPage(review) {
    const reviewCard = document.createElement('div');
    reviewCard.className = 'rev-c fu new-review';
    reviewCard.dataset.id = review.id;

    const starsHtml = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

    reviewCard.innerHTML = `
      <button class="review-delete" title="Удалить отзыв">×</button>
      <div class="rev-stars stars">${starsHtml}</div>
      <p class="rev-txt">${review.text}</p>
      <div class="rev-au">
        <div class="rev-av">${review.name[0]}</div>
        <div>
          <p class="rev-nm">${review.name}</p>
          <p class="rev-dt">${review.date}</p>
        </div>
      </div>
    `;

    reviewsContainer.insertBefore(reviewCard, reviewsContainer.firstChild);

    // Удаление отзыва
    reviewCard.querySelector('.review-delete').addEventListener('click', function () {
      if (confirm('Вы уверены, что хотите удалить этот отзыв?')) {
        deleteReview(review.id);
        reviewCard.remove();
      }
    });

    // Анимация
    setTimeout(() => {
      reviewCard.classList.remove('new-review');
    }, 3000);
  }

  function deleteReview(id) {
    const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
    const updatedReviews = reviews.filter(review => review.id !== id);
    localStorage.setItem('reviews', JSON.stringify(updatedReviews));
  }

  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: var(--navy);
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      z-index: 2000;
      animation: slideInRight 0.3s;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Анимация уведомления
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; transform: translateY(20px); }
    }
  `;
  document.head.appendChild(style);
});
