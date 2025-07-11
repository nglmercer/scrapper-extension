/**
 * @file popup.js
 * @description Script para controlar la lógica de la ventana emergente (popup) de la extensión.
 */

/**
 * Espera a que el contenido del DOM del popup se cargue completamente.
 */
document.addEventListener('DOMContentLoaded', () => {
  /**
   * El botón para cambiar el color de fondo de la página.
   * @type {HTMLButtonElement}
   */
  const button = document.getElementById('button');
  if (!button) return;
  /**
   * Agrega un listener para el evento 'click' en el botón.
   * Cuando se hace clic, envía un mensaje al content script de la pestaña activa.
   */
  button.addEventListener('click', async () => {
    /**
     * Obtiene la pestaña activa en la ventana actual.
     * @type {chrome.tabs.Tab}
     */
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    // Envía un mensaje al content script de la pestaña obtenida.
    chrome.tabs.sendMessage(tab.id, {
      action: 'data',
    });
  });
});