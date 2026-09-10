// ==========================================================================
// NovaLearn - Plataforma Moderna de Cursos Online
// Lógica de Carrito, Búsqueda, Filtros, Persistencia y Temas
// Versión 2.2.0 (Failsafe & Cache-Busted)
// ==========================================================================

(function() {
  'use strict';

  // Variables de Estado
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem("novalearn_cart")) || [];
    if (!Array.isArray(cart)) cart = [];
  } catch (e) {
    cart = [];
  }

  let appliedDiscount = 0;
  let activeCoupon = "";
  let currentCategory = "todos";
  let searchQuery = "";

  // Referencias a elementos
  let coursesContainer, cartBackdrop, cartDrawer, openCartBtn, closeCartBtn;
  let cartItemsContainer, cartEmptyView, cartFooter, cartBadge, cartItemsCountHeader;
  let subtotalEl, discountRow, discountAmountEl, totalAmountEl, clearCartBtn, checkoutBtn;
  let couponInput, applyCouponBtn, searchInput, searchForm, filterPills, themeToggleBtn;
  let toastContainer, quickViewModal, checkoutModal;

  // Inicialización principal
  function initApp() {
    console.log("Iniciando NovaLearn App v2.2.0...");

    coursesContainer = document.getElementById("courses-grid");
    cartBackdrop = document.getElementById("cart-backdrop");
    cartDrawer = document.getElementById("cart-drawer");
    openCartBtn = document.getElementById("open-cart-btn");
    closeCartBtn = document.getElementById("close-cart-btn");
    cartItemsContainer = document.getElementById("cart-items");
    cartEmptyView = document.getElementById("cart-empty");
    cartFooter = document.getElementById("cart-footer");
    cartBadge = document.getElementById("cart-badge");
    cartItemsCountHeader = document.getElementById("cart-items-count-header");
    subtotalEl = document.getElementById("cart-subtotal");
    discountRow = document.getElementById("discount-row");
    discountAmountEl = document.getElementById("discount-amount");
    totalAmountEl = document.getElementById("cart-total");
    clearCartBtn = document.getElementById("clear-cart-btn");
    checkoutBtn = document.getElementById("checkout-btn");
    couponInput = document.getElementById("coupon-input");
    applyCouponBtn = document.getElementById("apply-coupon-btn");
    searchInput = document.getElementById("buscador");
    searchForm = document.getElementById("busqueda");
    filterPills = document.querySelectorAll(".filter-btn");
    themeToggleBtn = document.getElementById("theme-toggle-btn");
    toastContainer = document.getElementById("toast-container");
    quickViewModal = document.getElementById("quick-view-modal");
    checkoutModal = document.getElementById("checkout-modal");

    initTheme();
    renderCourses();
    updateCartUI();
    setupEventListeners();
  }

  // ==========================================================================
  // Renderizado del Catálogo de Cursos
  // ==========================================================================
  function renderCourses() {
    if (!coursesContainer) return;

    const data = (typeof COURSES_DATA !== "undefined" && Array.isArray(COURSES_DATA)) 
      ? COURSES_DATA 
      : [];

    if (data.length === 0) {
      coursesContainer.innerHTML = `<p style="text-align: center; grid-column: 1/-1;">Cargando catálogo de cursos...</p>`;
      return;
    }

    const filtered = data.filter(course => {
      const matchCategory = currentCategory === "todos" || course.categoria === currentCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch = !query || 
        (course.titulo && course.titulo.toLowerCase().includes(query)) ||
        (course.instructor && course.instructor.toLowerCase().includes(query)) ||
        (course.descripcion && course.descripcion.toLowerCase().includes(query));
      return matchCategory && matchSearch;
    });

    if (filtered.length === 0) {
      coursesContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-secondary);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3 style="font-size: 1.3rem; color: var(--text-primary); margin-bottom: 0.5rem;">No se encontraron resultados para "${escapeHTML(searchQuery)}"</h3>
          <p>Prueba buscando con otros términos o selecciona otra categoría.</p>
          <button id="reset-filters-btn" class="filter-btn active" style="margin-top: 1.5rem; display: inline-block;">Ver todos los cursos</button>
        </div>
      `;
      const resetBtn = document.getElementById("reset-filters-btn");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          searchQuery = "";
          currentCategory = "todos";
          if (searchInput) searchInput.value = "";
          filterPills.forEach(btn => btn.classList.toggle("active", btn.dataset.category === "todos"));
          renderCourses();
        });
      }
      return;
    }

    coursesContainer.innerHTML = filtered.map(course => {
      const isBestseller = course.badge && course.badge.toLowerCase().includes("bestseller");
      const isTop = course.badge && course.badge.toLowerCase().includes("top");
      const badgeClass = isBestseller ? "bestseller" : (isTop ? "top-ventas" : "");

      return `
        <article class="course-card" data-id="${course.id}">
          <div class="card-media">
            <img src="${course.imagen}" alt="${escapeHTML(course.titulo)}" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=85';">
            <span class="badge-tag ${badgeClass}">${course.badge || 'Curso'}</span>
            <button class="card-quick-view" data-quick-id="${course.id}">Vista rápida</button>
          </div>
          <div class="card-body">
            <div class="card-category">${getCategoryName(course.categoria)}</div>
            <h3 class="card-title" title="${escapeHTML(course.titulo)}">${escapeHTML(course.titulo)}</h3>
            <div class="card-instructor">
              <img src="${course.avatar}" alt="${escapeHTML(course.instructor)}" class="instructor-avatar">
              <span class="instructor-name">${escapeHTML(course.instructor)}</span>
            </div>
            <div class="card-meta">
              <div class="rating-box">
                <span>${(course.rating || 4.8).toFixed(1)}</span>
                <div class="rating-stars">
                  ${getStarsSVG(course.rating || 5)}
                </div>
                <span class="reviews-count">(${course.reviews || 1200})</span>
              </div>
              <span class="course-duration">${course.duracion || '30 horas'}</span>
            </div>
            <div class="card-footer">
              <div class="pricing">
                <span class="current-price">$${course.precioOferta}</span>
                <span class="original-price">$${course.precioOriginal}</span>
              </div>
              <button class="btn-add-cart" data-id="${course.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                Agregar
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function getCategoryName(cat) {
    const map = {
      desarrollo: "Desarrollo & IA",
      diseno: "Diseño & UX",
      musica: "Música & Audio",
      negocios: "Negocios & Finanzas",
      "estilo-vida": "Estilo de Vida & Salud"
    };
    return map[cat] || cat || "General";
  }

  function getStarsSVG(rating) {
    let stars = "";
    for (let i = 1; i <= 5; i++) {
      stars += `
        <svg viewBox="0 0 24 24">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      `;
    }
    return stars;
  }

  function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // ==========================================================================
  // Operaciones del Carrito
  // ==========================================================================
  function addToCart(courseId) {
    const data = (typeof COURSES_DATA !== "undefined" && Array.isArray(COURSES_DATA)) ? COURSES_DATA : [];
    const course = data.find(c => c.id === courseId);
    if (!course) return;

    const existingIndex = cart.findIndex(item => item.id === courseId);

    if (existingIndex > -1) {
      cart[existingIndex].cantidad += 1;
      showToast("Cantidad aumentada", `Tienes ${cart[existingIndex].cantidad} unidades de "${course.titulo}"`, "info");
    } else {
      cart.push({
        id: course.id,
        titulo: course.titulo,
        imagen: course.imagen,
        precio: course.precioOferta,
        categoria: getCategoryName(course.categoria),
        cantidad: 1
      });
      showToast("¡Curso agregado!", `"${course.titulo}" añadido a tu carrito`, "success");
    }

    saveCart();
    updateCartUI();
    triggerCartBadgeBump();
  }

  function updateItemQuantity(courseId, delta) {
    const itemIndex = cart.findIndex(item => item.id === courseId);
    if (itemIndex === -1) return;

    cart[itemIndex].cantidad += delta;

    if (cart[itemIndex].cantidad <= 0) {
      const removedTitle = cart[itemIndex].titulo;
      cart.splice(itemIndex, 1);
      showToast("Curso removido", `"${removedTitle}" eliminado del carrito`, "warning");
    }

    saveCart();
    updateCartUI();
  }

  function removeFromCart(courseId) {
    const item = cart.find(c => c.id === courseId);
    if (item) {
      const removedTitle = item.titulo;
      cart = cart.filter(c => c.id !== courseId);
      saveCart();
      updateCartUI();
      showToast("Curso removido", `"${removedTitle}" se quitó de tu carrito`, "warning");
    }
  }

  function clearCart() {
    if (cart.length === 0) return;
    if (confirm("¿Estás seguro de que deseas vaciar tu carrito de compras?")) {
      cart = [];
      appliedDiscount = 0;
      activeCoupon = "";
      saveCart();
      updateCartUI();
      showToast("Carrito vaciado", "Todos los cursos fueron removidos", "info");
    }
  }

  function saveCart() {
    try {
      localStorage.setItem("novalearn_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("Error guardando carrito:", e);
    }
  }

  function updateCartUI() {
    const totalItems = cart.reduce((acc, item) => acc + item.cantidad, 0);

    if (cartBadge) {
      cartBadge.textContent = totalItems;
      cartBadge.style.display = totalItems > 0 ? "flex" : "none";
    }

    if (cartItemsCountHeader) {
      cartItemsCountHeader.textContent = `${totalItems} ${totalItems === 1 ? 'curso' : 'cursos'}`;
    }

    if (cart.length === 0) {
      if (cartEmptyView) cartEmptyView.style.display = "flex";
      if (cartItemsContainer) cartItemsContainer.style.display = "none";
      if (cartFooter) cartFooter.style.display = "none";
      return;
    }

    if (cartEmptyView) cartEmptyView.style.display = "none";
    if (cartItemsContainer) cartItemsContainer.style.display = "flex";
    if (cartFooter) cartFooter.style.display = "flex";

    if (cartItemsContainer) {
      cartItemsContainer.innerHTML = cart.map(item => {
        const itemSubtotal = (item.precio * item.cantidad).toFixed(2);
        return `
          <div class="cart-item" data-cart-id="${item.id}">
            <img src="${item.imagen}" alt="${escapeHTML(item.titulo)}" class="cart-item-img">
            <div class="cart-item-info">
              <h4 class="cart-item-title" title="${escapeHTML(item.titulo)}">${escapeHTML(item.titulo)}</h4>
              <div class="cart-item-price">$${item.precio} c/u</div>
              <div class="cart-item-bottom">
                <div class="quantity-control">
                  <button class="qty-btn btn-qty-minus" data-id="${item.id}" title="Disminuir">−</button>
                  <span class="qty-display">${item.cantidad}</span>
                  <button class="qty-btn btn-qty-plus" data-id="${item.id}" title="Aumentar">+</button>
                </div>
                <span class="cart-item-subtotal">$${itemSubtotal}</span>
              </div>
            </div>
            <button class="btn-remove-item" data-id="${item.id}" title="Eliminar curso">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        `;
      }).join("");
    }

    const subtotal = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const discountAmount = subtotal * appliedDiscount;
    const finalTotal = subtotal - discountAmount;

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;

    if (appliedDiscount > 0) {
      if (discountRow) discountRow.style.display = "flex";
      if (discountAmountEl) discountAmountEl.textContent = `-$${discountAmount.toFixed(2)} (${appliedDiscount * 100}%)`;
    } else {
      if (discountRow) discountRow.style.display = "none";
    }

    if (totalAmountEl) totalAmountEl.textContent = `$${finalTotal.toFixed(2)}`;
  }

  function triggerCartBadgeBump() {
    if (!cartBadge) return;
    cartBadge.classList.add("bump");
    setTimeout(() => cartBadge.classList.remove("bump"), 300);
  }

  // ==========================================================================
  // Cupones de Descuento
  // ==========================================================================
  function applyCoupon() {
    const code = couponInput ? couponInput.value.trim().toUpperCase() : "";
    if (!code) return;

    if (code === "NOVA20" || code === "NOVAPROMO") {
      appliedDiscount = 0.20;
      activeCoupon = code;
      showToast("¡Cupón Aplicado!", "Obtuviste un 20% de descuento en tu compra", "success");
      updateCartUI();
    } else if (code === "ESTUDIANTE" || code === "PROMO10") {
      appliedDiscount = 0.10;
      activeCoupon = code;
      showToast("¡Cupón Aplicado!", "Obtuviste un 10% de descuento especial", "success");
      updateCartUI();
    } else {
      showToast("Cupón Inválido", "El código ingresado no existe o ha expirado", "warning");
    }
  }

  // ==========================================================================
  // Modales y Toasts
  // ==========================================================================
  function openQuickView(courseId) {
    const data = (typeof COURSES_DATA !== "undefined" && Array.isArray(COURSES_DATA)) ? COURSES_DATA : [];
    const course = data.find(c => c.id === courseId);
    if (!course || !quickViewModal) return;

    const modalBody = quickViewModal.querySelector(".modal-body-content");
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div style="position: relative; border-radius: var(--radius-md); overflow: hidden; aspect-ratio: 16/9;">
          <img src="${course.imagen}" alt="${escapeHTML(course.titulo)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=85';">
          <span class="badge-tag bestseller" style="position: absolute; top: 12px; left: 12px;">${course.badge || 'Destacado'}</span>
        </div>
        <div>
          <span style="font-size: 0.8rem; text-transform: uppercase; color: var(--primary); font-weight: 700;">${getCategoryName(course.categoria)}</span>
          <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0.4rem 0 0.8rem;">${escapeHTML(course.titulo)}</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6;">${escapeHTML(course.descripcion)}</p>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md);">
          <div>
            <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Instructor</span>
            <strong style="font-size: 0.95rem;">${escapeHTML(course.instructor)}</strong>
          </div>
          <div>
            <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Duración</span>
            <strong style="font-size: 0.95rem;">${course.duracion} (${course.nivel})</strong>
          </div>
          <div>
            <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Calificación</span>
            <strong style="font-size: 0.95rem; color: var(--accent-amber);">★ ${course.rating} (${course.reviews} reseñas)</strong>
          </div>
          <div>
            <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Estudiantes</span>
            <strong style="font-size: 0.95rem;">${(course.estudiantes || 1000).toLocaleString()} inscritos</strong>
          </div>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 1.25rem;">
          <div>
            <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Precio con descuento</span>
            <div class="pricing">
              <span class="current-price" style="font-size: 1.8rem;">$${course.precioOferta}</span>
              <span class="original-price">$${course.precioOriginal}</span>
            </div>
          </div>
          <button class="btn-add-cart modal-add-btn" data-id="${course.id}" style="padding: 0.8rem 1.8rem; font-size: 0.95rem;">
            Añadir al Carrito
          </button>
        </div>
      </div>
    `;

    quickViewModal.classList.add("open");
  }

  function openCheckoutModal() {
    if (cart.length === 0) {
      showToast("Carrito vacío", "Agrega al menos un curso antes de proceder al pago", "warning");
      return;
    }

    if (!checkoutModal) return;

    const subtotal = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const discountAmount = subtotal * appliedDiscount;
    const finalTotal = subtotal - discountAmount;
    const totalItems = cart.reduce((acc, item) => acc + item.cantidad, 0);

    const checkoutSummary = checkoutModal.querySelector("#checkout-order-summary");
    if (checkoutSummary) {
      checkoutSummary.innerHTML = `
        <div style="background: var(--bg-surface-elevated); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
            <span>Total de Cursos seleccionados:</span>
            <strong>${totalItems} unidades</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
            <span>Subtotal:</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          ${appliedDiscount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--accent-emerald);">
              <span>Descuento aplicado:</span>
              <span>-$${discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 1.25rem; font-weight: 800; border-top: 1px dashed var(--border-subtle); padding-top: 0.75rem; margin-top: 0.5rem;">
            <span>Total a pagar:</span>
            <span style="color: var(--primary);">$${finalTotal.toFixed(2)}</span>
          </div>
        </div>
      `;
    }

    checkoutModal.classList.add("open");
    closeCart();
  }

  function completeOrder(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById("confirm-payment-btn");
    if (btn) {
      btn.textContent = "Procesando pago seguro...";
      btn.disabled = true;
    }

    setTimeout(() => {
      if (btn) btn.textContent = "¡Pago Exitoso!";
      showToast("¡Compra Exitosa!", "Tus credenciales de acceso fueron enviadas a tu correo", "success");
      
      cart = [];
      appliedDiscount = 0;
      activeCoupon = "";
      saveCart();
      updateCartUI();

      setTimeout(() => {
        if (checkoutModal) checkoutModal.classList.remove("open");
        if (btn) {
          btn.textContent = "Confirmar y Pagar Ahora";
          btn.disabled = false;
        }
      }, 1500);
    }, 1200);
  }

  function showToast(title, message, type = "info") {
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const iconMap = {
      success: "✨",
      info: "💡",
      warning: "⚠️"
    };

    toast.innerHTML = `
      <span class="toast-icon">${iconMap[type] || '🔔'}</span>
      <div class="toast-content">
        <h5>${escapeHTML(title)}</h5>
        <p>${escapeHTML(message)}</p>
      </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function openCart() {
    if (cartBackdrop) cartBackdrop.classList.add("open");
  }

  function closeCart() {
    if (cartBackdrop) cartBackdrop.classList.remove("open");
  }

  // ==========================================================================
  // Modo Oscuro / Claro
  // ==========================================================================
  let isTogglingTheme = false;

  function initTheme() {
    const savedTheme = localStorage.getItem("novalearn_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (document.body) {
      document.body.classList.toggle("light-theme", savedTheme === "light");
    }
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    if (isTogglingTheme) return;
    isTogglingTheme = true;
    setTimeout(() => { isTogglingTheme = false; }, 350);

    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    
    document.documentElement.setAttribute("data-theme", newTheme);
    if (document.body) {
      document.body.classList.toggle("light-theme", newTheme === "light");
    }

    try {
      localStorage.setItem("novalearn_theme", newTheme);
    } catch(e) {}

    updateThemeIcon(newTheme);
    showToast("Tema actualizado", `Modo ${newTheme === 'dark' ? 'Oscuro' : 'Claro'} activado`, "info");
  }

  function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    themeToggleBtn.style.transform = "scale(0.85) rotate(180deg)";
    setTimeout(() => {
      if (theme === "light") {
        themeToggleBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        `;
        themeToggleBtn.title = "Cambiar a Modo Oscuro";
      } else {
        themeToggleBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        `;
        themeToggleBtn.title = "Cambiar a Modo Claro";
      }
      themeToggleBtn.style.transform = "scale(1) rotate(0deg)";
    }, 150);
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================
  function setupEventListeners() {
    // Abrir y cerrar Carrito
    if (openCartBtn) openCartBtn.addEventListener("click", openCart);
    if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
    if (cartBackdrop) {
      cartBackdrop.addEventListener("click", (e) => {
        if (e.target === cartBackdrop) closeCart();
      });
    }

    // Toggle de tema
    if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);

    // Event delegation para catálogo de cursos
    if (coursesContainer) {
      coursesContainer.addEventListener("click", (e) => {
        const addBtn = e.target.closest(".btn-add-cart");
        if (addBtn) {
          e.preventDefault();
          addToCart(addBtn.dataset.id);
          return;
        }

        const quickBtn = e.target.closest(".card-quick-view");
        if (quickBtn) {
          e.preventDefault();
          openQuickView(quickBtn.dataset.quickId);
          return;
        }
      });
    }

    // Event delegation para el Carrito (incrementar, decrementar, eliminar)
    if (cartItemsContainer) {
      cartItemsContainer.addEventListener("click", (e) => {
        const plusBtn = e.target.closest(".btn-qty-plus");
        if (plusBtn) {
          updateItemQuantity(plusBtn.dataset.id, 1);
          return;
        }

        const minusBtn = e.target.closest(".btn-qty-minus");
        if (minusBtn) {
          updateItemQuantity(minusBtn.dataset.id, -1);
          return;
        }

        const removeBtn = e.target.closest(".btn-remove-item");
        if (removeBtn) {
          removeFromCart(removeBtn.dataset.id);
          return;
        }
      });
    }

    // Botones del carrito
    if (clearCartBtn) clearCartBtn.addEventListener("click", clearCart);
    if (checkoutBtn) checkoutBtn.addEventListener("click", openCheckoutModal);

    // Formulario de pago simulado
    const checkoutForm = document.getElementById("checkout-form");
    if (checkoutForm) checkoutForm.addEventListener("submit", completeOrder);

    // Cupones
    if (applyCouponBtn) applyCouponBtn.addEventListener("click", applyCoupon);
    if (couponInput) {
      couponInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          applyCoupon();
        }
      });
    }

    // Búsqueda en tiempo real (input + keyup)
    function handleSearch(val) {
      searchQuery = val.trim();
      renderCourses();
    }

    if (searchInput) {
      searchInput.addEventListener("input", (e) => handleSearch(e.target.value));
      searchInput.addEventListener("keyup", (e) => handleSearch(e.target.value));
    }

    if (searchForm) {
      searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (searchInput) handleSearch(searchInput.value);
        const catalogSection = document.getElementById("catalogo");
        if (catalogSection) {
          catalogSection.scrollIntoView({ behavior: "smooth" });
        }
      });
    }

    // Filtros de categoría (Pills)
    filterPills.forEach(pill => {
      pill.addEventListener("click", () => {
        filterPills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        currentCategory = pill.dataset.category;
        renderCourses();
        const catalogSection = document.getElementById("catalogo");
        if (catalogSection) {
          catalogSection.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

    // Cerrar modales con botones de cerrar o backdrop
    document.querySelectorAll(".modal-backdrop").forEach(modal => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.closest(".modal-close-btn")) {
          modal.classList.remove("open");
        }
      });
    });

    // Delegación para botón de añadir dentro del Quick View Modal
    if (quickViewModal) {
      quickViewModal.addEventListener("click", (e) => {
        const addBtn = e.target.closest(".modal-add-btn");
        if (addBtn) {
          addToCart(addBtn.dataset.id);
          quickViewModal.classList.remove("open");
        }
      });
    }

    // Cerrar con Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeCart();
        if (quickViewModal) quickViewModal.classList.remove("open");
        if (checkoutModal) checkoutModal.classList.remove("open");
      }
    });
  }

  function filterByCategory(category, btnElement) {
    currentCategory = category || "todos";
    if (filterPills && filterPills.length > 0) {
      filterPills.forEach(p => p.classList.remove("active"));
    }
    if (btnElement) {
      btnElement.classList.add("active");
    }
    renderCourses();
    const catalogSection = document.getElementById("catalogo");
    if (catalogSection) {
      catalogSection.scrollIntoView({ behavior: "smooth" });
    }
  }

  // Exponer métodos globales para acceso directo / fallbacks en línea
  window.NovaLearn = {
    toggleTheme,
    openCart,
    closeCart,
    addToCart,
    clearCart,
    applyCoupon,
    renderCourses,
    filterByCategory
  };

  // Autoejecución inmediata si el DOM ya está listo (evita que se congele si DOMContentLoaded ya ocurrió)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();
