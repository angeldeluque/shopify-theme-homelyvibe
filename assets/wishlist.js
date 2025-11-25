document.addEventListener('DOMContentLoaded', () => {
  const wishlistButton = document.querySelector('.header__icon--favorites');
  
  if (!wishlistButton) return;

  // Load state
  const isWishlistActive = localStorage.getItem('hv-wishlist-active') === 'true';
  if (isWishlistActive) {
    wishlistButton.classList.add('is-active');
  }

  document.addEventListener('hv-toggle-favorites', () => {
    const isActive = wishlistButton.classList.toggle('is-active');
    localStorage.setItem('hv-wishlist-active', isActive);
    
    // Optional: Show a notification or toast
    console.log('Wishlist toggled:', isActive);
  });
});
