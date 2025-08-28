// injected.js - Este script se ejecuta en el contexto de la página

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

// Variable global para almacenar la versión full
let protobufFull = null;

function waitForProtobuf(maxWaitTime = 3000) {
  try {

  
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
        // Polling cada 50ms para mayor precisión
        const now = Date.now();
        while (Date.now() - now < 50) {
            // Busy wait más preciso
        }
    }
    
    // Si llegamos aquí, usar lo que tengamos disponible
    console.warn('⚠️ No se encontró protobuf FULL, usando versión disponible');
    const fallback = protobufFull || window.protobuf;
    
    if (!fallback) {
        throw new Error('❌ Protobuf no disponible después del timeout');
    }
    
    debugLog('WAIT', '⚠️ Protobuf fallback', {
        protobuf: fallback,
        build: fallback.build,
        hasParseFunction: typeof fallback.parse === 'function'
    });
    
    return fallback;
  } catch (e){
    debugLog('WAIT', '❌ Error en waitForProtobuf:', e);
    return null;

  }
}


// Alternativa más agresiva: MutationObserver para detectar cambios
function setupProtobufProtection() {
    // Guardar referencia inicial si existe
    if (window.protobuf && window.protobuf.build === 'full' && window.protobuf.parse) {
        protobufFull = window.protobuf;
        console.log('🔒 Protobuf FULL inicial guardado');
         initializeTikTok();
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
                                initializeTikTok();
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
     ** @param {function(string): boolean} options.urlFilter - Función que retorna true si la URL debe ser interceptada.
     * @param {function(Event, WebSocket): Promise<void>} options.onMessage - Callback asíncrono para manejar mensajes entrantes.
     * @param {boolean} [options.autoReconnect=true] - Habilita o deshabilita la reconexión automática.
     * @param {number} [options.reconnectInterval=2000] - Intervalo inicial en milisegundos para el primer intento de reconexión.
     * @param {number} [options.maxReconnectAttempts=5] - Número máximo de intentos de reconexión consecutivos.
     */
    constructor(options) {
        if (!options || typeof options.urlFilter !== 'function' || typeof options.onMessage !== 'function') {
            throw new Error('WebSocketInterceptor requiere las opciones "urlFilter" y "onMessage".');
        }
        this.options = options;
        this.originalWebSocket = window.WebSocket;
        this.sockets = [];

        this.autoReconnect = options.autoReconnect ?? true;
        this.reconnectInterval = options.reconnectInterval ?? 2000;
        this.maxReconnectAttempts = options.maxReconnectAttempts ?? 2;
        this.reconnectAttempts = {};

        this.intercept();
        // debugLog('INIT', 'WebSocketInterceptor listo y configurado.'); // Suponiendo que tienes una función debugLog
    }

    intercept() {
        const self = this;

        window.WebSocket = function(...args) {
            const url = args[0];
            const protocols = args[1];

            if (self.options.urlFilter(url)) {
                // debugLog('INTERCEPT', `🎯 URL COINCIDE. Interceptando WebSocket para: ${url}`);
                // debugStats.websocketsIntercepted++;

                if (self.reconnectAttempts[url] === undefined) {
                   self.reconnectAttempts[url] = 0;
                }
                
                // Usar una clave única para los intentos de reconexión en lugar de la URL completa, 
                // ya que la URL cambiará en cada reconexión. Podríamos usar un identificador base.
                // Por simplicidad en este ejemplo, seguiremos usando la URL original como clave inicial.
                const reconnectKey = url; 
                if (self.reconnectAttempts[reconnectKey] === undefined) {
                    self.reconnectAttempts[reconnectKey] = 0;
                }

                const socket = new self.originalWebSocket(...args);
                const trackedSocket = { socket: socket, url: url, protocols: protocols, reconnectKey: reconnectKey };
                self.sockets.push(trackedSocket);

                self.attachListeners(socket, url, protocols, reconnectKey);
                return socket;

            } else {
                // debugLog('INTERCEPT', `URL no coincide. Omitiendo interceptor para: ${url}`);
                return new self.originalWebSocket(...args);
            }
        };

        window.WebSocket.prototype = this.originalWebSocket.prototype;
        Object.setPrototypeOf(window.WebSocket, this.originalWebSocket);
    }

    attachListeners(socket, url, protocols, reconnectKey) {
        const self = this;

        socket.addEventListener('open', () => {
            // debugLog('LIFECYCLE', `✅ Conexión WebSocket ABIERTA para: ${url}`);
            self.reconnectAttempts[reconnectKey] = 0;
            // debugLog('RECONNECT', `Contador de intentos para ${reconnectKey} reseteado a 0.`);
        });

        socket.addEventListener('close', (event) => {
            // debugLog('LIFECYCLE', `❌ Conexión WebSocket CERRADA para: ${url} (Código: ${event.code})`);
            self.sockets = self.sockets.filter(s => s.socket !== socket);

            if (!self.autoReconnect) {
                return;
            }

            if (self.reconnectAttempts[reconnectKey] < self.maxReconnectAttempts) {
                self.reconnectAttempts[reconnectKey]++;
                const delay = self.reconnectInterval * Math.pow(2, self.reconnectAttempts[reconnectKey] - 1);

                // debugLog('RECONNECT', `Intento de reconexión #${self.reconnectAttempts[reconnectKey]} para ${reconnectKey} en ${delay}ms...`);

                // <<< CAMBIO COMPLETO: Lógica de reconexión asíncrona para obtener la nueva URL.
                setTimeout(async () => {
                    try {
                            // debugLog('RECONNECT', `Nueva URL obtenida. Intentando conectar a: ${newUrl}`);
                            // Crear una nueva instancia de WebSocket. Esto pasará de nuevo por nuestro interceptor.
                            new window.WebSocket(newUrl, protocols);

                    } catch (error) {
                        // Se detienen los intentos si la función para obtener la URL falla.
                        self.reconnectAttempts[reconnectKey] = self.maxReconnectAttempts;
                    }
                }, delay);

            } else {
                // debugLog('ERROR', `Se alcanzó el número máximo de intentos de reconexión (${self.maxReconnectAttempts}) para ${reconnectKey}.`);
            }
        });

        socket.addEventListener('error', (event) => {
            // debugStats.errors++;
            // debugLog('ERROR', `❗️ Error en WebSocket para: ${url}`, event);
        });

        socket.addEventListener('message', (event) => {
            self.options.onMessage(event, socket);
        });
    }

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
let lastack = {
  id: 0,
  total: 0
}
// =================================================================================
// SECTION 2: LÓGICA ESPECÍFICA PARA TIKTOK
// =================================================================================

async function initializeTikTok() {
    debugLog('INIT', 'Iniciando interceptor para TikTok...');
    
    var protobuf = await waitForProtobuf(1000) || protobufFull;
    let root = null;
    if (protobuf && typeof protobuf.parse === 'function') {
        root = protobuf.parse(protobufSCHEME).root;
    } else if (protobufFull && typeof protobufFull.parse === 'function') {
        root = protobufFull.parse(protobufSCHEME).root;
    } else {
        debugLog('WAIT', '❌ No se pudo obtener una versión de protobuf con .parse. Deteniendo inicialización de TikTok.');
        return;
    }
    console.log("PROTOBUF",{
        protobuf,
        root
    })
    const WebcastWebsocketMessage = root.lookupType("TikTok.WebcastWebsocketMessage");
    const WebcastResponse = root.lookupType("TikTok.WebcastResponse");
    const protoMessageTypes = {
        'WebcastChatMessage': 'chat', 'WebcastGiftMessage': 'gift',
        'WebcastLikeMessage': 'like', 'WebcastMemberMessage': 'member',
        'WebcastSocialMessage': 'social', 'WebcastRoomUserSeqMessage': 'roomUser',
        'WebcastSubNotifyMessage': 'subscribe',
    };
    let lastAckId = 0;

    function serializeMessage(protoName, obj) {
        return root.lookupType(`TikTok.${protoName}`).encode(obj).finish();
    }

    async function deserializeWebsocketMessage(binaryMessage) {
        try {
            const buffer = new Uint8Array(binaryMessage);
            const outerMessage = WebcastWebsocketMessage.decode(buffer);
            if (outerMessage.type === 'msg') {
                let binary = outerMessage.binary;
                if (binary && binary.length > 2 && binary[0] === 0x1f && binary[1] === 0x8b) {
                    binary = await decompressGzip(binary);
                }
                const innerResponse = WebcastResponse.decode(binary);
                return { outer: outerMessage, inner: innerResponse };
            }
            return null;
        } catch (error) {
            debugLog('DECODE', '❌ Error en decodificación de TikTok:', error);
            return null;
        }
    }

    async function handleTikTokMessage(event, ws) {
        debugStats.messagesReceived++;
        const result = await deserializeWebsocketMessage(event.data);
        if (result && result.inner && result.inner.messages) {
            debugStats.messagesDecoded++;
            result.inner.messages.forEach(msg => {
                const eventName = protoMessageTypes[msg.type] || msg.type;
                try {
                    const decodedData = root.lookupType(`TikTok.${msg.type}`).decode(msg.binary);
                    sendToContentScript(eventName, decodedData, 'TIKTOK_LIVE_EVENT');
                    debugStats.messagesSent++;
                } catch (err) {
                    debugLog('MESSAGE', `❌ Error decodificando ${msg.type}:`, err);
                }
            });
            if (result.inner.needAck && result.outer.id && result.outer.id !== lastAckId) {
                lastAckId = result.outer.id;
                const ackMsg = serializeMessage('WebcastWebsocketAck', { type: 'ack', id: result.outer.id });
                ws.send(ackMsg);
                debugStats.acksSent++;
                debugLog('ACK', `✅ ACK enviado para el id: ${result.outer.id}`);
            }
        }
    }
    
    function handleTikTokPing(event, ws) {
       if (event.data.includes("hi")) {
           // TikTok espera un 'pong' que es una copia del mensaje 'ping'
           ws.send(event.data);
           console.log("send handleTikTokPing")
       }
    }

    // --- Inicialización de Interceptores de TikTok ---
    new WebSocketInterceptor({
        urlFilter: (url) => url && url.includes('tiktok.com') && url.includes('webcast'),
        onMessage: handleTikTokMessage
    });
    
    new WebSocketInterceptor({
        urlFilter: (url) => url && url.includes('im-ws-va.tiktok.com'),
        onMessage: handleTikTokPing
    });

    debugLog('INIT', '🎉 Interceptores de TikTok inicializados correctamente.');
}


// =================================================================================
// SECTION 3: LÓGICA ESPECÍFICA PARA KICK
// =================================================================================

function initializeKick() {
    debugLog('INIT', 'Iniciando interceptor para Kick...');

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

    new WebSocketInterceptor({
        urlFilter: (url) => url && (url.includes('pusher.com') || url.includes('pusher.kick.com')),
        onMessage: handleKickMessage,
    });
    
    debugLog('INIT', '🎉 Interceptor de Kick inicializado correctamente.');
}

function initializeTwitch() {
    debugLog('INIT', 'Iniciando interceptor para Twitch...');
    const wsTWITCH = 'irc-ws.chat.twitch.tv';
    function handleTwitchMessage(e,ws){
      if (!e || typeof e.data !== 'string') {
        return;
      }
      debugStats.messagesReceived++;
      const parsedData = parseTwitchIRC(e.data);
      sendToContentScript(parsedData.type, { event:parsedData.type, data: parsedData }, 'TWITCH_LIVE_EVENT');
      debugLog('MESSAGE', `Mensaje recibido:`, { event:parsedData.type, data: parsedData });
    }
    new WebSocketInterceptor({
        urlFilter: (url) => url && url.includes(wsTWITCH),
        onMessage: handleTwitchMessage,
    });

  
}
function parseTwitchIRC(rawMessage) {
    // Limpiar \r\n del final
    const cleanMessage = rawMessage.replace(/\r\n$/, '');
    
    const result = {
        raw: rawMessage,
        tags: {},
        prefix: null,
        username: null,
        host: null,
        command: null,
        params: [],
        channel: null,
        message: null
    };
    
    let position = 0;
    
    // 1. Parsear tags (si existen, empiezan con @)
    if (cleanMessage.startsWith('@')) {
        const spaceIndex = cleanMessage.indexOf(' ');
        if (spaceIndex === -1) return result;
        
        const tagsPart = cleanMessage.substring(1, spaceIndex);
        
        tagsPart.split(';').forEach(tag => {
            const equalIndex = tag.indexOf('=');
            if (equalIndex === -1) {
                result.tags[tag] = '';
                return;
            }
            
            const key = tag.substring(0, equalIndex);
            let value = tag.substring(equalIndex + 1);
            
            // Decodificar valores especiales de Twitch
            value = value.replace(/\\s/g, ' ');
            value = value.replace(/\\:/g, ';');
            value = value.replace(/\\n/g, '\n');
            value = value.replace(/\\r/g, '\r');
            value = value.replace(/\\\\/g, '\\');
            
            result.tags[key] = value;
        });
        
        position = spaceIndex + 1;
    }
    
    // 2. Parsear prefix/source (si existe, empieza con :)
    if (cleanMessage[position] === ':') {
        const spaceIndex = cleanMessage.indexOf(' ', position);
        if (spaceIndex === -1) return result;
        
        result.prefix = cleanMessage.substring(position + 1, spaceIndex);
        
        // Extraer username y host del prefix
        if (result.prefix.includes('!')) {
            const exclamIndex = result.prefix.indexOf('!');
            result.username = result.prefix.substring(0, exclamIndex);
            
            const atIndex = result.prefix.indexOf('@');
            if (atIndex !== -1) {
                result.host = result.prefix.substring(atIndex + 1);
            }
        } else if (result.prefix.includes('.')) {
            // Es un servidor
            result.host = result.prefix;
        } else {
            // Solo nickname
            result.username = result.prefix;
        }
        
        position = spaceIndex + 1;
    }
    
    // 3. Parsear comando y parámetros
    const remaining = cleanMessage.substring(position);
    const parts = remaining.split(' ');
    
    if (parts.length === 0) return result;
    result.command = parts[0];
    
    // 4. Parsear parámetros
    for (let i = 1; i < parts.length; i++) {
        if (parts[i].startsWith(':')) {
            // El resto es el mensaje final
            result.message = parts.slice(i).join(' ').substring(1);
            break;
        }
        result.params.push(parts[i]);
    }
    
    // 5. Identificar canal
    if (['PRIVMSG', 'NOTICE', 'USERNOTICE', 'CLEARCHAT', 'CLEARMSG', 'HOSTTARGET'].includes(result.command)) {
        result.channel = result.params[0];
    } else if (result.command === 'JOIN') {
        result.channel = result.params[0] || result.message;
    } else if (result.command === 'PART') {
        result.channel = result.params[0];
    }
    
    // 6. Identificar tipo de mensaje
    switch (result.command) {
        case 'PRIVMSG':
            result.type = 'message';
            break;
        case 'USERNOTICE':
            result.type = 'usernotice';
            result.systemMessage = result.tags['system-msg'];
            break;
        case 'NOTICE':
            result.type = 'notice';
            result.msgId = result.tags['msg-id'];
            break;
        case 'CLEARCHAT':
            result.type = 'clearchat';
            result.targetUser = result.message;
            result.banDuration = result.tags['ban-duration'];
            break;
        case 'CLEARMSG':
            result.type = 'clearmsg';
            result.targetMsgId = result.tags['target-msg-id'];
            break;
        case 'HOSTTARGET':
            result.type = 'hosttarget';
            if (result.message) {
                const hostInfo = result.message.split(' ');
                result.hostTarget = hostInfo[0] === '-' ? null : hostInfo[0];
                result.hostViewers = hostInfo[1] ? parseInt(hostInfo[1]) : 0;
            }
            break;
        case 'RECONNECT':
            result.type = 'reconnect';
            break;
        case 'PING':
            result.type = 'ping';
            break;
        case 'PONG':
            result.type = 'pong';
            break;
        case 'CAP':
            result.type = 'unknown';
            break;
        case '001':
        case '002':
        case '003':
        case '004':
        case '353':
        case '366':
        case '372':
        case '375':
        case '376':
            result.type = 'server';
            break;
        case 'JOIN':
            result.type = 'join';
            break;
        case 'PART':
            result.type = 'part';
            break;
        case 'ROOMSTATE':
            result.type = 'roomstate';
            break;
        default:
            result.type = 'unknown';
    }
    
    // 7. Parsear información adicional de los tags
    if (result.tags && Object.keys(result.tags).length > 0) {
        // Información del usuario
        result.userId = result.tags['user-id'] || undefined;
        result.displayName = result.tags['display-name'] || undefined;
        result.userColor = result.tags.color || undefined;
        result.userType = result.tags['user-type'] || undefined;
        result.mod = result.tags.mod === '1';
        result.subscriber = result.tags.subscriber === '1';
        result.turbo = result.tags.turbo === '1';
        result.vip = result.tags.vip === '1';
        
        // Información del mensaje
        result.messageId = result.tags.id || undefined;
        result.timestamp = result.tags['tmi-sent-ts'] ? 
            new Date(parseInt(result.tags['tmi-sent-ts'])) : null;
        
        // Badges
        if (result.tags.badges && result.tags.badges !== '') {
            result.badges = {};
            result.tags.badges.split(',').forEach(badge => {
                const slashIndex = badge.indexOf('/');
                if (slashIndex !== -1) {
                    const name = badge.substring(0, slashIndex);
                    const version = badge.substring(slashIndex + 1);
                    result.badges[name] = version;
                }
            });
        }
        
        // Emotes
        if (result.tags.emotes && result.tags.emotes !== '') {
            result.emotes = [];
            result.tags.emotes.split('/').forEach(emoteData => {
                const colonIndex = emoteData.indexOf(':');
                if (colonIndex !== -1) {
                    const id = emoteData.substring(0, colonIndex);
                    const positions = emoteData.substring(colonIndex + 1);
                    positions.split(',').forEach(pos => {
                        const dashIndex = pos.indexOf('-');
                        if (dashIndex !== -1) {
                            const start = parseInt(pos.substring(0, dashIndex));
                            const end = parseInt(pos.substring(dashIndex + 1));
                            result.emotes.push({ id, start, end });
                        }
                    });
                }
            });
        }
    } else {
        // Valores por defecto cuando no hay tags
        result.userId = undefined;
        result.displayName = undefined;
        result.userColor = undefined;
        result.userType = undefined;
        result.mod = false;
        result.subscriber = false;
        result.turbo = false;
        result.vip = false;
        result.messageId = undefined;
        result.timestamp = null;
    }
    
    return result;
}

// Función para manejar múltiples mensajes concatenados
function parseMultipleTwitchIRC(rawMessages) {
    const messages = rawMessages.split(/\r?\n/).filter(msg => msg.trim() !== '');
    return messages.map(msg => parseTwitchIRC(msg + '\r\n'));
}

// Función helper para verificar si el usuario es broadcaster
function isBroadcaster(parsedMessage) {
    return parsedMessage.badges && parsedMessage.badges.broadcaster;
}

// Función helper para verificar si el usuario tiene permisos de moderador+
function hasModPrivileges(parsedMessage) {
    return parsedMessage.mod || 
           isBroadcaster(parsedMessage) || 
           (parsedMessage.badges && parsedMessage.badges.broadcaster);
}

(() => {
    const hostname = window.location.hostname;
    
    if (hostname.includes('tiktok.com')) {
        setupProtobufProtection();
    } else if (hostname.includes('kick.com')) {
        initializeKick();
    } else if (hostname.includes('twitch.tv')) {
        initializeTwitch();
    } else {
        console.log('[Interceptor] Script inyectado en un dominio no compatible:', hostname);
    }
})();