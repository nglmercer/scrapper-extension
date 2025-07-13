// injected.js - Este script se ejecuta en el contexto de la página

// Variables globales para debug
let debugStats = {
    scriptsLoaded: 0,
    websocketsIntercepted: 0,
    messagesReceived: 0,
    messagesDecoded: 0,
    messagesSent: 0,
    errors: 0,
    acksSent: 0,
    startTime: Date.now()
};

// Función de debug centralizada
function debugLog(category, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [Interceptor:${category}]`;
   
    if (data) {
        console.log(`${prefix} ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`);
    }
}

// Función para mostrar estadísticas periódicas
function showStats() {
    const uptime = Math.floor((Date.now() - debugStats.startTime) / 1000);
    debugLog('STATS', `Uptime: ${uptime}s | Scripts: ${debugStats.scriptsLoaded}/2 | WebSockets: ${debugStats.websocketsIntercepted} | Messages: ${debugStats.messagesReceived}/${debugStats.messagesDecoded}/${debugStats.messagesSent} | Errors: ${debugStats.errors}`);
}

// Función para enviar eventos a content script
function sendToContentScript(eventName, data,type = 'KICK_LIVE_EVENT') {
    const payload = {
        eventName,
        data,
        timestamp: Date.now()
    };
    window.postMessage({
        type,
        payload
    }, '*');
}
/**
 * Intenta parsear un valor a JSON de forma segura, con correcciones automáticas
 * @param {*} value - El valor a parsear
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.strict - Si es true, no intenta correcciones automáticas
 * @param {boolean} options.silent - Si es true, no muestra errores en consola
 * @returns {*} El valor parseado o el valor original si no se puede parsear
 */
function safeParse(value, options = {}) {
    const { strict = false, silent = false } = options;
    
    try {
        // Si ya es un array u objeto (pero no null), lo devolvemos tal cual
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
            return value;
        }
        
        // Si no es un string, lo devolvemos sin cambios
        if (typeof value !== 'string') {
            return value;
        }
        
        // Limpiar espacios en blanco
        const trimmedValue = value.trim();
        
        // Si es una cadena vacía, devolver como está
        if (!trimmedValue) {
            return value;
        }
        
        // Verificar si parece JSON válido
        if (!isLikelyJson(trimmedValue)) {
            return value;
        }
        
        // Intentar parseo normal primero
        try {
            return JSON.parse(trimmedValue);
        } catch (parseError) {
            // Si está en modo estricto, no intentar correcciones
            if (strict) {
                throw parseError;
            }
            
            // Intentar correcciones automáticas
            const correctedJson = attemptJsonCorrection(trimmedValue);
            
            if (correctedJson !== null) {
                try {
                    return JSON.parse(correctedJson);
                } catch (correctionError) {
                    if (!silent) {
                        console.warn("Error al parsear JSON corregido:", correctionError);
                    }
                    throw correctionError;
                }
            }
            
            throw parseError;
        }
    } catch (error) {
        if (!silent) {
            console.error("Error en safeParse:", {
                error: error.message,
                value: typeof value === 'string' ? value.substring(0, 100) + '...' : value,
                type: typeof value
            });
        }
        return value;
    }
}

/**
 * Determina si un string parece ser JSON
 * @param {string} str - String a evaluar
 * @returns {boolean} True si parece JSON
 */
function isLikelyJson(str) {
    // Debe empezar con { o [
    const firstChar = str.charAt(0);
    const lastChar = str.charAt(str.length - 1);
    
    return (
        (firstChar === '{' && lastChar === '}') ||
        (firstChar === '[' && lastChar === ']')
    );
}

/**
 * Intenta corregir JSON malformado
 * @param {string} jsonString - String JSON a corregir
 * @returns {string|null} JSON corregido o null si no se puede corregir
 */
function attemptJsonCorrection(jsonString) {
    try {
        let corrected = jsonString;
        
        // Corrección 1: Agregar comillas a las claves
        corrected = corrected.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
        
        // Corrección 2: Reemplazar comillas simples por dobles en valores string
        corrected = corrected.replace(/:\s*'([^'\\]*(\\.[^'\\]*)*)'/g, ': "$1"');
        
        // Corrección 3: Corregir valores booleanos y null mal escritos
        corrected = corrected.replace(/:\s*(true|false|null)\s*([,}\]])/gi, (match, p1, p2) => {
            return ': ' + p1.toLowerCase() + p2;
        });
        
        // Corrección 4: Eliminar comas finales
        corrected = corrected.replace(/,(\s*[}\]])/g, '$1');
        
        // Corrección 5: Agregar comillas a valores que parecen strings pero no las tienen
        corrected = corrected.replace(/:\s*([a-zA-Z][a-zA-Z0-9\s]*)\s*([,}\]])/g, (match, p1, p2) => {
            // No corregir si ya es un valor válido (true, false, null, número)
            if (/^(true|false|null|\d+\.?\d*)$/i.test(p1.trim())) {
                return match;
            }
            return ': "' + p1.trim() + '"' + p2;
        });
        
        // Corrección 6: Escapar comillas dobles no escapadas dentro de strings
        corrected = corrected.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"(?=\s*[,}\]])/g, (match, content) => {
            const escaped = content.replace(/(?<!\\)"/g, '\\"');
            return '"' + escaped + '"';
        });
        
        return corrected;
    } catch (error) {
        return null;
    }
}

// Función auxiliar para casos de uso comunes
function parseJsonSafely(jsonString) {
    return safeParse(jsonString, { strict: false, silent: false });
}

// Versión estricta que no intenta correcciones
function parseJsonStrict(jsonString) {
    return safeParse(jsonString, { strict: true, silent: false });
}

// Versión silenciosa que no muestra errores
function parseJsonSilent(jsonString) {
    return safeParse(jsonString, { strict: false, silent: true });
}

/**
 * Clase para interceptar, depurar y manipular el tráfico de WebSockets.
 * Es configurable para apuntar a URLs específicas y manejar mensajes con lógica personalizada.
 */ 
class WebSocketInterceptor {
    /**
     * @param {object} options - Opciones de configuración.
     * @param {function(string): boolean} options.urlFilter - Función que retorna true si la URL debe ser interceptada.
     * @param {function(Event, WebSocket): Promise<void>} options.onMessage - Callback asíncrono para manejar mensajes entrantes.
     */
    constructor(options) {
        // Validar que las opciones necesarias estén presentes
        if (!options || typeof options.urlFilter !== 'function' || typeof options.onMessage !== 'function') {
            throw new Error('WebSocketInterceptor requiere las opciones "urlFilter" y "onMessage".');
        }
        this.options = options;
        this.originalWebSocket = window.WebSocket;
        this.sockets = []; // Almacena los sockets interceptados

        this.intercept();
        debugLog('INIT', 'WebSocketInterceptor listo y configurado.');
    }

    intercept() {
        const self = this;

        // Sobrescribir el constructor global de WebSocket
        window.WebSocket = function(...args) {
            const url = args[0]; // La URL es el primer argumento
            const socket = new self.originalWebSocket(...args); // Crear la instancia real primero

            debugLog('INTERCEPT', `Nueva solicitud de WebSocket para: ${url}`);

            // --- Lógica de Interceptación Específica ---
            // Usar el filtro proporcionado en las opciones para decidir si interceptar
            if (self.options.urlFilter(url)) {
                debugLog('MATCH', `🎯 URL COINCIDE. Interceptando WebSocket para: ${url}`);
                debugStats.websocketsIntercepted++;

                const trackedSocket = { socket: socket, url: url };
                self.sockets.push(trackedSocket);

                // Adjuntar listeners de ciclo de vida y de mensaje
                self.attachListeners(socket, url);
            } else {
                // Si la URL no coincide, devolvemos el socket original sin modificar
                debugLog('INTERCEPT', `URL no coincide. Omitiendo interceptor para: ${url}`);
            }

            return socket;
        };

        // Mantener el prototipo y propiedades estáticas del WebSocket original
        window.WebSocket.prototype = this.originalWebSocket.prototype;
        Object.setPrototypeOf(window.WebSocket, this.originalWebSocket);
    }

    attachListeners(socket, url) {
        const self = this;

        socket.addEventListener('open', () => {
            debugLog('LIFECYCLE', `✅ Conexión WebSocket ABIERTA para: ${url}`);
        });

        socket.addEventListener('close', (event) => {
            debugLog('LIFECYCLE', `❌ Conexión WebSocket CERRADA para: ${url} (Código: ${event.code})`);
            // Eliminar el socket del array de seguimiento
            self.sockets = self.sockets.filter(s => s.socket !== socket);
        });

        socket.addEventListener('error', (event) => {
            debugStats.errors++;
            debugLog('ERROR', `❗️ Error en WebSocket para: ${url}`, event);
        });

        // El listener de mensajes ahora llama al callback 'onMessage' proporcionado
        socket.addEventListener('message', (event) => {
            // Pasamos tanto el evento como el propio socket al manejador,
            // para que pueda, por ejemplo, enviar una respuesta (ACK).
            self.options.onMessage(event, socket);
        });
    }

    /**
     * Reenvía un mensaje a través de un socket interceptado específico.
     * @param {string|ArrayBuffer} message - El mensaje a reenviar.
     * @param {number} [socketIndex=0] - El índice del socket a través del cual se reenviará el mensaje.
     */
    resendMessage(message, socketIndex = 0) {
        if (this.sockets.length > socketIndex) {
            const trackedSocket = this.sockets[socketIndex];
            if (trackedSocket.socket.readyState === this.originalWebSocket.OPEN) {
                debugLog('RESEND', `Reenviando mensaje al socket ${socketIndex} (${trackedSocket.url}):`, message);
                trackedSocket.socket.send(message);
                return true;
            } else {
                debugLog('ERROR', `No se puede reenviar. Socket ${socketIndex} no está en estado OPEN.`);
                return false;
            }
        } else {
            debugLog('ERROR', `No se encontró el socket con índice ${socketIndex}.`);
            return false;
        }
    }
}

// --- Función principal de inicialización ---
(async () => {
    debugLog('INIT', 'Script inyectado iniciando...');
    function handleKickMessage(e,ws){
      if (!e.data || typeof e.data !== 'string') {
        return;
      }
      debugStats.messagesReceived++;
      const {event,data} = safeParse(e.data);
      const parsedData = safeParse(data);
      sendToContentScript(event, { event, data: parsedData });
      debugLog('MESSAGE', `Mensaje recibido:`, { event, data: parsedData });
    }
    // Instanciar el interceptor
        const interceptor = new WebSocketInterceptor({
        onMessage: handleKickMessage,
        urlFilter: () => {
          return true; // Aquí puedes agregar lógica para filtrar URLs específicas
        }
    });
    
    // (Opcional) Exponer el interceptor para debug manual en la consola del navegador
    //window.wsInterceptor = interceptor;
    // Ejemplo de uso en consola:
    // window.wsInterceptor.resendMessage('{"event":"pusher:ping","data":{}}');

    debugLog('INIT', '🎉 Interceptor inicializado correctamente',interceptor);
       
    // Mostrar estadísticas periódicamente
    setInterval(showStats, 10000);
})();