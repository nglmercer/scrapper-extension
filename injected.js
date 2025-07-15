// injected.js - Este script se ejecuta en el contexto de la página

// Esquema Protobuf embebido
const protobufSCHEME = `
syntax = "proto3";
package TikTok;

// @Common
message CommonMessageData {
    string method = 1;
    int64 msgId = 2;
    int64 roomId = 3;
    int64 createTime = 4;
    int32 monitor = 5;
    bool isShowMsg = 6;
    string describe = 7;
    Text displayText = 8;
    int64 foldType = 9;
    int64 anchorFoldType = 10;
    int64 priorityScore = 11;
    string logId = 12;
    string msgProcessFilterK = 13;
    string msgProcessFilterV = 14;
    string fromIdc = 15;
    string toIdc = 16;
    repeated string filterMsgTagsList = 17;
    LiveMessageSEI sei = 18;
    LiveMessageID dependRootId = 19;
    LiveMessageID dependId = 20;
    int64 anchorPriorityScore = 21;
    int64 roomMessageHeatLevel = 22;
    int64 foldTypeForWeb = 23;
    int64 anchorFoldTypeForWeb = 24;
    int64 clientSendTime = 25;
    IMDispatchStrategy dispatchStrategy = 26; // Enum

    message LiveMessageSEI {
        LiveMessageID uniqueId = 1;
        int64 timestamp = 2;
    }

    message LiveMessageID {
        string primaryId = 1;
        string messageScene = 2;
    }

    enum IMDispatchStrategy {
        IM_DISPATCH_STRATEGY_DEFAULT = 0;
        IM_DISPATCH_STRATEGY_BYPASS_DISPATCH_QUEUE = 1;
    }
}
// Data structure from im/fetch/ response
message WebcastResponse {
  repeated Message messages = 1;
  string cursor = 2;
  int32 fetchInterval = 3;
  int64 serverTimestamp = 4;
  string internalExt = 5;
  int32 fetchType = 6; // ws (1) or polling (2)
  WebsocketParam wsParam = 7;
  int32 heartbeatDuration = 8;
  bool needAck = 9;
  string wsUrl = 10;
}

message Message {
  string type = 1;
  bytes binary = 2;
}

message WebsocketParam {
  string name = 1;
  string value = 2;
}

// Message types depending on Message.type
message WebcastControlMessage {
  int32 action = 2;
}

// Statistics like viewer count
message WebcastRoomUserSeqMessage {
  repeated TopUser topViewers = 2;
  int32 viewerCount = 3;
}

message TopUser {
  uint64 coinCount = 1;
  User user = 2;
}

message WebcastChatMessage {
  WebcastMessageEvent event = 1;
  User user = 2;
  string comment = 3;
  repeated WebcastSubEmote emotes = 13;
}

// Chat Emotes (Subscriber)
message WebcastEmoteChatMessage {
  User user = 2;
  EmoteDetails emote = 3;
}

message WebcastSubEmote {
 int32 placeInComment = 1; //starting at 0, you insert the emote itself into the comment at that place
 EmoteDetails emote = 2;
}

message WebcastMemberMessage {
  WebcastMessageEvent event = 1;
  User user = 2;
  int32 actionId = 10;
}

message WebcastGiftMessage {
  WebcastMessageEvent event = 1;
  int32 giftId = 2;
  int32 repeatCount = 5;
  User user = 7;
  int32 repeatEnd = 9;
  uint64 groupId = 11;
  WebcastGiftMessageGiftDetails giftDetails = 15;
  string monitorExtra = 22;
  WebcastGiftMessageGiftExtra giftExtra = 23;
}

message WebcastGiftMessageGiftDetails {
  WebcastGiftMessageGiftImage giftImage = 1;
  string giftName = 16;
  string describe = 2;
  int32 giftType = 11;
  int32 diamondCount = 12;
}

message WebcastGiftMessageGiftExtra {
  uint64 timestamp = 6;
  uint64 receiverUserId = 8;
}

message WebcastGiftMessageGiftImage {
  string giftPictureUrl = 1;
}

// Battle start
message WebcastLinkMicBattle {
  repeated WebcastLinkMicBattleItems battleUsers = 10;
}

message WebcastLinkMicBattleItems {
  WebcastLinkMicBattleGroup battleGroup = 2;
}

message WebcastLinkMicBattleGroup {
  LinkUser user = 1;
}

// Battle status
message WebcastLinkMicArmies {
  repeated WebcastLinkMicArmiesItems battleItems = 3;
  int32 battleStatus = 7;
}

message WebcastLinkMicArmiesItems {
  uint64 hostUserId = 1;
  repeated WebcastLinkMicArmiesGroup battleGroups = 2;
}

message WebcastLinkMicArmiesGroup {
  repeated User users = 1;
  int32 points = 2;
}

// Follow & share event
message WebcastSocialMessage {
  WebcastMessageEvent event = 1;
  User user = 2;
}

// Like event (is only sent from time to time, not with every like)
message WebcastLikeMessage {
  WebcastMessageEvent event = 1;
  User user = 5;
  int32 likeCount = 2;
  int32 totalLikeCount = 3;
}

// New question event
message WebcastQuestionNewMessage {
  QuestionDetails questionDetails = 2;
}

message QuestionDetails {
  string questionText = 2;
  User user = 5;
}

message WebcastMessageEvent {
  uint64 msgId = 2;
  uint64 createTime = 4;
  WebcastMessageEventDetails eventDetails = 8;
}

// Contains UI information
message WebcastMessageEventDetails {
  string displayType = 1;
  string label = 2;
}

// Source: Co-opted https://github.com/zerodytrash/TikTok-Livestream-Chat-Connector/issues/19#issuecomment-1074150342
message WebcastLiveIntroMessage {
  uint64 id = 2;
  string description = 4;
  User user = 5;
}

message SystemMessage {
  string description = 2;
}

message WebcastInRoomBannerMessage {
  string data = 2;
}

message RankItem {
  string colour = 1;
  uint64 id = 4;
}

message WeeklyRanking {
  string type = 1;
  string label = 2;
  RankItem rank = 3;
}

message RankContainer {
  WeeklyRanking rankings = 4;
}

message WebcastHourlyRankMessage {
  RankContainer data = 2;
}

message EmoteDetails {
  string emoteId = 1;
  EmoteImage image = 2;
}

message EmoteImage {
  string imageUrl = 1;
}

// Envelope (treasure boxes)
message WebcastEnvelopeMessage {
  TreasureBoxData treasureBoxData = 2;
  TreasureBoxUser treasureBoxUser = 1;
}

message TreasureBoxUser {
  TreasureBoxUser2 user2 = 8;
}

message TreasureBoxUser2 {
  repeated TreasureBoxUser3 user3 = 4;
}

message TreasureBoxUser3 {
  TreasureBoxUser4 user4 = 21;
}

message TreasureBoxUser4 {
  User user = 1;
}

message TreasureBoxData {
  uint32 coins = 5;
  uint32 canOpen = 6;
  uint64 timestamp = 7;
}

// New Subscriber message
message WebcastSubNotifyMessage {
  WebcastMessageEvent event = 1;
  User user = 2;
  int32 exhibitionType = 3;
  int32 subMonth = 4;
  int32 subscribeType = 5;
  int32 oldSubscribeStatus = 6;
  int32 subscribingStatus = 8;
}

// ==================================
// Generic stuff

message User {
  uint64 userId = 1;
  string nickname = 3;
  ProfilePicture profilePicture = 9;
  string uniqueId = 38;
  string secUid = 46;
  repeated UserBadgesAttributes badges = 64;
  uint64 createTime = 16;
  string bioDescription = 5;
  FollowInfo followInfo = 22;
}

message FollowInfo {
  int32 followingCount = 1;
  int32 followerCount = 2;
  int32 followStatus = 3;
  int32 pushStatus = 4;
}

message LinkUser {
  uint64 userId = 1;
  string nickname = 2;
  ProfilePicture profilePicture = 3;
  string uniqueId = 4;
}

message ProfilePicture {
  repeated string urls = 1;
}

message UserBadgesAttributes {
  int32 badgeSceneType = 3;
  repeated UserImageBadge imageBadges = 20;
  repeated UserBadge badges = 21;
  PrivilegeLogExtra privilegeLogExtra = 12;
}

message PrivilegeLogExtra {
  string privilegeId = 2;
  string level = 5;
}

message UserBadge {
  string type = 2;
  string name = 3;
}

message UserImageBadge {
  int32 displayType = 1;
  UserImageBadgeImage image = 2;
}

message UserImageBadgeImage {
  string url = 1;
}

// Websocket incoming message structure
message WebcastWebsocketMessage {
  uint64 id = 2;
  string type = 7;
  bytes binary = 8;
}

// Websocket acknowledgment message
message WebcastWebsocketAck {
  uint64 id = 2;
  string type = 7;
}
`;
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
    debugLog('STATS', '📊 Estadísticas periódicas', {
        ...debugStats,
        uptime
    });
}

// Función para enviar eventos a content script
function sendToContentScript(eventName, data,type = 'TIKTOK_LIVE_EVENT') {
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

// Función para descomprimir GZIP
async function decompressGzip(gzipBuffer) {
    
    if (!window.DecompressionStream) {
        debugLog('GZIP', '❌ DecompressionStream no disponible, devolviendo buffer original');
        return gzipBuffer;
    }
    
    try {
        const ds = new DecompressionStream('gzip');
        const writer = ds.writable.getWriter();
        writer.write(gzipBuffer);
        writer.close();

        const reader = ds.readable.getReader();
        const chunks = [];
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        const totalLength = chunks.reduce((acc, val) => acc + val.length, 0);
        const concatenated = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            concatenated.set(chunk, offset);
            offset += chunk.length;
        }
        
        return concatenated;
    } catch (error) {
        debugStats.errors++;
        debugLog('GZIP', '❌ Error en descompresión:', error);
        throw error;
    }
}

// Función para esperar a que protobuf esté disponible
// Variable global para almacenar la versión full
let protobufFull = null;

function waitForProtobuf(maxWaitTime = 10000) {
    const startTime = Date.now();
    
    // Polling síncrono más frecuente y preciso
    while (Date.now() - startTime < maxWaitTime) {
        // Verificar si tenemos la versión full disponible PRIMERO
        if (window.protobuf && window.protobuf.build === 'full' && window.protobuf.parse) {
            protobufFull = window.protobuf; // Guardar la versión full inmediatamente
            debugLog('WAIT', '✅ Protobuf FULL capturado y guardado');
            return protobufFull;
        }
        
        // Si ya tenemos la versión full guardada, usarla
        if (protobufFull && protobufFull.parse) {
            debugLog('WAIT', '✅ Usando protobuf FULL previamente guardado');
            return protobufFull;
        }
        
        // Verificar protobuf global
        if (typeof protobuf !== 'undefined' && protobuf.parse) {
            if (protobuf.build === 'full') {
                protobufFull = protobuf;
                debugLog('WAIT', '✅ Protobuf FULL encontrado en variable global');
                return protobufFull;
            }
        }
        
        // Polling cada 50ms para mayor precisión
        const now = Date.now();
        while (Date.now() - now < 50) {
            // Busy wait más preciso
        }
    }
    
    // Si llegamos aquí, usar lo que tengamos disponible
    console.warn('⚠️ No se encontró protobuf FULL, usando versión disponible');
    const fallback = protobufFull || protobuf || window.protobuf;
    
    if (!fallback) {
        throw new Error('❌ Protobuf no disponible después del timeout');
    }
    
    debugLog('WAIT', '⚠️ Protobuf fallback', {
        protobuf: fallback,
        build: fallback.build,
        hasParseFunction: typeof fallback.parse === 'function'
    });
    
    return fallback;
}


// Alternativa más agresiva: MutationObserver para detectar cambios
function setupProtobufProtection() {
    // Guardar referencia inicial si existe
    if (window.protobuf && window.protobuf.build === 'full' && window.protobuf.parse) {
        protobufFull = window.protobuf;
        console.log('🔒 Protobuf FULL inicial guardado');
    }
    
    // Observar cambios en el DOM para detectar nuevos scripts
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'SCRIPT') {
                        // Verificar después de que se ejecute el script
                        requestAnimationFrame(() => {
                            if (window.protobuf && window.protobuf.build === 'full' && window.protobuf.parse && !protobufFull) {
                                protobufFull = window.protobuf;
                                console.log('🔒 Protobuf FULL capturado via MutationObserver');
                            }
                        });
                    }
                });
            }
        });
    });
    
    observer.observe(document.head, { childList: true, subtree: true });
    observer.observe(document.body, { childList: true, subtree: true });
    
    return observer;
}

// Inicializar protección al cargar
setupProtobufProtection();
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
const reconnectLog = (label, ...args) => console.log(`[WebSocketReconnector|${label}]`, ...args);

class WebSocketReconnector {
    /**
     * @param {object} [options] - Opciones de configuración para la reconexión.
     * @param {number} [options.initialDelay=1000] - Retraso inicial en ms.
     * @param {number} [options.maxDelay=30000] - Retraso máximo en ms.
     * @param {number} [options.backoffFactor=2] - Factor por el cual se multiplica el retraso en cada intento.
     * @param {number} [options.maxRetries=10] - Número máximo de intentos. -1 para infinitos.
     * @param {number[]} [options.reconnectOnCodes=[1006]] - Códigos de cierre que deben activar la reconexión.
     */
    constructor(options = {}) {
        this.config = {
            initialDelay: options.initialDelay || 1000,
            maxDelay: options.maxDelay || 30000,
            backoffFactor: options.backoffFactor || 2,
            maxRetries: options.maxRetries !== undefined ? options.maxRetries : 10,
            reconnectOnCodes: options.reconnectOnCodes || [1006], // 1006: Cierre anormal
        };

        this.reconnectAttempts = 0;
        this.timerId = null;
        this.isReconnecting = false;
        
        // El método que se pasará al interceptor necesita tener el 'this' correcto.
        this.handleDisconnection = this.handleDisconnection.bind(this);

        reconnectLog('INIT', 'Reconnector listo para manejar desconexiones.');
    }

    /**
     * Este método se utiliza como callback para el 'onClose' del interceptor.
     * @param {CloseEvent} event - El evento de cierre del WebSocket.
     * @param {string} url - La URL del WebSocket que se cerró.
     * @param {string[]} protocols - Los protocolos del WebSocket.
     */
    handleDisconnection(event, url, protocols) {
        if (this.isReconnecting) {
            reconnectLog('SKIP', 'Ya hay un proceso de reconexión en curso.');
            return;
        }

        // Decidir si debemos intentar reconectar basados en el código de cierre.
        if (this.config.reconnectOnCodes.includes(event.code)) {
            reconnectLog('TRIGGER', `Cierre con código ${event.code} detectado para ${url}. Iniciando reconexión.`);
            this._startReconnection(url, protocols);
        } else {
            reconnectLog('INFO', `Cierre con código ${event.code}. No se requiere reconexión según la configuración.`);
        }
    }

    /**
     * Inicia el proceso de reconexión.
     * @private
     */
    _startReconnection(url, protocols) {
        this.isReconnecting = true;
        this.reconnectAttempts = 0;
        this._scheduleReconnect(url, protocols);
    }

    /**
     * Agenda el próximo intento de reconexión usando exponential backoff.
     * @private
     */
    _scheduleReconnect(url, protocols) {
        if (this.config.maxRetries !== -1 && this.reconnectAttempts >= this.config.maxRetries) {
            reconnectLog('FAIL', 'Se alcanzó el número máximo de reintentos. Abandonando.');
            this.stop();
            return;
        }

        const delay = Math.min(
            this.config.initialDelay * Math.pow(this.config.backoffFactor, this.reconnectAttempts),
            this.config.maxDelay
        );

        reconnectLog('SCHEDULE', `Siguiente intento de reconexión en ${delay}ms (Intento #${this.reconnectAttempts + 1}).`);

        this.timerId = setTimeout(() => {
            this._attemptReconnect(url, protocols);
        }, delay);
    }
    
    /**
     * Ejecuta el intento de crear una nueva conexión WebSocket.
     * @private
     */
    _attemptReconnect(url, protocols) {
        reconnectLog('ATTEMPT', `Intentando reconectar a: ${url}`);
        this.reconnectAttempts++;

        try {
            // ¡La magia sucede aquí! Al crear un nuevo WebSocket, el interceptor lo
            // capturará automáticamente. Si la conexión tiene éxito, el ciclo de
            // reconexión se detendrá naturalmente. Si falla, el evento 'close'
            // se disparará de nuevo, y `handleDisconnection` iniciará otro ciclo.
            const newSocket = new WebSocket(url, protocols);

            // Escuchamos el evento 'open' una sola vez para saber que tuvimos éxito.
            newSocket.addEventListener('open', () => {
                reconnectLog('SUCCESS', `Reconexión exitosa a ${url}.`);
                this.stop(); // Detenemos el ciclo de reintentos.
            }, { once: true });

        } catch (error) {
            reconnectLog('ERROR', 'Error al intentar crear el nuevo socket.', error);
            // Si la creación falla, agendamos el siguiente reintento.
            this._scheduleReconnect(url, protocols);
        }
    }

    /**
     * Detiene cualquier intento de reconexión en curso.
     */
    stop() {
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        reconnectLog('STOP', 'Proceso de reconexión detenido.');
    }
}
class WebSocketInterceptor {
    /**
     * @param {object} options - Opciones de configuración.
     * @param {function(string): boolean} options.urlFilter - Función que retorna true si la URL debe ser interceptada.
     * @param {function(Event, WebSocket): Promise<void>} options.onMessage - Callback para manejar mensajes.
     * @param {function(Event, string, string[]): void} [options.onClose] - // NUEVO: Callback opcional para manejar el cierre de la conexión.
     */
    constructor(options) {
        if (!options || typeof options.urlFilter !== 'function' || typeof options.onMessage !== 'function') {
            throw new Error('WebSocketInterceptor requiere las opciones "urlFilter" y "onMessage".');
        }
        this.options = options;
        this.originalWebSocket = window.WebSocket;
        this.sockets = [];

        this.intercept();
        debugLog('INIT', 'WebSocketInterceptor listo y configurado.');
    }

    intercept() {
        const self = this;

        window.WebSocket = function(...args) {
            const url = args[0];
            const protocols = args[1]; // NUEVO: Capturar los protocolos
            const socket = new self.originalWebSocket(...args);

            debugLog('INTERCEPT', `Nueva solicitud de WebSocket para: ${url}`);

            if (self.options.urlFilter(url)) {
                debugLog('MATCH', `🎯 URL COINCIDE. Interceptando WebSocket para: ${url}`);
                debugStats.websocketsIntercepted++;

                // NUEVO: Almacenamos también los protocolos para la reconexión.
                const trackedSocket = { socket, url, protocols };
                self.sockets.push(trackedSocket);

                // NUEVO: Pasamos los protocolos a los listeners.
                self.attachListeners(socket, url, protocols);
            } else {
                debugLog('INTERCEPT', `URL no coincide. Omitiendo interceptor para: ${url}`);
            }

            return socket;
        };

        window.WebSocket.prototype = this.originalWebSocket.prototype;
        Object.setPrototypeOf(window.WebSocket, this.originalWebSocket);
    }

    // NUEVO: El método ahora acepta 'protocols'.
    attachListeners(socket, url, protocols) {
        const self = this;

        socket.addEventListener('open', () => {
            debugLog('LIFECYCLE', `✅ Conexión WebSocket ABIERTA para: ${url}`);
        });

        socket.addEventListener('close', (event) => {
            debugLog('LIFECYCLE', `❌ Conexión WebSocket CERRADA para: ${url} (Código: ${event.code})`);
            self.sockets = self.sockets.filter(s => s.socket !== socket);
            
            // NUEVO: Notificar al sistema externo si el callback 'onClose' fue proporcionado.
            if (typeof self.options.onClose === 'function') {
                self.options.onClose(event, url, protocols);
            }
        });

        socket.addEventListener('error', (event) => {
            debugStats.errors++;
            debugLog('ERROR', `❗️ Error en WebSocket para: ${url}`, event);
        });

        socket.addEventListener('message', (event) => {
            self.options.onMessage(event, socket);
        });
    }

    resendMessage(message, socketIndex = 0) {
        // ... (sin cambios en este método)
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
let ProtobufText = "";
async function getProtobufSchema() {
  const existeProtobufText = localStorage.getItem("ProtobufText");
  console.log("existeProtobufText",existeProtobufText)
  return ProtobufText?.data || protobufSCHEME;
}
window.addEventListener("message", async (event) => {
    if (event.data.type === "PROTOBUF_SCHEMA") {
        ProtobufText = event.data;
        //console.log("ProtobufText", ProtobufText);
        localStorage.setItem("ProtobufText", typeof ProtobufText?.data === "string" ? ProtobufText?.data : JSON.stringify(ProtobufText));
    }
})
// Función principal de inicialización
// (Aquí iría la definición de la clase WebSocketInterceptor del Paso 1)
protobuf = waitForProtobuf();
async function initializeEvents() {
    debugLog('INIT', 'Script inyectado iniciando...');

    
    // Asegurarse de usar la versión correcta
    const protobufInstance = waitForProtobuf();
    const newSCHEME = await getProtobufSchema();
    console.log("newSCHEME", newSCHEME);
    const parsed = protobufInstance.parse(newSCHEME);
    const root = parsed.root;
    const WebcastWebsocketMessage = root.lookupType("TikTok.WebcastWebsocketMessage");
    const WebcastResponse = root.lookupType("TikTok.WebcastResponse");

    const protoMessageTypes = {
        'WebcastChatMessage': 'chat',
        'WebcastGiftMessage': 'gift',
        'WebcastLikeMessage': 'like',
        'WebcastMemberMessage': 'member',
        'WebcastSocialMessage': 'social',
        'WebcastRoomUserSeqMessage': 'roomUser',
        'WebcastSubNotifyMessage': 'subscribe',
    };

    debugLog('INIT', '✅ Esquema protobuf parseado correctamente');

    // --- Funciones de Lógica de Negocio ---

    function serializeMessage(protoName, obj) {
        return root.lookupType(`TikTok.${protoName}`).encode(obj).finish();
    }

    // VERSIÓN CORREGIDA de deserializeWebsocketMessage

    async function deserializeWebsocketMessage(binaryMessage) {
        try {
            const buffer = new Uint8Array(binaryMessage);
            // 1. Decodificar el contenedor EXTERIOR (el sobre)
            const outerMessage = WebcastWebsocketMessage.decode(buffer);

            if (outerMessage.type === 'msg') {
                let binary = outerMessage.binary;
                if (binary && binary.length > 2 && binary[0] === 0x1f && binary[1] === 0x8b) {
                    binary = await decompressGzip(binary);
                }
                
                // 2. Decodificar el contenido INTERIOR (la carta)
                const innerResponse = WebcastResponse.decode(binary);
                
                // 3. ¡SOLUCIÓN! Devolver un objeto con AMBAS partes
                return {
                    outer: outerMessage, // Contiene el .id y .type
                    inner: innerResponse // Contiene .messages y .needAck
                };
            }
            return null;
        } catch (error) {
            debugLog('DECODE', '❌ Error en decodificación:', error);
            return null;
        }
    }

    /**
     * Esta es la función principal que procesará los mensajes de TikTok.
     * La pasaremos como callback a nuestro interceptor.
     * @param {MessageEvent} event - El evento de mensaje original del WebSocket.
     * @param {WebSocket} ws - La instancia del WebSocket que recibió el mensaje.
     */
    async function handleTikTokMessage(event, ws) {
        debugStats.messagesReceived++;
        try {
            // `result` ahora contiene las propiedades `outer` e `inner`
            const result = await deserializeWebsocketMessage(event.data);
            
            // Verificamos que el resultado y el contenido interno existan
            if (result && result.inner && result.inner.messages) {
                debugStats.messagesDecoded++;

                // Procesamos los mensajes de la misma forma que antes
                result.inner.messages.forEach(msg => {
                    const eventName = protoMessageTypes[msg.type] || msg.type;
                    if (eventName) {
                        try {
                            const messageProto = root.lookupType(`TikTok.${msg.type}`);
                            const decodedData = messageProto.decode(msg.binary);
                            sendToContentScript(eventName, decodedData);
                            debugStats.messagesSent++;
                        } catch (err) {
                            debugLog('MESSAGE', `❌ Error decodificando ${msg.type}:`, err);
                        }
                    }
                });

                // ¡LÓGICA DE ACK CORREGIDA!
                // Usamos la bandera `needAck` del contenido interior y el `id` del contenedor exterior.
                if (result.inner.needAck && result.outer.id) {
                    const ackMsg = serializeMessage('WebcastWebsocketAck', {
                        type: 'ack',
                        id: result.outer.id // Usamos el ID del sobre
                    });
                    ws.send(ackMsg);
                    debugStats.acksSent++;
                    debugLog('ACK', `✅ ACK enviado para el id: ${result.outer.id}`);
                }
            }
        } catch (err) {
            debugStats.errors++;
            debugLog('MESSAGE', '❌ Error procesando mensaje:', err);
        }
    }


    // --- Inicialización del Interceptor ---
    const reconnector = new WebSocketReconnector({
        maxRetries: 5,
        initialDelay: 2000 // Empezar con 2 segundos de retraso
    });

    // ¡Aquí es donde ocurre la magia!
    // Creamos una instancia de nuestro interceptor y le pasamos nuestra lógica.
    const interceptortiktok = new WebSocketInterceptor({
        urlFilter: (url) => url && url.includes('tiktok.com'),
        onMessage: handleTikTokMessage,
        onClose: reconnector.handleDisconnection
    });
    
    function handleKickMessage(e,ws){
      if (!e || typeof e.data !== 'string') {
        return;
      }
      debugStats.messagesReceived++;
      const {event,data} = safeParse(e.data);
      const parsedData = safeParse(data);
      sendToContentScript(event, { event, data: parsedData }, 'KICK_LIVE_EVENT');
      debugLog('MESSAGE', `Mensaje recibido:`, { event, data: parsedData });
    }
    
    // Instanciar el interceptor
    const kickinterceptor = new WebSocketInterceptor({
        onMessage: handleKickMessage,
        urlFilter: (url) => {
          return url && url.includes('pusher');
        }
    });

    debugLog('INIT', '🎉 Interceptor de WebSocket inicializado correctamente',{
        tiktok: interceptortiktok,
        kick: kickinterceptor
    });

}
(()=>{
    initializeEvents();
})()