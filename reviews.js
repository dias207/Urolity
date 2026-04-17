// Firebase Reviews System
class ReviewsManager {
  constructor() {
    this.db = null;
    this.storage = null;
    this.auth = null;
    this.isAdmin = false;
    this.reviewsContainer = null;
    this.loadedReviewIds = new Set(); // Отслеживаем загруженные отзывы
    this.init();
  }

  async init() {
    try {
      // Инициализация Firebase
      const firebaseConfig = {
        apiKey: "AIzaSyDx6jGmGOvRhrjcdk9gickBkrM-4cmSdA4",
        authDomain: "urolit.firebaseapp.com",
        projectId: "urolit",
        storageBucket: "urolit.firebasestorage.app",
        messagingSenderId: "979838978277",
        appId: "1:979838978277:web:a504fbeec07de2f8c06c0c",
        measurementId: "G-BE72QDNYDF"
      };

      // Инициализация Firebase (если еще не инициализирован)
      if (!window.firebase) {
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js';
        script.onload = () => {
          this.loadFirebaseModules(firebaseConfig);
        };
        document.head.appendChild(script);
      } else {
        this.loadFirebaseModules(firebaseConfig);
      }

      // Находим контейнер для отзывов
      this.reviewsContainer = document.querySelector('.rev-g');
      
      // Проверяем админ права
      this.checkAdminAccess();
      
      // Устанавливаем обработчики
      this.setupEventListeners();
      
      // Загружаем отзывы
      this.loadReviews();
      
    } catch (error) {
      console.error('Error initializing reviews:', error);
      // Если Firebase не работает, используем localStorage
      this.initLocalStorage();
    }
  }

  loadFirebaseModules(config) {
    // Загружаем модули Firebase
    const scripts = [
      'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore-compat.js',
      'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage-compat.js',
      'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth-compat.js'
    ];

    let loadedCount = 0;
    scripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        loadedCount++;
        if (loadedCount === scripts.length) {
          try {
            firebase.initializeApp(config);
            this.db = firebase.firestore();
            this.storage = firebase.storage();
            this.auth = firebase.auth();
            console.log('✅ Firebase initialized successfully');
            console.log('📦 Database:', this.db);
            console.log('🔗 Project ID:', config.projectId);
            
            // Проверяем соединение
            this.db.collection('reviews').limit(1).get().then(() => {
              console.log('✅ Firebase connection working');
            }).catch(error => {
              console.error('❌ Firebase connection error:', error);
            });
            
          } catch (error) {
            console.error('❌ Firebase initialization error:', error);
            this.initLocalStorage();
          }
        }
      };
      script.onerror = () => {
        console.error('❌ Failed to load Firebase module:', src);
        this.initLocalStorage();
      };
      document.head.appendChild(script);
    });
  }

  initLocalStorage() {
    console.log('Using localStorage for reviews');
    this.loadReviewsFromStorage();
  }

  setupEventListeners() {
    const form = document.getElementById('reviewForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const review = {
      name: formData.get('name'),
      rating: parseInt(formData.get('rating')),
      text: formData.get('text'),
      date: new Date().toISOString(),
      approved: false // Отзывы требуют модерации
    };

    // Показываем загрузку
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : 'Отправить';
    
    try {
      if (submitBtn) {
        submitBtn.textContent = 'Отправка...';
        submitBtn.disabled = true;
      }

      // Обрабатываем изображение если есть
      const imageFile = formData.get('image');
      if (imageFile && imageFile.size > 0) {
        review.image = await this.uploadImage(imageFile);
      }

      // Сохраняем отзыв
      if (this.db) {
        const docRef = await this.db.collection('reviews').add(review);
        console.log('Review saved with ID:', docRef.id);
        console.log('Review data:', review);
      } else {
        this.saveReviewToStorage(review);
        console.log('Review saved to localStorage:', review);
      }

      // Очищаем форму
      e.target.reset();
      
      // Показываем успех
      this.showNotification('Отзыв отправлен на модерацию!', 'success');
      
      // Перезагружаем отзывы
      this.loadReviews();
      
    } catch (error) {
      console.error('Error submitting review:', error);
      this.showNotification('Ошибка при отправке отзыва', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    }
  }

  async uploadImage(file) {
    if (!this.storage) {
      // Если нет Firebase Storage, используем DataURL
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }

    const storageRef = this.storage.ref(`reviews/${Date.now()}_${file.name}`);
    await storageRef.put(file);
    return await storageRef.getDownloadURL();
  }

  async loadReviews() {
    try {
      if (this.db) {
        console.log('Loading reviews from Firebase...');
        const snapshot = await this.db
          .collection('reviews')
          .get();
        
        const reviews = [];
        snapshot.forEach(doc => {
          const reviewData = { id: doc.id, ...doc.data() };
          console.log('Found review:', reviewData);
          reviews.push(reviewData);
        });
        
        // Сортируем на клиенте
        reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log('Total reviews loaded:', reviews.length);
        this.displayReviews(reviews);
      } else {
        this.loadReviewsFromStorage();
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      this.loadReviewsFromStorage();
    }
  }

  loadReviewsFromStorage() {
    const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
    const approvedReviews = reviews.filter(r => r.approved !== false);
    this.displayReviews(approvedReviews);
  }

  displayReviews(reviews) {
    if (!this.reviewsContainer) {
      console.error('Reviews container not found!');
      return;
    }

    console.log('📝 Reviews saved (not displayed on page):', reviews.length);
    
    // Просто логируем отзывы, не добавляем на страницу
    reviews.forEach((review, index) => {
      console.log(`  ${index + 1}. ${review.name} (${review.rating}★): ${review.text}`);
    });
    
    // НЕ добавляем отзывы на страницу - только в консоль
    console.log('💾 Reviews are saved in Firebase/localStorage but not displayed');
  }

  createReviewElement(review, index) {
    const div = document.createElement('div');
    div.className = 'rev-c fu review-item';
    div.setAttribute('data-review-id', review.id);
    div.style.setProperty('--dl', `${index * 0.1}s`);
    
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    const date = new Date(review.date).toLocaleDateString('ru-RU', { 
      month: 'long', 
      year: 'numeric' 
    });
    
    const imageHtml = review.image ? 
      `<img src="${review.image}" alt="Отзыв пациента" class="rev-img-expand"
        style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px; margin-bottom: 16px; cursor: pointer;">` : '';
    
    const deleteButton = this.isAdmin ? 
      `<button class="delete-btn" onclick="reviewsManager.deleteReview('${review.id}')">×</button>` : '';
    
    div.innerHTML = `
      ${deleteButton}
      ${imageHtml}
      <div class="rev-stars stars">${stars}</div>
      <div class="rev-au">
        <div class="rev-av">${review.name.charAt(0).toUpperCase()}</div>
        <div>
          <p class="rev-nm">${review.name}</p>
          <p class="rev-dt">${date}</p>
        </div>
      </div>
      <p style="margin-top: 12px; color: var(--navy); line-height: 1.5; font-size: 14px;">${review.text}</p>
    `;
    
    // Добавляем обработчик для изображения
    const img = div.querySelector('.rev-img-expand');
    if (img) {
      img.addEventListener('click', () => this.openImageModal(img.src));
    }
    
    return div;
  }

  async deleteReview(reviewId) {
    if (!confirm('Удалить этот отзыв?')) return;
    
    try {
      if (this.db) {
        await this.db.collection('reviews').doc(reviewId).delete();
      } else {
        const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
        const updatedReviews = reviews.filter(r => r.id !== reviewId);
        localStorage.setItem('reviews', JSON.stringify(updatedReviews));
      }
      
      this.loadReviews();
      this.showNotification('Отзыв удален', 'success');
    } catch (error) {
      console.error('Error deleting review:', error);
      this.showNotification('Ошибка при удалении отзыва', 'error');
    }
  }

  saveReviewToStorage(review) {
    const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
    review.id = Date.now().toString();
    reviews.push(review);
    localStorage.setItem('reviews', JSON.stringify(reviews));
  }

  checkAdminAccess() {
    // Простая проверка админа по localStorage или URL параметру
    const adminKey = localStorage.getItem('adminKey') || 
                    new URLSearchParams(window.location.search).get('admin');
    
    if (adminKey === 'admin123') {
      this.isAdmin = true;
      document.body.classList.add('admin-mode');
    }
  }

  openImageModal(imageSrc) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    
    if (modal && modalImg) {
      modal.style.display = 'block';
      modalImg.src = imageSrc;
    }
  }

  showNotification(message, type = 'info') {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      border-radius: 8px;
      z-index: 10000;
      animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Добавляем анимации для уведомлений
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Инициализируем систему отзывов
let reviewsManager;
document.addEventListener('DOMContentLoaded', () => {
  reviewsManager = new ReviewsManager();
  window.reviewsManager = reviewsManager; // Глобальный доступ
});

// Функция для включения админ режима (можно вызвать в консоли)
window.enableAdminMode = () => {
  localStorage.setItem('adminKey', 'admin123');
  location.reload();
};

// Функция для очистки пользовательских отзывов
window.clearUserReviews = async () => {
  if (!confirm('Удалить все пользовательские отзывы?')) return;
  
  try {
    const manager = window.reviewsManager;
    if (!manager) {
      console.error('Reviews manager not found');
      return;
    }
    
    if (manager.db) {
      // Удаляем из Firebase
      const snapshot = await manager.db.collection('reviews').get();
      const batch = manager.db.batch();
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log('All reviews deleted from Firebase');
    }
    
    // Очищаем localStorage
    localStorage.removeItem('reviews');
    
    // Очищаем загруженные ID
    manager.loadedReviewIds.clear();
    
    // Удаляем динамические отзывы со страницы
    const dynamicReviews = document.querySelectorAll('.review-item');
    dynamicReviews.forEach(review => review.remove());
    
    manager.showNotification('Все пользовательские отзывы удалены', 'success');
    
  } catch (error) {
    console.error('Error clearing reviews:', error);
    if (window.reviewsManager) {
      window.reviewsManager.showNotification('Ошибка при удалении отзывов', 'error');
    }
  }
};

// Функция для проверки статуса Firebase
window.checkFirebaseStatus = () => {
  const manager = window.reviewsManager;
  if (!manager) {
    console.log('❌ Reviews manager not found');
    return;
  }
  
  console.log('🔍 Firebase Status Check:');
  console.log('📦 Database available:', !!manager.db);
  console.log('🗄️ Storage available:', !!manager.storage);
  console.log('🔐 Auth available:', !!manager.auth);
  console.log('📊 Using Firebase:', !!manager.db);
  console.log('🖥️ Reviews are NOT displayed on page - only in console');
  
  if (manager.db) {
    manager.db.collection('reviews').get().then(snapshot => {
      console.log('✅ Firebase connected');
      console.log('📝 Total reviews in database:', snapshot.size);
      console.log('📋 All reviews:');
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  📌 ${doc.id}:`);
        console.log(`     👤 Name: ${data.name}`);
        console.log(`     ⭐ Rating: ${data.rating}`);
        console.log(`     📅 Date: ${data.date}`);
        console.log(`     💬 Text: ${data.text}`);
        console.log('');
      });
    }).catch(error => {
      console.error('❌ Firebase connection failed:', error);
    });
  } else {
    console.log('💾 Using localStorage fallback');
    const localReviews = JSON.parse(localStorage.getItem('reviews') || '[]');
    console.log('📝 Local reviews:', localReviews.length);
    console.log('📋 All reviews:');
    localReviews.forEach((review, index) => {
      console.log(`  📌 ${index + 1}:`);
      console.log(`     👤 Name: ${review.name}`);
      console.log(`     ⭐ Rating: ${review.rating}`);
      console.log(`     📅 Date: ${review.date}`);
      console.log(`     💬 Text: ${review.text}`);
      console.log('');
    });
  }
};
