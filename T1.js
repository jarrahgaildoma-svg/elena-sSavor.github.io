document.addEventListener('DOMContentLoaded', () => {
    // === ADMIN LOGIN & PRODUCT MANAGEMENT (NEW) ===
    let ADMIN_PASSWORD = localStorage.getItem('adminPassword') || "elena123";
    let isAdminLoggedIn = false;
    
    function initializeProducts() {
        if (!localStorage.getItem('elenaProducts')) {
            const defaultProducts = [
                { id: 'pizza-hawaiian', name: 'HAWAIIAN', category: 'pizza', price: 135.00, description: 'A classic sweet and savory combination of ham, pineapple, and creamy cheese.', image: 'hawaiian-pizza.jpg' },
                { id: 'pizza-beef-mushroom', name: 'BEEF AND MUSHROOM', category: 'pizza', price: 155.00, description: 'Rich beef toppings and fresh mushrooms on a homemade crust.', image: 'beef-mushroom-pizza.jpg' },
                { id: 'pizza-ham-cheese', name: 'HAM AND CHEESE', category: 'pizza', price: 125.00, description: 'Simple yet satisfying, loaded with diced ham and a triple layer of cheese.', image: 'ham-cheese-pizza.jpg' },
                { id: 'cake-custard', name: 'CUSTARD CAKE', category: 'cakes', price: 295.00, description: 'A creamy, rich custard cake that is freshly made. Available in different sizes.', image: 'classic-custard-cake.jpg' },
                { id: 'cake-cheesecake', name: 'CHEESECAKE', category: 'cakes', price: 195.00, description: 'Classic, decadent cheesecake perfect for any occasion. Available in different sizes.', image: 'cheese-cake.jpg' },
                { id: 'cake-ube-custard', name: 'UBE CUSTARD CAKE', category: 'cakes', price: 359.00, description: 'Sweet, vibrant ube layer combined with a classic custard base.', image: 'ube-custard-cake.jpg' },
                { id: 'cake-brazo', name: 'BRAZO DE MERCEDES', category: 'cakes', price: 450.00, description: 'Sweet meringue roll with a rich custard filling. Available in different sizes.', image: 'brazo-de-mercedes.jpg' },
                { id: 'pasta-lasagna', name: 'BEEF LASAGNA', category: 'pasta', price: 135.00, description: 'Layers of tender beef, pasta, and rich bechamel sauce.', image: 'beef-lasagna.jpg' },
                { id: 'pasta-baked-mac', name: 'BAKED MAC', category: 'pasta', price: 125.00, description: 'Creamy macaroni baked with a hearty meat sauce and topped with cheese.', image: 'baked-mac.jpg' },
            ];
            localStorage.setItem('elenaProducts', JSON.stringify(defaultProducts));
        }
    }
    
    function getProducts() {
        return JSON.parse(localStorage.getItem('elenaProducts')) || [];
    }
    
    function saveProducts(products) {
        localStorage.setItem('elenaProducts', JSON.stringify(products));
    }
    
    function refreshMenuDisplay() {
        const products = getProducts();
        const categories = ['pizza', 'cakes', 'pasta', 'promo', 'drinks', 'sides'];
        
        categories.forEach(category => {
            const tabContent = document.getElementById(category);
            if (!tabContent) return;
            
            const productGrid = tabContent.querySelector('.product-grid');
            if (!productGrid) return;
            
            const categoryProducts = products.filter(p => p.category === category);
            
            if (categoryProducts.length === 0) {
                productGrid.innerHTML = `<h3 style="text-align: center; color: white; padding: 50px; width: 100%;">${category.toUpperCase()} menu coming soon...</h3>`;
                return;
            }
            
            productGrid.innerHTML = categoryProducts.map(product => `
                <div class="product-card" data-product-id="${product.id}" data-price="${product.price}" data-name="${product.name}">
                    <img src="${product.image}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p class="description">${product.description}</p>
                    <div class="price-and-action">
                        <p class="price">₱${parseFloat(product.price).toFixed(2)}</p>
                        <button class="add-to-cart-btn">ADD</button>
                    </div>
                </div>
            `).join('');
        });
        
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.removeEventListener('click', addToCart);
            button.addEventListener('click', addToCart);
        });
    }
    
    const loginModal = document.getElementById('login-modal');
    const adminPanel = document.getElementById('admin-panel');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password-input');
    const loginError = document.getElementById('login-error');
    const closeButtons = document.querySelectorAll('.close-btn');
    
    adminLoginBtn.addEventListener('click', () => {
        if (isAdminLoggedIn) {
            // Reconcile messages in case they were saved in another tab and sync key exists
            try { reconcileMessagesFromSync(); } catch (e) { /* ignore */ }
            adminPanel.classList.remove('hidden');
            try { startAdminMessagePolling(); } catch (e) {}
            try {
                const msgs = getMessages() || [];
                const newCount = msgs.filter(m => m.status === 'new').length;
                if (msgs.length > 0) {
                    switchAdminTab('messages');
                } else if (newCount > 0) {
                    switchAdminTab('messages');
                } else {
                    switchAdminTab('products');
                }
            } catch (e) {}
        } else {
            loginModal.classList.remove('hidden');
        }
    });
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (passwordInput.value === ADMIN_PASSWORD) {
            isAdminLoggedIn = true;
            loginError.textContent = '';
            loginModal.classList.add('hidden');
            adminPanel.classList.remove('hidden');
            try { startAdminMessagePolling(); } catch (e) {}
            passwordInput.value = '';
            // Reconcile any sync data first so messages saved from Contact page are visible
            try { reconcileMessagesFromSync(); } catch (e) { /* ignore */ }
            // If there are any messages, open Messages tab on login so admin sees feedback immediately
            try {
                updateAdminMessageBadge();
                const messagesOnLogin = getMessages() || [];
                if (messagesOnLogin.length > 0) {
                    switchAdminTab('messages');
                } else {
                    switchAdminTab('products');
                }
            } catch (e) { /* ignore */ }
            // Ensure lists are rendered
            renderAdminProducts();
            renderAdminOrders();
            try { renderAdminMessages(); } catch (err) { /* no-op if not defined yet */ }
        } else {
            loginError.textContent = 'Incorrect password';
        }
    });
    
    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.target.closest('#login-modal')) {
                loginModal.classList.add('hidden');
                passwordInput.value = '';
                loginError.textContent = '';
            }
        });
    });

    // Delegate file-change events for image uploads (works even if per-input listeners miss)
    document.addEventListener('change', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('image-upload')) {
            handleImageUpload(e);
        }
    });
    
    window.closeAdminPanel = function() {
        adminPanel.classList.add('hidden');
        isAdminLoggedIn = false;
        try { stopAdminMessagePolling(); } catch (e) { /* ignore */ }
    };

    window.switchAdminTab = function(tab) {
        document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
        const target = document.getElementById(tab + '-tab');
        if (target) target.classList.add('active');
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector('.admin-tab-btn[data-tab="' + tab + '"]');
        if (btn) btn.classList.add('active');
        
        // Render content for the tab
        if (tab === 'products') {
            renderAdminProducts();
        } else if (tab === 'orders') {
            renderAdminOrders();
        } else if (tab === 'messages') {
            renderAdminMessages();
        }
    };

    // Ensure clicking the Messages or Orders tab always refreshes the corresponding list
    try {
        document.querySelectorAll('.admin-tab-btn').forEach(b => {
            b.addEventListener('click', function() {
                try {
                    if (!this.dataset) return;
                    if (this.dataset.tab === 'messages') {
                        try { renderAdminMessages(); } catch (e) {}
                    } else if (this.dataset.tab === 'orders') {
                        try { renderAdminOrders(); } catch (e) {}
                    }
                } catch (e) { /* ignore */ }
            });
        });
    } catch (e) { console.debug('admin tab click binder error', e); }
    
    // Password change functionality
    document.getElementById('change-password-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const messageEl = document.getElementById('password-message');
        
        if (currentPassword !== ADMIN_PASSWORD) {
            messageEl.textContent = 'Current password is incorrect!';
            messageEl.style.color = '#ff0000';
            return;
        }
        
        if (newPassword !== confirmPassword) {
            messageEl.textContent = 'New passwords do not match!';
            messageEl.style.color = '#ff0000';
            return;
        }
        
        if (newPassword.length < 4) {
            messageEl.textContent = 'Password must be at least 4 characters!';
            messageEl.style.color = '#ff0000';
            return;
        }
        
        ADMIN_PASSWORD = newPassword;
        localStorage.setItem('adminPassword', newPassword);
        messageEl.textContent = 'Password changed successfully!';
        messageEl.style.color = '#4CAF50';
        e.target.reset();

        // Wait a short moment so the admin sees the success message, then log out and return to the main menu
        try {
            setTimeout(() => {
                try {
                    isAdminLoggedIn = false;
                    if (adminPanel) adminPanel.classList.add('hidden');
                    // Show a small inline status so the user knows they were logged out
                    try { showInlineContactStatus('Password changed — you have been logged out.'); } catch (e) {}
                } catch (e) { console.debug('logout after password change error', e); }
            }, 1500);
        } catch (e) { console.debug('delayed logout error', e); }
    });
    
    function renderAdminProducts() {
        const products = getProducts();
        const list = document.getElementById('admin-products-list');
        
        list.innerHTML = products.map(product => `
            <div class="admin-product-item">
                <img src="${product.image}" alt="${product.name}" class="admin-product-image">
                <div class="admin-product-info">
                    <h4>${product.name}</h4>
                    <p>Category: ${product.category}</p>
                    <p>Price: ₱${parseFloat(product.price).toFixed(2)}</p>
                    <p>${product.description}</p>
                </div>
                <div class="admin-product-actions">
                    <button onclick="editProduct('${product.id}')" class="edit-btn">Edit</button>
                    <button onclick="deleteProduct('${product.id}')" class="delete-btn">Delete</button>
                    <input type="file" class="image-upload" data-product-id="${product.id}" accept="image/*" title="Click to change image">
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.image-upload').forEach(input => {
            input.addEventListener('change', handleImageUpload);
        });
    }
    
    window.deleteProduct = function(productId) {
        showConfirm('Are you sure you want to delete this product?', {
            title: 'Confirm Deletion',
            okText: 'Yes, Delete',
            cancelText: 'Cancel',
            okStyle: 'padding:10px 14px;background:#d9534f;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;',
            cancelStyle: 'padding:10px 14px;border:none;border-radius:6px;background:#6c757d;color:#fff;cursor:pointer;font-weight:600;'
        }).then(confirmed => {
            if (!confirmed) return;
            let products = getProducts();
            products = products.filter(p => p.id !== productId);
            saveProducts(products);
            refreshMenuDisplay();
            renderAdminProducts();
        }).catch(e => console.debug('deleteProduct error', e));
    };
    
    window.editProduct = function(productId) {
        const products = getProducts();
        const product = products.find(p => p.id === productId);
        if (product) {
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-description').value = product.description;
            document.getElementById('product-image').value = product.image;
            document.getElementById('add-product-form').dataset.editId = productId;
            switchAdminTab('add');
        }
    };
    
    function handleImageUpload(e) {
        const file = e.target.files[0];
        const productId = e.target.dataset.productId;
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                let products = getProducts();
                const product = products.find(p => p.id === productId);
                if (product) {
                    product.image = event.target.result;
                    saveProducts(products);
                    refreshMenuDisplay();
                    renderAdminProducts();
                }
            };
            reader.readAsDataURL(file);
        }
    }
    
    document.getElementById('add-product-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('product-name').value;
        const category = (document.getElementById('product-category').value || '').toLowerCase().trim();
        const price = parseFloat(document.getElementById('product-price').value);
        const description = document.getElementById('product-description').value;
        const imageText = document.getElementById('product-image').value;
        const fileInput = document.getElementById('product-image-file');
        const file = fileInput && fileInput.files && fileInput.files[0];
        const editId = e.target.dataset.editId;

        let products = getProducts();

        const applySave = (imageValue) => {
            if (editId) {
                const product = products.find(p => p.id === editId);
                if (product) {
                    product.name = name;
                    product.category = category;
                    product.price = price;
                    product.description = description;
                    if (imageValue) product.image = imageValue;
                }
                e.target.dataset.editId = '';
            } else {
                const safeCategory = category.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item';
                const newId = safeCategory + '-' + Date.now();
                products.push({ id: newId, name, category, price, description, image: imageValue || '' });
            }

            saveProducts(products);
            refreshMenuDisplay();
            renderAdminProducts();
            e.target.reset();
            if (fileInput) fileInput.value = '';
            switchAdminTab('products');
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                applySave(evt.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            // use text URL if provided (or empty string)
            applySave(imageText && imageText.length ? imageText : '');
        }
    });
    
    initializeProducts();

    // === CONTACT FORM: save messages to localStorage and show confirmation ===
    function getMessages() {
        try {
            return JSON.parse(localStorage.getItem('elenaMessages')) || [];
        } catch (e) {
            return [];
        }
    }

    function saveMessages(messages) {
        try {
            const str = JSON.stringify(messages);
            localStorage.setItem('elenaMessages', str);
            // extra sync key for reliability in some environments
            try { localStorage.setItem('elenaMessagesSync', str); } catch (e) { /* ignore */ }
            const ts = Date.now();
            try { localStorage.setItem('elenaMessagesLastSaved', String(ts)); } catch (e) { /* ignore */ }
            try { localStorage.setItem('elenaMessagesLastSavedBy', JSON.stringify({ts, url: (window.location && window.location.href) || 'unknown'})); } catch (e) { /* ignore */ }
            try { updateAdminMessageBadge(); } catch (e) { /* ignore */ }
            console.debug('saveMessages: saved messages len=', (messages||[]).length, 'by', (window.location && window.location.href));
            try {
                if (window.BroadcastChannel) {
                    const bc = new BroadcastChannel('elena_channel');
                    bc.postMessage({ type: 'messages-updated' });
                    bc.close();
                }
            } catch (e) { /* ignore */ }

            // Force a unique storage notification key to improve cross-tab delivery in some environments
            try {
                // include random token so it always changes
                localStorage.setItem('elenaMessagesNotify', String(Date.now()) + '-' + Math.random().toString(36).slice(2,8));
            } catch (e) { /* ignore */ }
        } catch (e) { console.debug('saveMessages error', e); }
    }

    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = (document.getElementById('contact-name') || {}).value || '';
            const email = (document.getElementById('contact-email') || {}).value || '';
            const type = (document.getElementById('contact-type') || {}).value || '';
            const message = (document.getElementById('contact-message') || {}).value || '';

            const messages = getMessages();
            const msgObj = {
                id: 'msg-' + Date.now(),
                name: name.trim(),
                email: email.trim(),
                type: type || 'General',
                message: message.trim(),
                timestamp: new Date().toISOString(),
                status: 'new'
            };
            messages.unshift(msgObj);
            saveMessages(messages);
                console.debug('contact submitted, saved message', msgObj, 'localStorage:', localStorage.getItem('elenaMessages'));
            // notify other tabs via BroadcastChannel if available
            try {
                if (window.BroadcastChannel) {
                    const bc = new BroadcastChannel('elena_channel');
                    bc.postMessage({ type: 'messages-updated' });
                    bc.close();
                }
            } catch (e) { console.debug('broadcast channel error', e); }
            showContactConfirmation(msgObj.name);
            showInlineContactStatus(`Thanks ${msgObj.name || 'there'} — your message has been received!`);
            // Update admin UI: badge and refresh messages immediately
            try { updateAdminMessageBadge(); } catch (err) { /* ignore */ }

            // If admin panel is open, switch to messages so admin sees it immediately
            try {
                if (adminPanel && !adminPanel.classList.contains('hidden')) {
                    switchAdminTab('messages');
                }
            } catch (err) { /* ignore */ }

            // Ensure admin messages list is refreshed
            try { renderAdminMessages(); } catch (err) { /* ignore */ }
            contactForm.reset();
            // If admin panel is open, refresh messages list
            try { renderAdminMessages(); } catch (err) { /* ignore */ }
        });
    }
    

// Setup a BroadcastChannel listener to update admin UI across tabs when available
try {
    if (window.BroadcastChannel) {
        const bc = new BroadcastChannel('elena_channel');
        bc.addEventListener('message', (ev) => {
            try {
                if (ev.data && ev.data.type === 'messages-updated') {
                    updateAdminMessageBadge();
                    // if admin panel is open, switch to messages and refresh so admin sees it immediately
                    try {
                        if (adminPanel && !adminPanel.classList.contains('hidden')) {
                            switchAdminTab('messages');
                        }
                    } catch (err) { /* ignore */ }
                    renderAdminMessages();
                    console.debug('BroadcastChannel: messages-updated received');
                }
            } catch (e) { console.debug('bc message handler error', e); }
        });
    }
} catch (e) { console.debug('BroadcastChannel setup error', e); }

    // simulateIncomingMessage helper removed (no-op in production)

// Listen for storage changes (cross-tab) so admin pages update immediately when messages are added
window.addEventListener('storage', (e) => {
    try {
        console.debug('storage event', e.key, e.newValue && (typeof e.newValue === 'string' ? e.newValue.length : 'n/a'));
        if (e.key === 'elenaMessages' || e.key === 'elenaMessagesSync' || e.key === 'elenaMessagesNotify') {
            // Try reconciliation first (helps when sync key has latest data)
            try { reconcileMessagesFromSync(); } catch (err) { /* ignore */ }
            try { updateAdminMessageBadge(); } catch (err) { /* ignore */ }

            // Delay render slightly to allow other tabs to settle the storage changes
            try { setTimeout(() => { try { renderAdminMessages(); } catch (e) {} }, 120); } catch (e) {}

            // if admin panel is open, switch to messages so admin sees it immediately
            try {
                if (adminPanel && !adminPanel.classList.contains('hidden')) {
                    switchAdminTab('messages');
                }
            } catch (err) { /* ignore */ }

            console.debug('Storage event handled for', e.key);
        }
    } catch (err) { console.debug('storage event handler error', err); }
});

    function showContactConfirmation(name) {
        const overlay = document.createElement('div');
        overlay.className = 'contact-confirmation-overlay';
        overlay.innerHTML = `
            <div class="contact-confirmation-modal">
                <div class="confirmation-header">
                    <div class="confirmation-checkmark">✓</div>
                    <h2>Thank you${name ? ', ' + escapeHtml(name) : ''}!</h2>
                </div>
                <div class="confirmation-content">
                    <p>Your message has been received and will be reviewed by the admin shortly.</p>
                </div>
                <div class="confirmation-actions">
                    <button class="confirmation-btn" onclick="this.closest('.contact-confirmation-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        setTimeout(() => { if (overlay.parentElement) overlay.remove(); }, 5000);
    }

    // Small helper to escape HTML used only for minimal-safe insertion into modal
    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"]/g, function (s) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[s];
        });
    }

    function showInlineContactStatus(text) {
        try {
            const el = document.getElementById('contact-status');
            if (!el) return;
            const safeText = escapeHtml(text || 'The message has sent!');
            el.innerHTML = `<span class="contact-status-text">${safeText}</span> <button class="contact-status-dismiss" aria-label="Dismiss message">×</button>`;
            el.style.display = 'block';

            // attach dismiss handler
            const btn = el.querySelector('.contact-status-dismiss');
            if (btn) {
                btn.addEventListener('click', () => { el.style.display = 'none'; });
            }
        } catch (e) { console.debug('showInlineContactStatus error', e); }
    }

    // === SHOPPING CART LOGIC (Define before refreshMenuDisplay) ===
    const cartItemsList = document.getElementById('cart-items-list');
    const cartSubtotalElement = document.getElementById('cart-subtotal');
    const cartTotalElement = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');

    let cart = [];

    const parsePrice = (priceString) => {
        return parseFloat(priceString.replace(/₱|,/g, '').trim());
    };
    
    const formatPrice = (price) => {
        return `₱${price.toFixed(2)}`;
    };

    // Sanitize phone input: strip non-digits and return digits-only string
    // Validation requires exactly 11 digits (e.g., 09171234567)
    function sanitizePhoneInput(input) {
        if (!input) return '';
        return (input + '').replace(/\D/g, '');
    }

    const renderCart = () => {
        cartItemsList.innerHTML = '';
        let subtotal = 0;

        if (cart.length === 0) {
            cartItemsList.innerHTML = '<p class="empty-cart-message">Your cart is empty. Add some delicious items!</p>';
            checkoutBtn.disabled = true;
        } else {
            cart.forEach(item => {
                const totalPrice = item.price * item.quantity;
                subtotal += totalPrice;

                const itemHtml = `
                    <div class="cart-item" data-product-id="${item.id}">
                        <div class="cart-item-info">
                            <div class="cart-item-name">${item.name}</div>
                            <div class="cart-item-quantity">Qty: ${item.quantity}</div>
                        </div>
                        <div class="cart-item-price">${formatPrice(totalPrice)}</div>
                        <button class="remove-item-btn" data-product-id="${item.id}" title="Remove one unit">&times;</button>
                    </div>
                `;
                cartItemsList.insertAdjacentHTML('beforeend', itemHtml);
            });
            checkoutBtn.disabled = false;
        }

        const total = subtotal; 
        
        cartSubtotalElement.textContent = formatPrice(subtotal);
        cartTotalElement.textContent = formatPrice(total);

        document.querySelectorAll('.remove-item-btn').forEach(button => {
            button.addEventListener('click', removeFromCart);
        });
    };

    const addToCart = (event) => {
        const productCard = event.target.closest('.product-card');
        const id = productCard.getAttribute('data-product-id');
        const name = productCard.getAttribute('data-name');
        const price = parsePrice(productCard.getAttribute('data-price')); 

        const existingItem = cart.find(item => item.id === id);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: id,
                name: name,
                price: price,
                quantity: 1
            });
        }
        
        renderCart();
    };
    
    const removeFromCart = (event) => {
        const id = event.target.getAttribute('data-product-id');
        const itemIndex = cart.findIndex(item => item.id === id);

        if (itemIndex > -1) {
            const item = cart[itemIndex];
            
            if (item.quantity > 1) {
                item.quantity -= 1;
            } else {
                cart.splice(itemIndex, 1);
            }
        }
        
        renderCart();
    };

    const handleCheckout = () => {
        if (cart.length === 0) {
            alert("Your cart is empty. Please add items before placing an order.");
            return;
        }
        
        // Show custom name dialog instead of browser prompt
        showNameDialog();
    };
    
    window.showNameDialog = function() {
        const overlay = document.createElement('div');
        overlay.className = 'checkout-name-overlay';
        overlay.innerHTML = `
            <div class="checkout-name-modal">
                <h2>Complete Your Order</h2>
                <p>Please enter your contact details for this order:</p>
                <form id="customer-name-form">
                    <input 
                        type="text" 
                        id="customer-name-input" 
                        placeholder="Enter your full name" 
                        required
                        autocomplete="name"
                        style="width:100%;box-sizing:border-box;margin-top:8px;padding:12px;border-radius:6px;border:1px solid #ddd;"
                    >
                    <input
                        type="tel"
                        id="customer-phone-input"
                        placeholder="Contact number (11 digits, e.g. 09171234567)"
                        required
                        autocomplete="tel"
                        maxlength="11"
                        pattern="[0-9]{11}"
                        inputmode="numeric"
                        style="width:100%;box-sizing:border-box;margin-top:8px;padding:12px;border-radius:6px;border:1px solid #ddd;"
                    >
                    
                    <input
                        type="text"
                        id="customer-fb-input"
                        placeholder="Facebook name or profile URL (optional)"
                        autocomplete="username"
                        style="width:100%;box-sizing:border-box;margin-top:8px;padding:12px;border-radius:6px;border:1px solid #ddd;"
                    >
                    <div class="modal-actions">
                        <button type="submit" class="checkout-name-btn-submit">Place Order</button>
                        <button type="button" class="checkout-name-btn-cancel" onclick="this.closest('.checkout-name-overlay').remove()">Cancel</button>
                    </div>
                    <p id="name-error-msg" class="name-error-msg"></p>
                </form>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        const nameInput = document.getElementById('customer-name-input');
        const phoneInput = document.getElementById('customer-phone-input');
        const fbInput = document.getElementById('customer-fb-input');
        const form = document.getElementById('customer-name-form');
        const errorMsg = document.getElementById('name-error-msg');
        
        // Focus on name input
        setTimeout(() => nameInput.focus(), 100);
        
        // live validation for phone input (require exactly 11 digits)
        phoneInput.addEventListener('input', () => {
            // keep only digits and cap to 11 chars to prevent native pattern tooltip
            let digits = sanitizePhoneInput(phoneInput.value).slice(0, 11);
            if (phoneInput.value !== digits) phoneInput.value = digits;

            if (/^\d{11}$/.test(digits)) {
                phoneInput.style.borderColor = '#2e7d32';
            } else {
                phoneInput.style.borderColor = '';
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const customerName = nameInput.value.trim();
            const customerPhone = (phoneInput.value || '').trim();
            const customerFB = (fbInput.value || '').trim();

            if (customerName.length === 0) {
                errorMsg.textContent = 'Please enter your name to continue.';
                nameInput.focus();
                return;
            }

            if (customerName.length < 2) {
                errorMsg.textContent = 'Please enter a valid name (at least 2 characters).';
                nameInput.focus();
                return;
            }

            // Phone validation: require exactly 11 digits (digits only)
            const customerPhoneClean = sanitizePhoneInput(customerPhone);
            if (!/^\d{11}$/.test(customerPhoneClean)) {
                errorMsg.textContent = 'Please enter exactly 11 digits (e.g. 09171234567).';
                phoneInput.focus();
                return;
            }

            overlay.remove();
            completeCheckout({ name: customerName, phone: customerPhoneClean, fb: customerFB });
        });
    };
    
    window.completeCheckout = function(customerInfo) {
        // save order to localStorage so admin can view it (include customerName)
        let savedOrder = null;
        try {
            const ordersRaw = localStorage.getItem('elenaOrders');
            const orders = ordersRaw ? JSON.parse(ordersRaw) : [];
            const order = {
                id: 'order-' + Date.now(),
                customerName: (customerInfo && customerInfo.name) ? customerInfo.name : (customerInfo || 'Guest'),
                customerPhone: (customerInfo && customerInfo.phone) ? customerInfo.phone : '',
                customerFB: (customerInfo && customerInfo.fb) ? customerInfo.fb : '',
                items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
                subtotal: parsePrice(cartSubtotalElement.textContent),
                total: parsePrice(cartTotalElement.textContent),
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            orders.unshift(order);
            localStorage.setItem('elenaOrders', JSON.stringify(orders));
            savedOrder = order;
        } catch (e) {
            console.debug('save order error', e);
        }

        // Show custom confirmation dialog instead of alert
        const displayName = (customerInfo && customerInfo.name) ? customerInfo.name : (customerInfo || 'Guest');
        showOrderConfirmation(displayName, savedOrder);

        cart = [];
        renderCart();
        
        // Show receipt overlay for customer to screenshot/save
        try { if (savedOrder) showReceipt(savedOrder); } catch (e) { console.debug('showReceipt error', e); }
    };
    
    window.showOrderConfirmation = function(customerName, orderData) {
        const overlay = document.createElement('div');
        overlay.className = 'order-confirmation-overlay';
        
        const itemsHtml = (orderData.items || []).map(item => 
            `<div class="confirmation-item">
                <span class="confirmation-qty">${item.quantity}x</span>
                <span class="confirmation-name">${item.name}</span>
                <span class="confirmation-price">${formatPrice(item.price)}</span>
            </div>`
        ).join('');
        
        overlay.innerHTML = `
            <div class="order-confirmation-modal">
                <div class="confirmation-header">
                    <div class="confirmation-checkmark">✓</div>
                    <h2>Order Confirmed!</h2>
                </div>
                
                <div class="confirmation-content">
                    <div class="confirmation-section">
                        <h3>Customer</h3>
                        <p class="confirmation-data">${customerName}</p>
                        ${orderData.customerPhone ? `<div>Contact: <strong>${orderData.customerPhone}</strong></div>` : ''}
                        ${orderData.customerFB ? `<div>Facebook: <strong>${orderData.customerFB}</strong></div>` : ''}
                    </div>
                    
                    <div class="confirmation-section">
                        <h3>Order Items</h3>
                        <div class="confirmation-items">
                            ${itemsHtml}
                        </div>
                    </div>
                    
                    <div class="confirmation-section">
                        <div class="confirmation-totals">
                            <div class="total-row">
                                <span>Subtotal:</span>
                                <span class="total-amount">₱${orderData.subtotal.toFixed(2)}</span>
                            </div>
                            <div class="total-row total-final">
                                <span>Total Amount:</span>
                                <span class="total-amount">₱${orderData.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <p class="confirmation-message">Your order is being processed. Thank you for choosing Elena's Savor!</p>
                </div>
                
                <div class="confirmation-actions">
                    <button class="confirmation-btn" onclick="this.closest('.order-confirmation-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Auto-close after 8 seconds
        setTimeout(() => {
            if (overlay.parentElement) {
                overlay.remove();
            }
        }, 8000);
    };

    checkoutBtn.addEventListener('click', handleCheckout);
    renderCart();

    // NOW call refreshMenuDisplay after addToCart is defined
    refreshMenuDisplay();

    // === Orders: get/save/render ===
    function getOrders() {
        try {
            return JSON.parse(localStorage.getItem('elenaOrders')) || [];
        } catch (e) {
            return [];
        }
    }

    function renderAdminOrders() {
        const orders = getOrders();
        const list = document.getElementById('admin-orders-list');
        if (!list) return;

        if (!orders || orders.length === 0) {
            list.innerHTML = '<p style="color:#666;">No orders yet.</p>';
            return;
        }

        const html = orders.map(o => {
            const date = o.timestamp ? new Date(o.timestamp).toLocaleString() : '';
            const items = Array.isArray(o.items) ? o.items.map(it => `<li>${it.quantity} x ${it.name} — ₱${(it.price||0).toFixed(2)}</li>`).join('') : '';
            const subtotal = typeof o.subtotal === 'number' ? o.subtotal.toFixed(2) : (o.total ? o.total.toFixed(2) : '0.00');
            const total = typeof o.total === 'number' ? o.total.toFixed(2) : (o.subtotal ? o.subtotal.toFixed(2) : '0.00');
            const isTaken = (o.status === 'taken');
            const actionBtn = isTaken
                ? `<span class="order-taken-badge">Taken</span> <button class="order-delete-btn" onclick="deleteOrder('${o.id}')">Delete</button>`
                : `<button class="order-toggle-btn" onclick="toggleOrderTaken('${o.id}')">Mark Taken</button> <button class="order-delete-btn" onclick="deleteOrder('${o.id}')">Delete</button>`;

            return `
                <div class="admin-order-item" data-order-id="${o.id}">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <div>
                            <strong>Order ${o.id}</strong>
                            <div style="font-size:0.9em;color:#444;">Customer: <strong>${o.customerName ? o.customerName : 'Guest'}</strong></div>
                            ${o.customerPhone ? `<div style="font-size:0.9em;color:#444;">Phone: <strong>${o.customerPhone}</strong></div>` : ''}
                            ${o.customerFB ? `<div style="font-size:0.9em;color:#444;">Facebook: <strong>${o.customerFB}</strong></div>` : ''}
                        </div>
                        <span style="font-size:0.9em;color:#666;">${date}</span>
                    </div>
                    <div>
                        <ul style="margin:0 0 8px 16px;padding:0;">${items}</ul>
                        <div style="font-weight:700;">Subtotal: ₱${subtotal} — Total: ₱${total}</div>
                        <div style="margin-top:6px;">Status: <em>${o.status||'pending'}</em></div>
                        <div style="margin-top:8px;">${actionBtn}</div>
                    </div>
                </div>
            `;
        }).join('');

        list.innerHTML = `<div style="margin-bottom:8px;font-weight:700">Showing ${orders.length} order${orders.length>1?'s':''}</div>` + html;
    }

    function toggleOrderTaken(orderId) {
        try {
            const orders = getOrders();
            const idx = orders.findIndex(o => o.id === orderId);
            if (idx === -1) return;
            orders[idx].status = orders[idx].status === 'taken' ? 'pending' : 'taken';
            localStorage.setItem('elenaOrders', JSON.stringify(orders));
            renderAdminOrders();
        } catch (e) {
            console.debug('toggleOrderTaken error', e);
        }
    }

    function deleteOrder(orderId) {
        // Show custom confirmation modal
        const modal = document.getElementById('delete-confirm-modal');
        if (modal) {
            modal.classList.remove('hidden');
            // Store orderId for confirmation
            modal.dataset.orderId = orderId;
        }
    }

    window.toggleOrderTaken = toggleOrderTaken;
    window.deleteOrder = deleteOrder;
    window.renderAdminOrders = renderAdminOrders;

    // === Admin Messages: render and controls ===
    function reconcileMessagesFromSync() {
        try {
            const primary = JSON.parse(localStorage.getItem('elenaMessages')) || [];
            const sync = JSON.parse(localStorage.getItem('elenaMessagesSync') || 'null') || [];

            // If no sync copy, nothing to do
            if ((!sync || sync.length === 0) && (!primary || primary.length === 0)) return false;

            const primaryLatest = (primary && primary[0] && primary[0].timestamp) ? new Date(primary[0].timestamp).getTime() : 0;
            const syncLatest = (sync && sync[0] && sync[0].timestamp) ? new Date(sync[0].timestamp).getTime() : 0;

            // If primary is empty but sync exists, restore
            if ((!primary || primary.length === 0) && (sync && sync.length > 0)) {
                localStorage.setItem('elenaMessages', JSON.stringify(sync));
                console.debug('reconcileMessagesFromSync: restored elenaMessages from elenaMessagesSync, length=', sync.length);
                return true;
            }

            // If sync appears to have newer data, merge uniquely and write back
            if (syncLatest > primaryLatest) {
                const map = {};
                sync.concat(primary).forEach(m => { if (m && m.id) map[m.id] = m; });
                const merged = Object.values(map).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                localStorage.setItem('elenaMessages', JSON.stringify(merged));
                console.debug('reconcileMessagesFromSync: merged sync into primary, new length=', merged.length);
                return true;
            }

        } catch (e) { console.debug('reconcileMessagesFromSync error', e); }
        return false;
    }

    function renderAdminMessages() {
        // Attempt reconciliation first (helps environments where storage events or BroadcastChannel don't arrive)
        try { reconcileMessagesFromSync(); } catch (e) { /* ignore */ }

        let messages = getMessages();
        // If primary messages are empty, try fallback sync key as last resort
        if ((!messages || messages.length === 0) && localStorage.getItem('elenaMessagesSync')) {
            try {
                messages = JSON.parse(localStorage.getItem('elenaMessagesSync')) || messages;
                console.debug('renderAdminMessages: used fallback sync key, length=', (messages||[]).length);
            } catch (e) { /* ignore parse errors */ }
        }
        const list = document.getElementById('admin-messages-list');
        if (!list) return;
        console.debug('renderAdminMessages: messages length=', (messages || []).length, messages);

        if (!messages || messages.length === 0) {
            list.innerHTML = '<p style="color:#666;">No messages yet.</p>';
            return;
        }

        const header = document.createElement('div');
        header.style.marginBottom = '8px';
        header.style.fontWeight = '700';
        header.textContent = `Showing ${messages.length} message${messages.length>1 ? 's' : ''}`;

        list.innerHTML = '';
        list.appendChild(header);

        messages.forEach(m => {
            const item = document.createElement('div');
            item.className = 'admin-message-item';
            item.dataset.messageId = m.id;
            item.style.borderBottom = '1px solid #eee';
            item.style.padding = '16px 0';
            item.style.marginBottom = '12px';

            const top = document.createElement('div');
            top.style.display = 'flex';
            top.style.justifyContent = 'space-between';
            top.style.alignItems = 'center';

            const left = document.createElement('div');
            left.innerHTML = `<strong>${m.name || 'Anonymous'}</strong> • <span style="color:#666;">${m.email || ''}</span>`;
            const right = document.createElement('div');
            right.style.fontSize = '0.9em';
            right.style.color = '#666';
            right.textContent = m.timestamp ? new Date(m.timestamp).toLocaleString() : '';

            top.appendChild(left);
            top.appendChild(right);

            const typeEl = document.createElement('div');
            typeEl.style.marginTop = '6px';
            typeEl.style.color = '#333';
            typeEl.innerHTML = `Type: <strong>${m.type}</strong>`;

            const msgEl = document.createElement('div');
            msgEl.style.marginTop = '8px';
            msgEl.style.whiteSpace = 'pre-wrap';
            msgEl.style.color = '#222';
            msgEl.textContent = m.message;

            const actions = document.createElement('div');
            actions.style.marginTop = '8px';
            actions.style.display = 'flex';
            actions.style.gap = '8px';

            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'message-toggle-btn';
            toggleBtn.dataset.id = m.id;
            toggleBtn.textContent = (m.status === 'new') ? 'Mark Read' : 'Mark Unread';

            const delBtn = document.createElement('button');
            delBtn.className = 'message-delete-btn';
            delBtn.dataset.id = m.id;
            delBtn.textContent = 'Delete';

            actions.appendChild(toggleBtn);
            actions.appendChild(delBtn);

            item.appendChild(top);
            item.appendChild(typeEl);
            item.appendChild(msgEl);
            item.appendChild(actions);

            list.appendChild(item);
        });

        // Attach event listeners (reliable binding)
        list.querySelectorAll('.message-toggle-btn').forEach(btn => {
            btn.removeEventListener('click', onToggleClick);
            btn.addEventListener('click', onToggleClick);
        });
        list.querySelectorAll('.message-delete-btn').forEach(btn => {
            btn.removeEventListener('click', onDeleteClick);
            btn.addEventListener('click', onDeleteClick);
        });

        // update admin badge after rendering
        try { updateAdminMessageBadge(); } catch (e) { /* ignore */ }


    }



    function toggleMessageRead(messageId) {
        try {
            const messages = getMessages();
            const idx = messages.findIndex(m => m.id === messageId);
            if (idx === -1) return;
            messages[idx].status = messages[idx].status === 'new' ? 'read' : 'new';
            saveMessages(messages);
            renderAdminMessages();
        } catch (e) {
            console.debug('toggleMessageRead error', e);
        }
    }

    function deleteMessage(messageId) {
        showConfirm('Delete this message?').then(confirmed => {
            if (!confirmed) return;
            try {
                let messages = getMessages();
                messages = messages.filter(m => m.id !== messageId);
                saveMessages(messages);
                renderAdminMessages();
            } catch (e) {
                console.debug('deleteMessage error', e);
            }
        }).catch(e => console.debug('deleteMessage error', e));
    }

    // event handler wrappers to use with addEventListener
    function onToggleClick(e) {
        const id = e.currentTarget.dataset.id;
        toggleMessageRead(id);
    }

    function onDeleteClick(e) {
        const id = e.currentTarget.dataset.id;
        deleteMessage(id);
    }

    // Custom confirm modal that returns a Promise<boolean>
    function showConfirm(message, options) {
        options = options || {};
        const okText = options.okText || 'OK';
        const cancelText = options.cancelText || 'Cancel';
        const okStyle = options.okStyle || 'padding:10px 16px;background:#1a73e8;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500;';
        const cancelStyle = options.cancelStyle || 'padding:10px 16px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;font-weight:500;';

        return new Promise((resolve) => {
            try {
                const overlay = document.createElement('div');
                overlay.className = 'custom-confirm-overlay';
                overlay.style.position = 'fixed';
                overlay.style.left = '0';
                overlay.style.top = '0';
                overlay.style.right = '0';
                overlay.style.bottom = '0';
                overlay.style.background = 'rgba(0,0,0,0.4)';
                overlay.style.display = 'flex';
                overlay.style.alignItems = 'center';
                overlay.style.justifyContent = 'center';
                overlay.style.zIndex = '9999';

                const modal = document.createElement('div');
                modal.style.background = '#fff';
                modal.style.padding = '20px';
                modal.style.borderRadius = '8px';
                modal.style.maxWidth = '520px';
                modal.style.width = '90%';
                modal.style.boxShadow = '0 8px 40px rgba(0,0,0,0.25)';

                const title = document.createElement('h3');
                title.textContent = options.title || 'Confirm Deletion';
                title.style.margin = '0 0 8px 0';
                title.style.fontSize = '1.2rem';

                const msg = document.createElement('div');
                msg.style.margin = '8px 0 18px 0';
                msg.style.fontSize = '0.98rem';
                msg.style.color = '#444';
                msg.textContent = message || 'Are you sure?';

                const actions = document.createElement('div');
                actions.style.display = 'flex';
                actions.style.justifyContent = 'flex-end';
                actions.style.gap = '12px';

                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = cancelText;
                cancelBtn.style.cssText = cancelStyle;

                const okBtn = document.createElement('button');
                okBtn.textContent = okText;
                okBtn.style.cssText = okStyle;

                actions.appendChild(cancelBtn);
                actions.appendChild(okBtn);

                modal.appendChild(title);
                modal.appendChild(msg);
                modal.appendChild(actions);
                overlay.appendChild(modal);
                document.body.appendChild(overlay);

                function cleanup() {
                    try { overlay.remove(); } catch (e) { /* ignore */ }
                }

                cancelBtn.addEventListener('click', () => { cleanup(); resolve(false); });
                okBtn.addEventListener('click', () => { cleanup(); resolve(true); });
                overlay.addEventListener('click', (ev) => {
                    if (ev.target === overlay) { cleanup(); resolve(false); }
                });

                // focus OK for keyboard users
                setTimeout(() => okBtn.focus(), 50);
            } catch (e) {
                console.debug('showConfirm error', e);
                // fallback to native confirm
                try { resolve(confirm(message)); } catch (ex) { resolve(false); }
            }
        });
    }

    window.renderAdminMessages = renderAdminMessages;
    window.toggleMessageRead = toggleMessageRead;
    window.deleteMessage = deleteMessage;

    // Receipt helpers: show overlay and open printable view

    // Update or create a small badge on the Admin button showing number of new messages
    function updateAdminMessageBadge() {
        try {
            const btn = document.getElementById('admin-login-btn');
            if (!btn) return;
            const messages = getMessages();
            const newCount = (messages || []).filter(m => m.status === 'new').length;
            let badge = btn.querySelector('.admin-badge');
            if (!badge && newCount > 0) {
                badge = document.createElement('span');
                badge.className = 'admin-badge';
                btn.appendChild(badge);
                // make badge clickable to open panel
                badge.style.cursor = 'pointer';
                badge.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    if (!isAdminLoggedIn) {
                        loginModal.classList.remove('hidden');
                    } else {
                        adminPanel.classList.remove('hidden');
                        switchAdminTab('messages');
                    }
                });
            }
            if (badge) {
                if (newCount > 0) {
                    badge.textContent = newCount > 9 ? '9+' : String(newCount);
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
            console.debug('updateAdminMessageBadge: newCount=', newCount);
        } catch (e) { console.debug('updateAdminMessageBadge error', e); }
    }

    // initialize badge on load
    try { updateAdminMessageBadge(); } catch (e) { /* ignore */ }
    function openPrintableReceipt(order) {
        try {
            const win = window.open('', '_blank');
            if (!win) return;
            const itemsHtml = (order.items || []).map(it => `<tr><td>${it.quantity} x ${it.name}</td><td style="text-align:right;">₱${(it.price||0).toFixed(2)}</td></tr>`).join('');
            const html = `
                <html>
                <head>
                    <title>Receipt - ${order.id}</title>
                    <style>
                        body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#222}
                        .receipt{max-width:480px;margin:0 auto;border:1px solid #ddd;padding:18px;border-radius:8px}
                        h2{margin:0 0 8px 0}
                        .meta{color:#666;margin-bottom:12px}
                        table{width:100%;border-collapse:collapse;margin-bottom:12px}
                        td{padding:6px 0}
                        .total{font-weight:800;font-size:1.1em}
                    </style>
                </head>
                <body>
                    <div class="receipt">
                        <h2>Elena's Savor</h2>
                        <div class="meta">Order: ${order.id} • ${new Date(order.timestamp).toLocaleString()}</div>
                        <div class="meta">Customer: <strong>${order.customerName || 'Guest'}</strong></div>
                        <table>
                            ${itemsHtml}
                        </table>
                        <div class="total">Subtotal: ₱${(order.subtotal||0).toFixed(2)}</div>
                        <div class="total">Total: ₱${(order.total||0).toFixed(2)}</div>
                        <div style="margin-top:14px;">Status: ${order.status || 'pending'}</div>
                    </div>
                </body>
                </html>
            `;
            win.document.open();
            win.document.write(html);
            win.document.close();
        } catch (e) {
            console.debug('openPrintableReceipt error', e);
        }
    }

    function showReceipt(order) {
        const overlay = document.createElement('div');
        overlay.className = 'receipt-overlay';
        overlay.innerHTML = `
            <div class="receipt-card">
                <div class="receipt-header">
                    <div class="receipt-icon">🧾</div>
                    <h2>Order Receipt</h2>
                    <p class="receipt-id">Order #${order.id.substring(6)}</p>
                </div>
                
                <div class="receipt-content">
                    <div class="receipt-section">
                        <div class="receipt-row">
                            <span class="receipt-label">Date & Time:</span>
                            <span class="receipt-value">${new Date(order.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">Customer:</span>
                            <span class="receipt-value"><strong>${order.customerName || 'Guest'}</strong></span>
                        </div>
                    </div>
                    
                    <div class="receipt-divider"></div>
                    
                    <div class="receipt-section">
                        <h3 class="receipt-section-title">Items Ordered</h3>
                        <div class="receipt-items">
                            ${(order.items || []).map(it => `
                                <div class="receipt-item">
                                    <span class="receipt-item-qty">${it.quantity}x</span>
                                    <span class="receipt-item-name">${it.name}</span>
                                    <span class="receipt-item-price">₱${(it.price||0).toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="receipt-divider"></div>
                    
                    <div class="receipt-section">
                        <div class="receipt-total-row">
                            <span>Subtotal:</span>
                            <span>₱${(order.subtotal||0).toFixed(2)}</span>
                        </div>
                        <div class="receipt-total-row receipt-final-total">
                            <span>Total Amount:</span>
                            <span>₱${(order.total||0).toFixed(2)}</span>
                        </div>
                        <div class="receipt-status">
                            <span class="receipt-status-badge receipt-status-${order.status || 'pending'}">${order.status || 'pending'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="receipt-footer">
                    <div class="receipt-screenshot-instruction">
                        <span class="screenshot-icon">📸</span>
                        <p>Screenshot this for proof of order</p>
                    </div>
                    <button class="receipt-close-btn">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('.receipt-close-btn').addEventListener('click', () => overlay.remove());
    }

    window.showReceipt = showReceipt;
    window.openPrintableReceipt = openPrintableReceipt;

    // === EXISTING CODE STARTS HERE ===
    // --- 1. Menu Tab Switching Logic (Existing) ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const sectionTitle = document.querySelector('.section-title');

    const formatTitle = (text) => {
        if (!text) return "";
        let lower = text.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1) + " Offerings";
    };

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const newTitleText = button.textContent.trim();

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => content.classList.remove('active'));
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            sectionTitle.textContent = formatTitle(newTitleText);
        });
    });

    // Initialize the title on page load
    const initialActiveButton = document.querySelector('.tab-button.active');
    if (initialActiveButton && sectionTitle) {
        sectionTitle.textContent = formatTitle(initialActiveButton.textContent.trim());
    }

    // Delete confirmation modal handlers
    const deleteConfirmYes = document.getElementById('delete-confirm-yes');
    const deleteConfirmNo = document.getElementById('delete-confirm-no');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');

    if (deleteConfirmYes) {
        deleteConfirmYes.addEventListener('click', () => {
            console.log('Delete confirmed');
            const orderId = deleteConfirmModal.dataset.orderId;
            try {
                const orders = getOrders();
                const filtered = orders.filter(o => o.id !== orderId);
                localStorage.setItem('elenaOrders', JSON.stringify(filtered));
                renderAdminOrders();
                console.log('Order deleted');
            } catch (e) {
                console.debug('deleteOrder error', e);
            }
            deleteConfirmModal.classList.add('hidden');
        });
    }

    if (deleteConfirmNo) {
        deleteConfirmNo.addEventListener('click', () => {
            console.log('Delete cancelled');
            deleteConfirmModal.classList.add('hidden');
        });
    }

    // Close modal when clicking outside
    deleteConfirmModal.addEventListener('click', (e) => {
        if (e.target === deleteConfirmModal) {
            deleteConfirmModal.classList.add('hidden');
        }
    });

});