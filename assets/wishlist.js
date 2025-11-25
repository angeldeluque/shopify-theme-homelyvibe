document.addEventListener('DOMContentLoaded', () => {
  const storageKey = 'hv-wishlist-items';
  const drawer = document.querySelector('[data-wishlist-drawer]');
  const toggleButton = document.querySelector('[data-wishlist-toggle]');
  const themeStrings = (window.theme && window.theme.strings) || {};

  if (!drawer || !toggleButton) {
    return;
  }

  const countWrapper = document.querySelector('[data-wishlist-count-wrapper]');
  const countValue = document.querySelector('[data-wishlist-count]');
  const itemsContainer = drawer.querySelector('[data-wishlist-items]');
  const emptyState = drawer.querySelector('[data-wishlist-empty]');
  const closeTriggers = drawer.querySelectorAll('[data-wishlist-close]');

  let favorites = loadFavorites();

  function loadFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(stored) ? stored : [];
    } catch (error) {
      console.warn('Wishlist storage parse error', error);
      return [];
    }
  }

  function persistFavorites() {
    localStorage.setItem(storageKey, JSON.stringify(favorites));
  }

  function formatMoney(cents) {
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      return window.Shopify.formatMoney(cents, window.Shopify.money_format);
    }
    return `$${(cents / 100).toFixed(2)}`;
  }

  function isInWishlist(variantId) {
    return favorites.some((item) => item.variantId === variantId);
  }

  function updateHeaderCount() {
    const count = favorites.length;

    if (!countWrapper || !countValue) {
      return;
    }

    countValue.textContent = count;
    toggleButton.classList.toggle('is-active', count > 0);

    if (count > 0) {
      countWrapper.classList.remove('hidden');
    } else {
      countWrapper.classList.add('hidden');
    }
  }

  function buildWishlistItem(item) {
    const listItem = document.createElement('li');
    listItem.className = 'wishlist-item';

    const media = document.createElement('div');
    media.className = 'wishlist-item__media';

    if (item.image) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.title;
      img.loading = 'lazy';
      media.appendChild(img);
    }

    const info = document.createElement('div');
    info.className = 'wishlist-item__info';

    const titleLink = document.createElement('a');
    titleLink.href = item.url;
    titleLink.className = 'wishlist-item__title link';
    titleLink.textContent = item.title;

    const price = document.createElement('div');
    price.className = 'wishlist-item__price';
    price.textContent = formatMoney(item.price);

    info.appendChild(titleLink);
    info.appendChild(price);

    const actions = document.createElement('div');
    actions.className = 'wishlist-item__actions';

    const viewButton = document.createElement('a');
    viewButton.href = item.url;
    viewButton.className = 'button button--secondary';
    viewButton.textContent = themeStrings.viewProduct || 'Ver producto';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'button button--tertiary';
    removeButton.setAttribute('data-wishlist-remove', 'true');
    removeButton.setAttribute('data-variant-id', item.variantId);
    removeButton.textContent = themeStrings.remove || 'Quitar';

    actions.appendChild(viewButton);
    actions.appendChild(removeButton);

    listItem.appendChild(media);
    listItem.appendChild(info);
    listItem.appendChild(actions);

    return listItem;
  }

  function renderDrawer() {
    if (!itemsContainer || !emptyState) {
      return;
    }

    itemsContainer.innerHTML = '';

    if (favorites.length === 0) {
      itemsContainer.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    itemsContainer.classList.remove('hidden');

    favorites.forEach((item) => {
      itemsContainer.appendChild(buildWishlistItem(item));
    });
  }

  function syncCardButtons() {
    document.querySelectorAll('[data-wishlist-button]').forEach((button) => {
      const variantId = button.getAttribute('data-variant-id');
      const isActive = isInWishlist(variantId);
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function getProductDataFromButton(button) {
    return {
      id: button.getAttribute('data-product-id'),
      variantId: button.getAttribute('data-variant-id'),
      title: button.getAttribute('data-product-title'),
      url: button.getAttribute('data-product-url'),
      price: parseInt(button.getAttribute('data-product-price'), 10) || 0,
      image: button.getAttribute('data-product-image') || '',
    };
  }

  function toggleFavorite(product) {
    const existingIndex = favorites.findIndex((item) => item.variantId === product.variantId);
    let added;

    if (existingIndex > -1) {
      favorites.splice(existingIndex, 1);
      added = false;
    } else {
      favorites.push(product);
      added = true;
    }

    persistFavorites();
    updateHeaderCount();
    renderDrawer();
    syncCardButtons();

    return added;
  }

  function animateButton(button, added) {
    if (!button) {
      return;
    }

    button.classList.remove('wishlist-button--pulse');
    void button.offsetWidth;
    button.classList.add('wishlist-button--pulse');

    if (typeof added === 'boolean') {
      button.classList.toggle('is-active', added);
    }

    button.addEventListener(
      'animationend',
      () => {
        button.classList.remove('wishlist-button--pulse');
      },
      { once: true }
    );
  }

  function openDrawer() {
    drawer.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('wishlist-open');
    toggleButton.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    drawer.classList.remove('active');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('wishlist-open');
    toggleButton.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-wishlist-button]');
    if (toggle) {
      event.preventDefault();
      const added = toggleFavorite(getProductDataFromButton(toggle));
      animateButton(toggle, added);
      return;
    }

    const remove = event.target.closest('[data-wishlist-remove]');
    if (remove) {
      event.preventDefault();
      const variantId = remove.getAttribute('data-variant-id');
      favorites = favorites.filter((item) => item.variantId !== variantId);
      persistFavorites();
      updateHeaderCount();
      renderDrawer();
      syncCardButtons();
    }
  });

  toggleButton.addEventListener('click', () => {
    if (drawer.classList.contains('active')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  closeTriggers.forEach((trigger) => {
    trigger.addEventListener('click', closeDrawer);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDrawer();
    }
  });

  document.addEventListener('shopify:section:load', () => {
    syncCardButtons();
  });

  updateHeaderCount();
  renderDrawer();
  syncCardButtons();
});
