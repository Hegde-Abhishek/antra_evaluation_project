const API = (() => {
  const URL = "http://localhost:3000";
  const getCart = () => {
    // define your method to get cart data
    return fetch(`${URL}/cart`).then(res => res.json());
  };

  const getInventory = () => {
    // define your method to get inventory data
    return fetch(`${URL}/inventory`).then(res => res.json());
  };

  const addToCart = (inventoryItem) => {
    // define your method to add an item to cart
    return fetch(`${URL}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inventoryItem)
    }).then(res => res.json());
  };

  const updateCart = (id, newAmount) => {
    // define your method to update an item in cart
    return fetch(`${URL}/cart/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: newAmount })
    }).then(res => res.json());
  };

  const deleteFromCart = (id) => {
    // define your method to delete an item in cart
    return fetch(`${URL}/cart/${id}`, {
      method: 'DELETE'
    }).then(res => res.json());
  };

  const checkout = () => {
    // you don't need to add anything here
    return getCart().then((data) =>
      Promise.all(data.map((item) => deleteFromCart(item.id)))
    );
  };

  return {
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  };
})();

const Model = (() => {
  // implement your logic for Model
  class State {
    #onChange = () => {};
    #inventory;
    #cart;
    #currentPage = 1;
    #itemsPerPage = 2;
    constructor() {
      this.#inventory = [];
      this.#cart = [];
      this.#currentPage = 1;
      this.#itemsPerPage = 2;
    }

    set cart(newCart) {
      this.#cart = newCart;
      this.#onChange();
    }

    get cart() {
      return this.#cart;
    }

    set inventory(newInventory) {
      this.#inventory = newInventory;
      this.#onChange();
    }

    get inventory() {
      return this.#inventory.slice(
        (this.#currentPage - 1) * this.#itemsPerPage,
        this.#currentPage * this.#itemsPerPage
      );
    }

    setPage(page) {
      this.#currentPage = page;
      this.#onChange();
    }

    setItemsPerPage(num) {
      this.#itemsPerPage = num;
      this.#onChange();
    }

    getFullInventoryLength() {
      return this.#inventory.length;
  }

    subscribe(cb) {
      this.#onChange = cb;
    }
  }
  const {
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  } = API;
  return {
    State,
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  };
})();

const View = (() => {
  const domstr = {
    inventoryList: ".inventory-container ul",
    cartList: ".cart-container ul",
    checkoutButton: ".checkout-btn",
    paginationContainer: ".inventory-container .pagination"
  };

  const render = (elem, template) => {
    elem.innerHTML = template;
  };

  const createInventoryItem = (item) => {
    return `
      <li id="item-${item.id}">
        ${item.content}  <button data-id="${item.id}" class="decrease">-</button>
        <span id="item-amount-${item.id}" class="item-count">0</span>
        <button data-id="${item.id}" class="increase">+</button>
        <button data-id="${item.id}" class="add-to-cart">Add to Cart</button>
      </li>
    `;
  };

  const createCartItem = (item) => {
    return `
      <li id="cart-item-${item.id}">
        ${item.content} x ${item.amount}
        <button data-id="${item.id}" class="delete">Delete</button>
      </li>
    `;
  };

  const createPagination = (pageCount, currentPage) => {
    let buttons = '';
    for (let i = 1; i <= pageCount; i++) {
      buttons += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    return `<div class="pagination">${buttons}</div>`;
  };


  return {
    domstr,
    render,
    createInventoryItem,
    createCartItem,
    createPagination
  };
})();

const Controller = ((model, view) => {
  const state = new model.State();

  const init = () => {
    model.getInventory().then(inventory => {
      state.inventory = inventory;
      renderInventory();
      initPagination();
    });
    model.getCart().then(cart => {
      state.cart = cart;
      renderCart();
    });
  };

  const renderInventory = () => {
    const inventoryList = document.querySelector(view.domstr.inventoryList);
    view.render(inventoryList, state.inventory.map(view.createInventoryItem).join(''));
    inventoryList.querySelectorAll('.increase').forEach(button => button.addEventListener('click', increaseItem));
    inventoryList.querySelectorAll('.decrease').forEach(button => button.addEventListener('click', decreaseItem));
    inventoryList.querySelectorAll('.add-to-cart').forEach(button => button.addEventListener('click', addItemToCart));
    initPagination();
  };

  const renderCart = () => {
    const cartList = document.querySelector(view.domstr.cartList);
    view.render(cartList, state.cart.map(view.createCartItem).join(''));
    cartList.querySelectorAll('.delete').forEach(button => button.addEventListener('click', deleteCartItem));
  };

  const increaseItem = (event) => {
    const id = event.target.dataset.id;
    const amountSpan = document.getElementById(`item-amount-${id}`);
    let amount = parseInt(amountSpan.textContent);
    amountSpan.textContent = ++amount;
  };

  const decreaseItem = (event) => {
    const id = event.target.dataset.id;
    const amountSpan = document.getElementById(`item-amount-${id}`);
    let amount = parseInt(amountSpan.textContent);
    if (amount > 0) amountSpan.textContent = --amount;
  };

  const addItemToCart = (event) => {
    const id = parseInt(event.target.dataset.id);
    const amountSpan = document.getElementById(`item-amount-${id}`);
    const amountToAdd = parseInt(amountSpan.textContent);
  
    if (amountToAdd > 0) {
      const existingCartItem = state.cart.find(item => item.id === id);
      if (existingCartItem) {
        const updatedAmount = existingCartItem.amount + amountToAdd;
        model.updateCart(id, updatedAmount).then(() => {
          amountSpan.textContent = '0'; // Reset after adding
          init(); // Re-fetch inventory and cart to re-render
        });
      } else {
        const item = state.inventory.find(item => item.id === id);
        model.addToCart({id, content: item.content, amount: amountToAdd}).then(() => {
          amountSpan.textContent = '0'; // Reset after adding
          init(); // Re-fetch inventory and cart to re-render
        });
      }
    }
  };
  

  const deleteCartItem = (event) => {
    const id = event.target.dataset.id;
    model.deleteFromCart(id).then(() => init());
  };

  const handleCheckout = () => {
    model.checkout().then(() => {
      alert("Checkout complete!");
      init();
    });
  };

  const handlePageChange = (event) => {
    const page = parseInt(event.target.dataset.page);
    state.setPage(page);
    renderInventory();
    initPagination();
  };
  
  const initPagination = () => {
    const container = document.querySelector(view.domstr.paginationContainer);
    if (!container) {
        console.error("Pagination container not found in the DOM.");
        return;
    }

    const fullInventoryLength = state.getFullInventoryLength();  // Ensure you have a method to get the full inventory length
    const itemsPerPage = 2;
    const pageCount = Math.ceil(fullInventoryLength / itemsPerPage);

    console.log("....",pageCount)
    if (pageCount <= 1) {
        container.innerHTML = '';  // No need for pagination if all items fit on one page
        return;
    }

    view.render(container, view.createPagination(pageCount, 1));  // Assuming currentPage starts at 1
    container.querySelectorAll('button').forEach(button => 
        button.addEventListener('click', handlePageChange)
    );
};


  const bootstrap = () => {
    init();
    document.querySelector(view.domstr.checkoutButton).addEventListener('click', handleCheckout);
  };

  return {
    bootstrap
  };
})(Model, View);

Controller.bootstrap();

