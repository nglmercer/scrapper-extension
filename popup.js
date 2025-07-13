// Mantén tu función openTab como estaba
function openTab(evt, tabName) {
  let i, tabcontent, tablinks;

  // Ocultar todo el contenido de las pestañas
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Quitar la clase "active" de todos los botones de pestaña
  tablinks = document.getElementsByClassName("tablink");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Mostrar el contenido de la pestaña actual y marcar el botón como activo
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

function initializetabs() {
  const tabIds = ["general", "avanzado", "apariencia"];
  tabIds.forEach((id) => {
    const elementName = "openTab" + id;
    const button = document.getElementById(elementName);
    console.log("button", button, elementName);
    // Verificamos que el botón exista antes de asignarle un evento
    if (button) {
      // Usamos addEventListener que es la práctica recomendada
      button.addEventListener("click", function (event) {
        // 'event' aquí es el objeto real del evento de clic
        openTab(event, id);
      });
    }
  });
  console.log("initializetabs");

  console.log("tabIds", "openTab", { tabIds, openTab });
}
function redirectlistener() {
  const redirect_input = document.getElementById("uniqueId_channel");
  redirect_input.value = window.localStorage.getItem("uniqueId_channel") || "";
  const redirectForm = document.getElementById("redirectForm");
  if (!redirect_input || !redirectForm) return;

  redirectForm.addEventListener("submit", (e) => {
    e.preventDefault();
    console.log(redirect_input.value);
    window.localStorage.setItem("uniqueId_channel", redirect_input.value);
    redirectToTikTok(redirect_input.value);
    // O abrir en nueva pestaña: window.open(redirect, '_blank');
  });
}
async function redirectToTikTok(value) {
  if (!value) return;
  const urlBase = "https://www.tiktok.com/@{uniqueId}/live";
  const redirect = urlBase.replace("{uniqueId}", value);
  if (!chrome?.tabs) {
    console.error("chrome.tabs no está disponible");
    return;
  }
  try {
    // Para nueva pestaña
    await chrome.tabs.create({ url: redirect });

    // O para redirigir pestaña actual
    // const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // await chrome.tabs.update(tab.id, { url: redirect });
  } catch (error) {
    console.error("Error al redirigir:", error);
  }
}
/**
 * Array de configuración. Cada objeto define un grupo de elementos a gestionar.
 * Aquí hemos puesto la configuración de tu Webhook.
 */
const optionsConfig = [
  {
    optionId: "WebhookOption", // El ID de tu checkbox
    containerId: "WebhookOption_container", // El ID del contenedor a ocultar/mostrar
    inputId: "WebhookUrl", // El ID de tu campo de texto
    defaultInput: "", // Valor por defecto para el campo de texto
    storageKey: "WebhookUrl", // La clave para guardar la URL en el storage
    optionStorageKey: "WebhookOption", // La clave para guardar el estado (on/off) en el storage
  },
  {
    optionId: "OpenWindow", // El ID de tu checkbox
    containerId: "OpenWindow_container", // El ID del contenedor a ocultar/mostrar
    inputId: "WindowUrl", // El ID de tu campo de texto
    defaultInput: "https://nglmercer.github.io/multistreamASTRO/chat", // Valor por defecto para el campo de texto
    storageKey: "WindowUrl", // La clave para guardar la URL en el storage
    optionStorageKey: "OpenWindow", // La clave para guardar el estado (on/off) en el storage
  },
  // ¡Añade aquí más objetos para nuevas opciones!
  // {
  //     optionId: "OtraOpcion",
  //     containerId: "otro_container",
  //     inputId: "OtroInput",
  //     storageKey: "otroValor",
  //     optionStorageKey: "OtraOpcion"
  // }
];

/**
 * Función genérica que configura los listeners para cualquier opción definida en el array.
 * @param {object} config - Un objeto del array optionsConfig.
 */
function setupOptionListeners(config) {
  const optionCheckbox = document.getElementById(config.optionId);
  const container = document.getElementById(config.containerId);
  const inputField = document.getElementById(config.inputId);

  // Si algún elemento esencial no se encuentra, salta esta configuración.
  if (!optionCheckbox || !container || !inputField) {
    console.warn(
      `Advertencia: Faltan elementos para la configuración con ID "${config.optionId}".`
    );
    return;
  }

  // 1. Lógica para mostrar/ocultar el contenedor
  const toggleContainerVisibility = () => {
    container.style.display = optionCheckbox.checked ? "flex" : "none";
  };

  // Recupera y establece el estado inicial del checkbox
  optionCheckbox.checked =
    window.localStorage.getItem(config.optionStorageKey) === "true";
  toggleContainerVisibility(); // Muestra u oculta el contenedor al cargar

  // Listener para cuando cambia el checkbox
  optionCheckbox.addEventListener("change", () => {
    const isChecked = optionCheckbox.checked;
    toggleContainerVisibility();
    window.localStorage.setItem(config.optionStorageKey, isChecked);
    chrome.storage.local.set({ [config.optionStorageKey]: isChecked });
  });

  // 2. Lógica para guardar el valor del campo de texto
  // Recupera y establece el valor inicial del input
  inputField.value =
    window.localStorage.getItem(config.storageKey) || config.defaultInput || "";
    chrome.storage.local.set({ [config.storageKey]: inputField.value });
  // Listener para cuando cambia el input
  inputField.addEventListener("change", () => {
    const value = inputField.value;
    window.localStorage.setItem(config.storageKey, value);
    chrome.storage.local.set({ [config.storageKey]: value });
  });
}
function resetOptions(arrayStrings) {
    if (!arrayStrings || !Array.isArray(arrayStrings)) {
        console.error("Error: El argumento debe ser un array de strings.");
        return;
    }
    
    chrome.storage.local.remove(arrayStrings);
    arrayStrings.forEach(key => window.localStorage.removeItem(key));
    const resetElements = arrayStrings
        .map((key) => {
        return document.getElementById(key);
        })
        .filter(Boolean); // Filtra los elementos que no son falsy
    resetElements.forEach((element) => {
        if (element.type === "checkbox") {
            element.checked = false;
            const container = document.getElementById(`${element.id}_container`);
            if (container) {
                container.style.display = "none";
            }
        } else if (element.type === "text") {
            element.value = "";
        }
    });
}
/**
 * Función principal que recorre todas las configuraciones y las inicializa.
 */
function initializeFormOptions() {
  optionsConfig.forEach(setupOptionListeners);
}

document.addEventListener("DOMContentLoaded", () => {
  initializetabs();
  redirectlistener();
  initializeFormOptions();
  const resetButton = document.getElementById("resetButton");
  resetButton.addEventListener("click", () => {
    resetOptions(optionsConfig.map((config) => config.optionStorageKey));
    resetOptions(optionsConfig.map((config) => config.storageKey));
  });
});
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  const { type, payload } = request;
  console.log("popup", request);
});
