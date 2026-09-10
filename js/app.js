// ==========================================================================
// NovaLearn - Plataforma Moderna de Cursos Online
// Lógica de Carrito, Búsqueda, Filtros y Persistencia
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Estado de la Aplicación
  let cart = JSON.parse(localStorage.getItem("novalearn_cart")) || [];
  let appliedDiscount = 0; // Porcentaje de descuento (0 a 1)
  let activeCoupon = "";
  let currentCategory = "todos";
  let searchQuery = "";

  // Elementos del DOM
  const coursesContainer = document.getElementById("courses-grid");
  const cartBackdrop = document.getElementById("cart-backdrop");
  const cartDrawer = document.getElementById("cart-drawer");
  const openCartBtn = document.getElementById("open-cart-btn");
  const closeCartBtn = document.getElementById("close-cart-btn");
  const cartItemsContainer = document.getElementById("cart-items");
  const cartEmptyView = document.getElementById("cart-empty");
  const cartFooter = document.getElementById("cart-footer");
  const cartBadge = document.getElementById("cart-badge");
  const cartItemsCountHeader = document.getElementById("cart-items-count-header");
  const subtotalEl = document.getElementById("cart-subtotal");
  const discountRow = document.getElementById("discount-row");
  const discountAmountEl = document.getElementById("discount-amount");
  const totalAmountEl = document.getElementById("cart-total");
  const clearCartBtn = document.getElementById("clear-cart-btn");
  const checkoutBtn = document.getElementById("checkout-btn");
  const couponInput = document.getElementById("coupon-input");
  const applyCouponBtn = document.getElementById("apply-coupon-btn");
  const searchInput = document.getElementById("buscador");
  const searchForm = document.getElementById("busqueda");
  const filterPills = document.querySelectorAll(".filter-btn");
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const toastContainer = document.getElementById("toast-container");
  const quickViewModal = document.getElementById("quick-view-modal");
  const checkoutModal = document.getElementById("checkout-modal");

  // Iniciar la plataforma
  initTheme();
  renderCourses();
  updateCartUI();
  setupEventListeners();

  // ==========================================================================
  // Renderizado del Catálogo de Cursos
  // ==========================================================================
  function renderCourses() {
    if (!coursesContainer) return;

    // Filtrado por categoría y búsqueda
    const filteredCourses = COURSES_DATA.filter(course => {
      const matchCategory = currentCategory === "todos" || course.categoria === currentCategory;
      const matchSearch = searchQuery === "" || 
        course.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });

    if (filteredCourses.length === 0) {
      coursesContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-secondary);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3 style="font-size: 1.3rem; color: var(--text-primary); margin-bottom: 0.5rem;">No encontramos cursos que coincidan</h3>
          <p>Prueba buscando con otros términos o seleccionando otra categoría.</p>
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

    coursesContainer.innerHTML = filteredCourses.map(course => {
      const isBestseller = course.badge.toLowerCase().includes("bestseller");
      const isTop = course.badge.toLowerCase().includes("top");
      const badgeClass = isBestseller ? "bestseller" : (isTop ? "top-ventas" : "");

      return `
        <article class="course-card" data-id="${course.id}">
          <div class="card-media">
            <img src="${course.imagen}" alt="${course.titulo}" loading="lazy">
            <span class="badge-tag ${badgeClass}">${course.badge}</span>
            <button class="card-quick-view" data-quick-id="${course.id}">Vista rápida</button>
          </div>
          <div class="card-body">
            <div class="card-category">${getCategoryName(course.categoria)}</div>
            <h3 class="card-title" title="${course.titulo}">${course.titulo}</h3>
            <div class="card-instructor">
              <img src="${course.avatar}" alt="${course.instructor}" class="instructor-avatar">
              <span class="instructor-name">${course.instructor}</span>
            </div>
            <div class="card-meta">
              <div class="rating-box">
                <span>${course.rating.toFixed(1)}</span>
                <div class="rating-stars">
                  ${getStarsSVG(course.rating)}
                </div>
                <span class="reviews-count">(${course.reviews})</span>
              </div>
              <span class="course-duration">${course.duracion}</span>
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
      diseno: "Diseño & Creatividad",
      musica: "Música & Audio",
      negocios: "Negocios & Finanzas",
      "estilo-vida": "Estilo de Vida & Salud"
    };
    return map[cat] || cat;
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

  // ==========================================================================
  // Operaciones del Carrito de Compras
  // ==========================================================================
  function addToCart(courseId) {
    const course = COURSES_DATA.find(c => c.id === courseId);
    if (!course) return;

    const existingIndex = cart.findIndex(item => item.id === courseId);

    if (existingIndex > -1) {
      // Incrementar cantidad si ya existe
      cart[existingIndex].cantidad += 1;
      showToast("Cantidad aumentada", `Ahora tienes ${cart[existingIndex].cantidad} accesos de "${course.titulo}"`, "info");
    } else {
      // Añadir nuevo curso con cantidad 1
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
      // Si la cantidad llega a 0, se elimina
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
    localStorage.setItem("novalearn_cart", JSON.stringify(cart));
  }

  function updateCartUI() {
    // 1. Total de ítems (suma de todas las cantidades)
    const totalItems = cart.reduce((acc, item) => acc + item.cantidad, 0);

    // 2. Actualizar badges en Header
    if (cartBadge) {
      cartBadge.textContent = totalItems;
      cartBadge.style.display = totalItems > 0 ? "flex" : "none";
    }

    if (cartItemsCountHeader) {
      cartItemsCountHeader.textContent = `${totalItems} ${totalItems === 1 ? 'curso' : 'cursos'}`;
    }

    // 3. Vista vacía vs vista con cursos
    if (cart.length === 0) {
      if (cartEmptyView) cartEmptyView.style.display = "flex";
      if (cartItemsContainer) cartItemsContainer.style.display = "none";
      if (cartFooter) cartFooter.style.display = "none";
      return;
    }

    if (cartEmptyView) cartEmptyView.style.display = "none";
    if (cartItemsContainer) cartItemsContainer.style.display = "flex";
    if (cartFooter) cartFooter.style.display = "flex";

    // 4. Renderizar ítems del carrito
    cartItemsContainer.innerHTML = cart.map(item => {
      const itemSubtotal = (item.precio * item.cantidad).toFixed(2);
      return `
        <div class="cart-item" data-cart-id="${item.id}">
          <img src="${item.imagen}" alt="${item.titulo}" class="cart-item-img">
          <div class="cart-item-info">
            <h4 class="cart-item-title" title="${item.titulo}">${item.titulo}</h4>
            <div class="cart-item-price">$${item.precio} c/u</div>
            <div class="cart-item-bottom">
              <div class="quantity-control">
                <button class="qty-btn btn-qty-minus" data-id="${item.id}" title="Disminuir cantidad">−</button>
                <span class="qty-display">${item.cantidad}</span>
                <button class="qty-btn btn-qty-plus" data-id="${item.id}" title="Aumentar cantidad">+</button>
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

    // 5. Cálculos de subtotales y totales
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
  // Ventanas Modales & Toasts
  // ==========================================================================
  function openQuickView(courseId) {
    const course = COURSES_DATA.find(c => c.id === courseId);
    if (!course || !quickViewModal) return;

    const modalBody = quickViewModal.querySelector(".modal-body-content");
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div style="position: relative; border-radius: var(--radius-md); overflow: hidden; aspect-ratio: 16/9;">
          <img src="${course.imagen}" alt="${course.titulo}" style="width: 100%; height: 100%; object-fit: cover;">
          <span class="badge-tag bestseller" style="position: absolute; top: 12px; left: 12px;">${course.badge}</span>
        </div>
        <div>
          <span style="font-size: 0.8rem; text-transform: uppercase; color: var(--primary); font-weight: 700;">${getCategoryName(course.categoria)}</span>
          <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0.4rem 0 0.8rem;">${course.titulo}</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6;">${course.descripcion}</p>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md);">
          <div>
            <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Instructor</span>
            <strong style="font-size: 0.95rem;">${course.instructor}</strong>
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
            <strong style="font-size: 0.95rem;">${course.estudiantes.toLocaleString()} inscritos</strong>
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
    // cerrar drawer si estaba abierto
    closeCart();
  }

  function completeOrder(e) {
    e.preventDefault();
    const btn = document.getElementById("confirm-payment-btn");
    if (btn) {
      btn.textContent = "Procesando pago seguro...";
      btn.disabled = true;
    }

    setTimeout(() => {
      if (btn) {
        btn.textContent = "¡Pago Exitoso!";
      }
      showToast("¡Compra Exitosa!", "Tus credenciales de acceso fueron enviadas a tu correo", "success");
      
      // Limpiar carrito
      cart = [];
      appliedDiscount = 0;
      activeCoupon = "";
      saveCart();
      updateCartUI();

      setTimeout(() => {
        if (checkoutModal) checkoutModal.classList.remove("open");
        if (btn) {
          btn.textContent = "Pagar Ahora";
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
        <h5>${title}</h5>
        <p>${message}</p>
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
  function initTheme() {
    const savedTheme = localStorage.getItem("novalearn_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("novalearn_theme", newTheme);
    updateThemeIcon(newTheme);
    showToast("Tema actualizado", `Modo ${newTheme === 'dark' ? 'Oscuro' : 'Claro'} activado`, "info");
  }

  function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
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

    // Event delegation para el catálogo de cursos
    if (coursesContainer) {
      coursesContainer.addEventListener("click", (e) => {
        const addBtn = e.target.closest(".btn-add-cart");
        if (addBtn) {
          e.preventDefault();
          const courseId = addBtn.dataset.id;
          addToCart(courseId);
          return;
        }

        const quickBtn = e.target.closest(".card-quick-view");
        if (quickBtn) {
          e.preventDefault();
          const courseId = quickBtn.dataset.quickId;
          openQuickView(courseId);
          return;
        }
      });
    }

    // Event delegation para el Carrito (incrementar, decrementar, eliminar)
    if (cartItemsContainer) {
      cartItemsContainer.addEventListener("click", (e) => {
        // Incrementar
        const plusBtn = e.target.closest(".btn-qty-plus");
        if (plusBtn) {
          const id = plusBtn.dataset.id;
          updateItemQuantity(id, 1);
          return;
        }

        // Decrementar
        const minusBtn = e.target.closest(".btn-qty-minus");
        if (minusBtn) {
          const id = minusBtn.dataset.id;
          updateItemQuantity(id, -1);
          return;
        }

        // Eliminar
        const removeBtn = e.target.closest(".btn-remove-item");
        if (removeBtn) {
          const id = removeBtn.dataset.id;
          removeFromCart(id);
          return;
        }
      });
    }

    // Vaciar carrito
    if (clearCartBtn) clearCartBtn.addEventListener("click", clearCart);

    // Finalizar compra -> abrir checkout modal
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

    // Búsqueda en tiempo real
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.trim();
        renderCourses();
      });
    }

    if (searchForm) {
      searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        searchQuery = searchInput.value.trim();
        renderCourses();
        const catalogSection = document.getElementById("catalogo");
        if (catalogSection) catalogSection.scrollIntoView({ behavior: "smooth" });
      });
    }

    // Filtros de categoría (Pills)
    filterPills.forEach(pill => {
      pill.addEventListener("click", () => {
        filterPills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        currentCategory = pill.dataset.category;
        renderCourses();
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
          const id = addBtn.dataset.id;
          addToCart(id);
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
});
