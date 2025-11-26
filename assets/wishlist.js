(() => {
  if (window.__wishlistInitialized) {
    return;
  }
  window.__wishlistInitialized = true;

  const defaults = {
    openWishlist: 'Ver favoritos',
    closeWishlist: 'Cerrar favoritos',
    addToWishlist: 'Agregar a favoritos',
    addedToWishlist: 'En favoritos',
    removeFromWishlist: 'Quitar de favoritos',
    viewProduct: 'Ver producto',
  };

  const locale = window.Shopify && window.Shopify.locale ? window.Shopify.locale : 'es-CO';
  const currency = window.Shopify && window.Shopify.currency && window.Shopify.currency.active
    ? window.Shopify.currency.active
    : 'COP';

  const themeStrings = Object.assign({}, defaults, (window.theme && window.theme.strings) || {});
  const storageKey = `wishlist:${window.theme && window.theme.customerId ? window.theme.customerId : 'guest'}`;

  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  ready(() => {
    const drawer = document.querySelector('[data-wishlist-drawer]');
    const panel = drawer && drawer.querySelector('[data-wishlist-panel]');
    const itemsContainer = drawer && drawer.querySelector('[data-wishlist-items]');
    const emptyState = drawer && drawer.querySelector('[data-wishlist-empty]');

    if (!drawer || !itemsContainer || !emptyState) {
      return;
    }

    if (drawer.parentNode && drawer.parentNode !== document.body) {
      document.body.appendChild(drawer);
    }

    const toggleButtons = Array.from(document.querySelectorAll('[data-wishlist-toggle]'));
    const closeTriggers = Array.from(drawer.querySelectorAll('[data-wishlist-close]'));
    const countWrapper = document.querySelector('[data-wishlist-count-wrapper]');
    const countBadge = document.querySelector('[data-wishlist-count]');
    const headerIcons = Array.from(document.querySelectorAll('.header__icon--wishlist'));

    let favorites = loadFavorites();

    function formatMoney(amount) {
      try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
      } catch (error) {
        return `${amount.toLocaleString(locale)} ${currency}`;
      }
    }

    function loadFavorites() {
      try {
        const raw = window.localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    function persistFavorites() {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(favorites));
      } catch (error) {
        // Ignore storage errors (private browsing, etc.)
      }
    }

    function getItemKey(item) {
      return String(item.variantId || item.id);
    }

    function isInWishlist(key) {
      return favorites.some((item) => getItemKey(item) === String(key));
    }

    function updateHeaderCount() {
      const count = favorites.length;
      if (countBadge) {
        countBadge.textContent = String(count);
      }
      if (countWrapper) {
        countWrapper.classList.toggle('hidden', count === 0);
      }
      headerIcons.forEach((icon) => {
        icon.classList.toggle('is-active', count > 0);
        icon.setAttribute('aria-pressed', count > 0 ? 'true' : 'false');
      });
    }

    function updateToggleLabels(isOpen) {
      const count = favorites.length;
      const baseOpen = toggleButtons.length && toggleButtons[0].dataset.wishlistOpenLabel
        ? toggleButtons[0].dataset.wishlistOpenLabel
        : themeStrings.openWishlist;
      const openLabel = count > 0 ? `${baseOpen} (${count})` : baseOpen;
      const closeLabel = toggleButtons.length && toggleButtons[0].dataset.wishlistCloseLabel
        ? toggleButtons[0].dataset.wishlistCloseLabel
        : themeStrings.closeWishlist;

      toggleButtons.forEach((button) => {
        button.setAttribute('aria-label', isOpen ? closeLabel : openLabel);
        button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    function openDrawer() {
      drawer.classList.add('active');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('wishlist-open');
      updateToggleLabels(true);
      if (panel) {
        panel.focus({ preventScroll: true });
      }
    }

    function closeDrawer() {
      drawer.classList.remove('active');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('wishlist-open');
      updateToggleLabels(false);
    }

    function buildDrawerItem(item) {
      const listItem = document.createElement('li');
      listItem.className = 'wishlist-item';
      listItem.dataset.wishlistKey = getItemKey(item);

      const media = document.createElement('div');
      media.className = 'wishlist-item__media';
      if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.title || '';
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

      const viewButton = document.createElement('button');
      viewButton.type = 'button';
      viewButton.className = 'button button--primary wishlist-item__view';
      viewButton.textContent = themeStrings.viewProduct;
      viewButton.addEventListener('click', () => {
        closeDrawer();
        if (item.url) {
          window.location.href = item.url;
        }
      });

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'button button--primary wishlist-item__remove';
      removeButton.textContent = themeStrings.removeFromWishlist;
      removeButton.addEventListener('click', () => {
        removeFromWishlist(getItemKey(item));
      });

      actions.appendChild(viewButton);
      actions.appendChild(removeButton);

      listItem.appendChild(media);
      listItem.appendChild(info);
      listItem.appendChild(actions);

      return listItem;
    }

    function renderDrawer() {
      itemsContainer.innerHTML = '';

      if (favorites.length === 0) {
        itemsContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
      }

      itemsContainer.classList.remove('hidden');
      emptyState.classList.add('hidden');

      favorites.forEach((item) => {
        itemsContainer.appendChild(buildDrawerItem(item));
      });
    }

    function updateButtonState(button, isActive) {
      const labelTarget = button.querySelector('[data-wishlist-label-target]');
      const addLabel = button.getAttribute('data-wishlist-add-label') || themeStrings.addToWishlist;
      const addedLabel = button.getAttribute('data-wishlist-added-label') || themeStrings.addedToWishlist;
      const label = isActive ? addedLabel : addLabel;

      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.setAttribute('aria-label', label);

      if (labelTarget) {
        labelTarget.textContent = label;
      }
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
      void button.offsetWidth;

      const animationClass = added ? 'wishlist-button--just-added' : 'wishlist-button--just-removed';
      button.classList.add(animationClass);

      const duration = added ? 700 : 400;
      button._wishlistAnimationTimeout = window.setTimeout(() => {
        button.classList.remove('wishlist-button--just-added', 'wishlist-button--just-removed');
        button._wishlistAnimationTimeout = null;
      }, duration);
    }

    function syncProductButtons() {
      document.querySelectorAll('[data-wishlist-button]').forEach((button) => {
        const key = button.getAttribute('data-variant-id') || button.getAttribute('data-product-id');
        const isActive = isInWishlist(key);
        const wasActive = button.classList.contains('is-active');

        updateButtonState(button, isActive);

        if (!button.classList.contains('wishlist-skip-sync-anim') && isActive !== wasActive) {
          playButtonAnimation(button, isActive);
        }

        button.classList.remove('wishlist-skip-sync-anim');
      });
    }

    function normalisePrice(rawPrice) {
      if (typeof rawPrice === 'number') {
        return rawPrice;
      }
      const parsed = parseInt(rawPrice, 10);
      if (Number.isNaN(parsed)) {
        return 0;
      }
      return parsed / 100;
    }

    function getProductDataFromButton(button) {
      return {
        id: button.getAttribute('data-product-id'),
        variantId: button.getAttribute('data-variant-id') || button.getAttribute('data-product-id'),
        title: button.getAttribute('data-product-title') || button.textContent.trim(),
        url: button.getAttribute('data-product-url') || '#',
        price: normalisePrice(button.getAttribute('data-product-price')),
        image: button.getAttribute('data-product-image') || '',
      };
    }

    function addToWishlist(item) {
      if (!item || !item.id) {
        return false;
      }
      const key = getItemKey(item);
      if (isInWishlist(key)) {
        return false;
      }
      favorites.push(item);
      persistFavorites();
      return true;
    }

    function removeFromWishlist(key) {
      const index = favorites.findIndex((item) => getItemKey(item) === String(key));
      if (index === -1) {
        return false;
      }

      const listItem = itemsContainer.querySelector(`[data-wishlist-key="${CSS.escape(String(key))}"]`);
      if (listItem) {
        listItem.classList.add('wishlist-item--removing');
        const removeNode = () => {
          listItem.removeEventListener('transitionend', removeNode);
          if (listItem.parentNode) {
            listItem.parentNode.removeChild(listItem);
          }
        };
        listItem.addEventListener('transitionend', removeNode);
        window.setTimeout(removeNode, 400);
      }

      favorites.splice(index, 1);
      persistFavorites();
      updateHeaderCount();
      renderDrawer();
      syncProductButtons();
      return true;
    }

    function toggleFavorite(item) {
      const key = getItemKey(item);
      const existingIndex = favorites.findIndex((favorite) => getItemKey(favorite) === key);
      let added;

      if (existingIndex > -1) {
        favorites.splice(existingIndex, 1);
        added = false;
      } else {
        favorites.push(item);
        added = true;
      }

      persistFavorites();
      updateHeaderCount();
      renderDrawer();
      syncProductButtons();

      return added;
    }

    function bindProductButton(button) {
      if (button._wishlistBound) {
        return;
      }

      button.addEventListener('click', (event) => {
        event.preventDefault();
        const product = getProductDataFromButton(button);
        const added = toggleFavorite(product);
        button.classList.add('wishlist-skip-sync-anim');
        playButtonAnimation(button, added);
      });

      button._wishlistBound = true;
    }

    function bindProductButtons() {
      document.querySelectorAll('[data-wishlist-button]').forEach(bindProductButton);
    }

    function bindToggleButtons() {
      toggleButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          if (drawer.classList.contains('active')) {
            closeDrawer();
          } else {
            renderDrawer();
            openDrawer();
          }
        });
      });
    }

    function bindCloseTriggers() {
      closeTriggers.forEach((trigger) => {
        trigger.addEventListener('click', (event) => {
          if (trigger.tagName !== 'A') {
            event.preventDefault();
          }
          closeDrawer();
        });
      });
    }

    function handleDocumentKeydown(event) {
      if (event.key === 'Escape' && drawer.classList.contains('active')) {
        closeDrawer();
      }
    }

    function observeProductGrid() {
      const observer = new MutationObserver((mutations) => {
        let shouldRebind = false;
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) {
              return;
            }
            if (node.matches && node.matches('[data-wishlist-button]')) {
              shouldRebind = true;
            } else if (node.querySelector && node.querySelector('[data-wishlist-button]')) {
              shouldRebind = true;
            }
          });
        });
        if (shouldRebind) {
          bindProductButtons();
          syncProductButtons();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener('keydown', handleDocumentKeydown);

    bindToggleButtons();
    bindCloseTriggers();
    bindProductButtons();
    observeProductGrid();

    updateHeaderCount();
    renderDrawer();
    syncProductButtons();

    updateToggleLabels(false);

    window.Wishlist = Object.assign({}, window.Wishlist || {}, {
      add(item) {
        const normalized = Object.assign({}, item, {
          price: typeof item.price === 'number' ? item.price : normalisePrice(item.price),
          variantId: item.variantId || item.id,
        });
        const added = addToWishlist(normalized);
        if (added) {
          updateHeaderCount();
          renderDrawer();
          syncProductButtons();
        }
        return added;
      },
      remove(key) {
        return removeFromWishlist(key);
      },
      list() {
        return favorites.slice();
      },
      open: openDrawer,
      close: closeDrawer,
      toggle(item) {
        return toggleFavorite(item);
      },
    });
  });
})();
