// Toggle to show and hide navbar1 menu1
const navbar1menu1 = document.getElementById("menu1");
const burgermenu1 = document.getElementById("burger");

burgermenu1.addEventListener("click", () => {
  navbar1menu1.classList.toggle("is-active");
  burgermenu1.classList.toggle("is-active");
});

// Toggle to show and hide dropdown1 menu1
const dropdown1 = document.querySelectorAll(".dropdown1");

dropdown1.forEach((item) => {
  const dropdown1Toggle = item.querySelector(".dropdown1-toggle");

  dropdown1Toggle.addEventListener("click", () => {
    const dropdown1Show = document.querySelector(".dropdown1-show");
    toggledropdown1Item(item);

    // Remove 'dropdown1-show' class from other dropdown1
    if (dropdown1Show && dropdown1Show != item) {
      toggledropdown1Item(dropdown1Show);
    }
  });
});

// Function to display the dropdown1 menu1
const toggledropdown1Item = (item) => {
  const dropdown1Content = item.querySelector(".dropdown1-content");

  // Remove other dropdown1 that have 'dropdown1-show' class
  if (item.classList.contains("dropdown1-show")) {
    dropdown1Content.removeAttribute("style");
    item.classList.remove("dropdown1-show");
  } else {
    // Added max-height on active 'dropdown1-show' class
    dropdown1Content.style.height = dropdown1Content.scrollHeight + "px";
    item.classList.add("dropdown1-show");
  }
};

// Fixed dropdown1 menu1 on window resizing
window.addEventListener("resize", () => {
  if (window.innerWidth > 992) {
    document.querySelectorAll(".dropdown1-content").forEach((item) => {
      item.removeAttribute("style");
    });
    dropdown1.forEach((item) => {
      item.classList.remove("dropdown1-show");
    });
  }
});

// Fixed navbar1 menu1 on window resizing
window.addEventListener("resize", () => {
  if (window.innerWidth > 992) {
    if (navbar1menu1.classList.contains("is-active")) {
      navbar1menu1.classList.remove("is-active");
      burgermenu1.classList.remove("is-active");
    }
  }
});

// Long press logo to navigate to admin login page
const brandLogos = document.querySelectorAll('.brand');
brandLogos.forEach(logo => {
  let pressTimer;
  let isLongPress = false;

  const startPress = (e) => {
    if (e.type === 'mousedown' && e.button !== 0) return;
    
    isLongPress = false;
    pressTimer = setTimeout(() => {
      isLongPress = true;
      window.location.href = '/login';
    }, 1000); // 1 second duration
  };

  const cancelPress = (e) => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  logo.addEventListener('click', (e) => {
    if (isLongPress) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  logo.addEventListener('mousedown', startPress);
  logo.addEventListener('touchstart', startPress, { passive: true });
  logo.addEventListener('mouseup', cancelPress);
  logo.addEventListener('mouseleave', cancelPress);
  logo.addEventListener('touchend', cancelPress);
  logo.addEventListener('touchcancel', cancelPress);
  logo.addEventListener('contextmenu', (e) => {
    if (isLongPress) {
      e.preventDefault();
    }
  });
});

