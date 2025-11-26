document.addEventListener('DOMContentLoaded', () => {
  const baseStorageKey = 'hv-wishlist-items';
  const themeGlobals = window.theme || {};
  const themeStrings = themeGlobals.strings || {};
  const customerToken = themeGlobals.customerId || themeGlobals.customerIdentifier || null;
  const storageKey = customerToken ? `${baseStorageKey}-${customerToken}` : baseStorageKey;
  const drawer = document.querySelector('[data-wishlist-drawer]');
  const toggleButton = document.querySelector('[data-wishlist-toggle]');

  if (!drawer || !toggleButton) {
    return;
  }

  if (customerToken) {
    try {
      const legacyValue = localStorage.getItem(baseStorageKey);
      if (legacyValue && !localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, legacyValue);
        localStorage.removeItem(baseStorageKey);
      }
    } catch (error) {
      console.warn('Wishlist storage migration error', error);
    }
  }

  if (drawer.parentElement && drawer.parentElement !== document.body) {
    document.body.appendChild(drawer);
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
    try {
      localStorage.setItem(storageKey, JSON.stringify(favorites));
    } catch (error) {
      console.warn('Wishlist storage persist error', error);
    }
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

    updateToggleAria(drawer.classList.contains('active'), count);
  }

  function updateToggleAria(isOpen, count) {
    const baseOpenLabel =
      toggleButton.dataset.wishlistOpenLabel ||
      themeStrings.openWishlist ||
      toggleButton.getAttribute('aria-label') ||
      'Ver favoritos';
    const openLabel =
      typeof count === 'number' && count > 0
        ? `${baseOpenLabel} (${count})`
        : baseOpenLabel;
    const closeLabel =
      toggleButton.dataset.wishlistCloseLabel || themeStrings.closeWishlist || baseOpenLabel;

    toggleButton.setAttribute('aria-label', isOpen ? closeLabel : openLabel);
  }

  function updateButtonLabels(button, isActive) {
    if (!button) {
      return;
    }

    const labelTarget = button.querySelector('[data-wishlist-label-target]');
    const addLabel =
      button.getAttribute('data-wishlist-add-label') ||
      themeStrings.addToWishlist ||
      themeStrings.addWishlist ||
      'Agregar a favoritos';
    const addedLabel =
      button.getAttribute('data-wishlist-added-label') ||
      themeStrings.addedToWishlist ||
      'En favoritos';
    const labelToUse = isActive ? addedLabel : addLabel;

    if (labelTarget) {
      labelTarget.textContent = labelToUse;
    }

    button.setAttribute('aria-label', labelToUse);
  }

  function playButtonAnimation(button, added) {
    if (!button) {
      return;
    }

    if (button._wishlistAnimationTimeout) {
      window.clearTimeout(button._wishlistAnimationTimeout);
      button._wishlistAnimationTimeout = null;
    }

    button.classList.remove('wishlist-button--just-added', 'wishlist-button--just-removed');

    // Force reflow so the animation can restart reliably.
    void button.offsetWidth;

    const animationClass = added ? 'wishlist-button--just-added' : 'wishlist-button--just-removed';
    button.classList.add(animationClass);

    const duration = added ? 650 : 340;
    button._wishlistAnimationTimeout = window.setTimeout(() => {
      button.classList.remove('wishlist-button--just-added', 'wishlist-button--just-removed');
      button._wishlistAnimationTimeout = null;
    }, duration);
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
    viewButton.className = 'button wishlist-item__view';
    viewButton.textContent = themeStrings.viewProduct || 'Ver producto';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'button wishlist-item__remove';
    removeButton.setAttribute('data-wishlist-remove', 'true');
    removeButton.setAttribute('data-variant-id', item.variantId);
    removeButton.textContent = themeStrings.removeFromWishlist || themeStrings.remove || 'Quitar';

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
      const shouldBeActive = isInWishlist(variantId);
      const wasActive = button.classList.contains('is-active');

      button.classList.toggle('is-active', shouldBeActive);
      button.setAttribute('aria-pressed', shouldBeActive ? 'true' : 'false');
      updateButtonLabels(button, shouldBeActive);

      if (button.classList.contains('wishlist-skip-sync-anim')) {
        return;
      }

      if (shouldBeActive !== wasActive) {
        playButtonAnimation(button, shouldBeActive);
      }
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

    return added;
  }

  function openDrawer() {
    drawer.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('wishlist-open');
    toggleButton.setAttribute('aria-expanded', 'true');
    updateToggleAria(true, favorites.length);
  }

  function closeDrawer() {
    drawer.classList.remove('active');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('wishlist-open');
    toggleButton.setAttribute('aria-expanded', 'false');
    updateToggleAria(false, favorites.length);
  }

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-wishlist-button]');
    if (toggle) {
      event.preventDefault();
      const productData = getProductDataFromButton(toggle);
      toggle.classList.add('wishlist-skip-sync-anim');

      const added = toggleFavorite(productData);

      toggle.classList.toggle('is-active', added);
      toggle.setAttribute('aria-pressed', added ? 'true' : 'false');
      updateButtonLabels(toggle, added);
      playButtonAnimation(toggle, added);

      syncCardButtons();
      toggle.classList.remove('wishlist-skip-sync-anim');
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
