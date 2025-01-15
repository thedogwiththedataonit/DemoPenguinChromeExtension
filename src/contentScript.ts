let isHighlighting = false;
let sidebarOpen = false;

const allowedUrls = ["https://github.com/"];

function isAllowedUrl() {
  return allowedUrls.some(allowedUrl => window.location.href.startsWith(allowedUrl));
}

if (isAllowedUrl()) {
  createSidebar();
}

function createSidebar() {
  const existingSidebar = document.getElementById('demopenguin-sidebar');
  if (existingSidebar) {
    return;
  }

  const sidebar = document.createElement('iframe');
  sidebar.id = 'demopenguin-sidebar';
  sidebar.src = chrome.runtime.getURL('sidebar.html');
  sidebar.style.cssText = `
    position: fixed;
    top: 0;
    right: -300px;
    width: 300px;
    height: 100vh;
    border: none;
    background-color: white;
    box-shadow: -2px 0 5px rgba(0,0,0,0.1);
    transition: right 0.3s ease-in-out;
    z-index: 2147483647;
  `;
  document.body.appendChild(sidebar);

  const toggleButton = document.createElement('button');
  toggleButton.id = 'demopenguin-toggle';
  toggleButton.innerHTML = `<img src="${chrome.runtime.getURL('penguin-walk.gif')}" style="width: 40px; height: 40px;">`;
  toggleButton.style.cssText = `
    position: fixed;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    z-index: 2147483648;
    background-color: #343a40;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.6);
    border: none;
    padding: 5px;
    border-radius: 5px 0 0 5px;
    cursor: pointer;
  `;
  toggleButton.addEventListener('click', toggleSidebar);
  document.body.appendChild(toggleButton);

  // Send initial state to sidebar
  chrome.runtime.sendMessage({ action: "getState" }, (response) => {
    sidebar.addEventListener('load', () => {
      sidebar.contentWindow?.postMessage({ action: "initState", state: response }, '*');
    });
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById('demopenguin-sidebar') as HTMLIFrameElement;
  const toggleButton = document.getElementById('demopenguin-toggle');
  if (sidebar && toggleButton) {
    sidebarOpen = !sidebarOpen;
    sidebar.style.right = sidebarOpen ? '0' : '-300px';
    toggleButton.style.display = sidebarOpen ? 'none' : 'block';
  }
}

function applyHighlight(element: HTMLElement) {
  element.style.backgroundColor = 'rgba(255, 192, 203, 0.2)';
  element.style.outline = '2px solid pink';
}

function removeHighlight(element: HTMLElement) {
  element.style.backgroundColor = '';
  element.style.outline = '';
}

function isSidebarElement(element: HTMLElement): boolean {
  return element.id === 'demopenguin-sidebar' || element.closest('#demopenguin-sidebar') !== null;
}

function handleMouseOver(event: MouseEvent) {
  if (!isHighlighting) return;
  const target = event.target as HTMLElement;
  if (!isSidebarElement(target)) {
    applyHighlight(target);
  }
}

function handleMouseOut(event: MouseEvent) {
  if (!isHighlighting) return;
  const target = event.target as HTMLElement;
  if (!isSidebarElement(target)) {
    removeHighlight(target);
  }
}

function getElementInfo(element: HTMLElement): any {
    // Create objects to store attributes
    const attributes: Record<string, string> = {};
    const dataAttributes: Record<string, string> = {};
  
    // Collect all attributes using Array.from instead of for...of
    Array.from(element.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
            dataAttributes[attr.name] = attr.value;
        } else {
            attributes[attr.name] = attr.value;
        }
    });

    // Get computed styles
    const computedStyle = window.getComputedStyle(element);
    const styles = {
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        fontSize: computedStyle.fontSize,
        display: computedStyle.display,
        position: computedStyle.position,
    };
  
    // Get children recursively
    const children = Array.from(element.children).map(child => 
        getElementInfo(child as HTMLElement)
    );
  
    // Return comprehensive element info without logging
    return {
        tagName: element.tagName.toLowerCase(),
        id: element.id || undefined,
        classes: Array.from(element.classList),
        attributes,
        dataAttributes,
        styles,
        href: element.getAttribute('href') || undefined,
        src: element.getAttribute('src') || undefined,
        textContent: element.textContent?.trim(),
        innerText: element.innerText?.trim(),
        innerHTML: element.innerHTML,
        children,
        rect: element.getBoundingClientRect().toJSON()
    };
}
  

function handleClick(event: Event) {
  if (!isHighlighting) return;
  const target = event.target as HTMLElement;
  if (isSidebarElement(target)) return;
  
  event.preventDefault();
  event.stopPropagation();

  const elementInfo = getElementInfo(target);
  const parentInfo = target.parentElement ? getElementInfo(target.parentElement) : null;

  const detailedInfo = {
    element: elementInfo,
    parent: parentInfo
  };

  // Log only once here
  console.log('Selected element:', detailedInfo);

  chrome.runtime.sendMessage({ action: "addSelectedElement", element: detailedInfo });
  isHighlighting = false;
  removeHighlight(target);

  const sidebar = document.getElementById('demopenguin-sidebar') as HTMLIFrameElement;
  if (sidebar && sidebar.contentWindow) {
    sidebar.contentWindow.postMessage({ action: "updateSelectedElements", selectedElements: detailedInfo }, '*');
  }
}

function preventDefaultForEvent(event: Event) {
  if (isHighlighting) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function addGlobalEventListener(eventType: string) {
  document.addEventListener(eventType, preventDefaultForEvent, true);
}

function removeGlobalEventListener(eventType: string) {
  document.removeEventListener(eventType, preventDefaultForEvent, true);
}

const eventsToPrevent = [
  'click', 'dblclick', 'mousedown', 'mouseup', 'touchstart', 'touchend',
  'keydown', 'keyup', 'keypress', 'submit', 'change', 'input'
];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!isAllowedUrl()) return;

  if (request.action === "toggleHighlight") {
    isHighlighting = request.isHighlighting;
    if (isHighlighting) {
      document.addEventListener('mouseover', handleMouseOver, true);
      document.addEventListener('mouseout', handleMouseOut, true);
      document.addEventListener('click', handleClick, true);
      eventsToPrevent.forEach(addGlobalEventListener);
    } else {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      document.removeEventListener('click', handleClick, true);
      eventsToPrevent.forEach(removeGlobalEventListener);
    }
  } else if (request.action === "toggleSidebar") {
    toggleSidebar();
  } else if (request.action === "updateSelectedElements") {
    const sidebar = document.getElementById('demopenguin-sidebar') as HTMLIFrameElement;
    if (sidebar && sidebar.contentWindow) {
      sidebar.contentWindow.postMessage({ action: "updateSelectedElements", selectedElements: request.selectedElements }, '*');
    }
  } else if (request.action === "closeSidebar") {
    const sidebar = document.getElementById('demopenguin-sidebar') as HTMLIFrameElement;
    const toggleButton = document.getElementById('demopenguin-toggle');
    if (sidebar && toggleButton) {
      sidebarOpen = false;
      sidebar.style.right = '-300px';
      toggleButton.style.display = 'block';
    }
  }
});

export {};

