document.addEventListener('DOMContentLoaded', () => {
  const baseStorageKey = 'hv-wishlist-items';
  // Wishlist Drawer logic with animated removal and per-user persistence
  (function() {
    const drawer = document.querySelector('.wishlist-drawer');
    const contents = document.querySelector('.wishlist-drawer__contents');
    const closeButtons = document.querySelectorAll('[data-wishlist-close]');
    const toggleButtons = document.querySelectorAll('[data-wishlist-toggle]');

    function formatMoney(amount, currency) {
      try {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency }).format(amount);
      } catch (e) {
        return amount.toLocaleString('es-CO') + ' ' + currency;
      }
    }

    function openDrawer() { document.body.classList.add('wishlist-open'); }
    function closeDrawer() { document.body.classList.remove('wishlist-open'); }

    closeButtons.forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); closeDrawer(); }));
    toggleButtons.forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); openDrawer(); }));

    // Build a user-scoped storage key; fallback to generic if not available
    function getUserScope() {
      try {
        const el = document.querySelector('[data-customer-id]');
        const cid = el ? el.getAttribute('data-customer-id') : null;
        return cid ? `wishlist:${cid}` : 'wishlist:guest';
      } catch(e) { return 'wishlist:guest'; }
    }

    const storageKey = getUserScope();
    let wishlist = [];

    function persist() {
      try { localStorage.setItem(storageKey, JSON.stringify(wishlist)); } catch (e) {}
    }

    function load() {
      try {
        const raw = localStorage.getItem(storageKey);
        wishlist = raw ? JSON.parse(raw) : [];
      } catch (e) { wishlist = []; }
    }

    function buildRow(item) {
      const row = document.createElement('div');
      row.className = 'wishlist-item';
      row.setAttribute('data-id', item.id);
      row.innerHTML = `
        <div class="wishlist-item__media"><img src="${item.image}" alt="${item.title}" /></div>
        <div class="wishlist-item__info">
          <a href="${item.url}" class="wishlist-item__title">${item.title}</a>
          <div class="wishlist-item__meta">${formatMoney(item.price, item.currency || 'COP')}</div>
        </div>
        <div class="wishlist-item__actions">
          <button class="button button--primary wishlist-item__view" data-url="${item.url}">Ver producto</button>
          <button class="button button--primary wishlist-item__remove" data-id="${item.id}">Quitar de favoritos</button>
        </div>
      `;
      // Bind actions
      const viewBtn = row.querySelector('.wishlist-item__view');
      const removeBtn = row.querySelector('.wishlist-item__remove');
      viewBtn.addEventListener('click', (e) => { e.preventDefault(); const url = viewBtn.getAttribute('data-url'); closeDrawer(); window.location.href = url; });
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = removeBtn.getAttribute('data-id');
        row.classList.add('wishlist-item--removing');
        const finishRemoval = () => {
          row.removeEventListener('transitionend', finishRemoval);
          wishlist = wishlist.filter(x => String(x.id) !== String(id));
          persist();
          row.remove();
        };
        row.addEventListener('transitionend', finishRemoval);
        setTimeout(finishRemoval, 350); // fallback
      });
      return row;
    }

    function render() {
      if (!contents) return;
      contents.innerHTML = '';
      wishlist.forEach(item => contents.appendChild(buildRow(item)));
    }

    // Public API to add to wishlist (to be called elsewhere)
    window.Wishlist = window.Wishlist || {
      add(item) {
        // item: {id, title, url, image, price, currency}
        if (!item || !item.id) return;
        if (wishlist.some(x => String(x.id) === String(item.id))) return;
        wishlist.push(item);
        persist();
        if (contents) contents.appendChild(buildRow(item));
      },
      remove(id) {
        const row = contents && contents.querySelector(`.wishlist-item[data-id="${id}"]`);
        if (row) {
          row.classList.add('wishlist-item--removing');
          const done = () => { row.removeEventListener('transitionend', done); row.remove(); };
          row.addEventListener('transitionend', done);
        }
        wishlist = wishlist.filter(x => String(x.id) !== String(id));
        persist();
      },
      list() { return [...wishlist]; }
    };

    // Initialize
    load();
    render();

    // Bind product card wishlist buttons
    function syncButtonState(btn) {
      const pid = btn.getAttribute('data-product-id');
      const isIn = wishlist.some(x => String(x.id) === String(pid));
      btn.setAttribute('aria-pressed', isIn ? 'true' : 'false');
      const labelTarget = btn.querySelector('[data-wishlist-label-target]');
      const addLabel = btn.getAttribute('data-wishlist-add-label') || 'Agregar a favoritos';
      const addedLabel = btn.getAttribute('data-wishlist-added-label') || 'En favoritos';
      if (labelTarget) labelTarget.textContent = isIn ? addedLabel : addLabel;
      btn.classList.toggle('is-active', isIn);
    }

    function bindWishlistButtons() {
      const buttons = document.querySelectorAll('[data-wishlist-button]');
      buttons.forEach((btn) => {
        syncButtonState(btn);
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const product = {
            id: btn.getAttribute('data-product-id'),
            title: btn.getAttribute('data-product-title'),
            url: btn.getAttribute('data-product-url'),
            image: btn.getAttribute('data-product-image'),
            // Shopify price is in cents; convert to major units
            price: (parseInt(btn.getAttribute('data-product-price') || '0', 10) / 100),
            currency: 'COP'
          };
          const exists = wishlist.some(x => String(x.id) === String(product.id));
          if (exists) {
            // remove
            wishlist = wishlist.filter(x => String(x.id) !== String(product.id));
            persist();
            // also remove row in drawer if present
            const row = contents && contents.querySelector(`.wishlist-item[data-id="${product.id}"]`);
            if (row) {
              row.classList.add('wishlist-item--removing');
              row.addEventListener('transitionend', () => row.remove(), { once: true });
              setTimeout(() => { if (row && row.parentNode) row.parentNode.removeChild(row); }, 350);
            }
          } else {
            wishlist.push(product);
            persist();
            if (contents) contents.appendChild(buildRow(product));
          }
          syncButtonState(btn);
        });
      });
    }

    // Re-bind on initial load and after pjax/ajax updates if present
    bindWishlistButtons();
    document.addEventListener('shopify:section:load', bindWishlistButtons);
    document.addEventListener('shopify:section:select', bindWishlistButtons);
  })();
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

    const infoMeta = document.createElement('div');
    infoMeta.className = 'wishlist-item__meta';

    const titleLink = document.createElement('a');
    titleLink.href = item.url;
    titleLink.className = 'wishlist-item__title link';
    titleLink.textContent = item.title;

    const price = document.createElement('div');
    price.className = 'wishlist-item__price';
    price.textContent = formatMoney(item.price);

    infoMeta.appendChild(titleLink);
    infoMeta.appendChild(price);
    info.appendChild(infoMeta);

    const actions = document.createElement('div');
    actions.className = 'wishlist-item__actions';

    const viewButton = document.createElement('a');
    viewButton.href = item.url;
    viewButton.className = 'button wishlist-item__view';
    viewButton.setAttribute('data-wishlist-view', 'true');
    viewButton.setAttribute('data-product-url', item.url);
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
      return;
    }

    const view = event.target.closest('[data-wishlist-view]');
    if (view) {
      event.preventDefault();
      const targetUrl = view.getAttribute('href') || view.getAttribute('data-product-url');
      closeDrawer();
      window.setTimeout(() => {
        window.location.href = targetUrl;
      }, 120);
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
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
    });
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
