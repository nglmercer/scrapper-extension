// injected.js - Este script se ejecuta en el contexto de la página

// Esquema Protobuf embebido
const protobufSCHEME = `
syntax = "proto3";
package TikTok;

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
    debugLog('STATS', `Uptime: ${uptime}s | Scripts: ${debugStats.scriptsLoaded}/2 | WebSockets: ${debugStats.websocketsIntercepted} | Messages: ${debugStats.messagesReceived}/${debugStats.messagesDecoded}/${debugStats.messagesSent} | Errors: ${debugStats.errors}`);
}

// Función para enviar eventos a content script
function sendToContentScript(eventName, data) {
  const payload = {
            eventName,
            data,
            timestamp: Date.now()
        }
    window.postMessage({
        type: 'TIKTOK_LIVE_EVENT',
        payload
    }, '*');
    // Primero, obtén la pestaña activa

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
async function waitForProtobuf(maxWaitTime = 10000) {
    const startTime = Date.now();
    
    while (typeof window.protobuf === 'undefined') {
        if (Date.now() - startTime > maxWaitTime) {
            throw new Error('Timeout esperando protobuf');
        }
        
        debugLog('WAIT', 'Esperando protobuf...');
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    debugLog('WAIT', '✅ Protobuf disponible');
    return window.protobuf || protobuf;
}

// Función principal de inicialización
(async () => {
    debugLog('INIT', 'Script inyectado iniciando...');

    try {
        // Esperar a que protobuf esté disponible
        await waitForProtobuf();
        
        debugLog('INIT', '✅ Protobuf cargado correctamente',{
            protobuff:window.protobuf,protobuf
        });
        
        // Parsear el esquema
        const parsed = protobuf.parse(protobufSCHEME);
        const root = parsed.root;
        
        // Obtener tipos de mensaje
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

        debugLog('INIT', '✅ Esquema protobuf parseado correctamente',debugStats);

        // Función para decodificar mensajes
        async function deserializeWebsocketMessage(binaryMessage) {
            try {
                const buffer = new Uint8Array(binaryMessage);
                const decodedWebsocketMessage = WebcastWebsocketMessage.decode(buffer);
                
                if (decodedWebsocketMessage.type === 'msg') {
                    let binary = decodedWebsocketMessage.binary;
                    
                    // Verificar si es Gzip y descomprimir
                    if (binary && binary.length > 2 && binary[0] === 0x1f && binary[1] === 0x8b) {
                        binary = await decompressGzip(binary);
                    }
                    
                    const response = WebcastResponse.decode(binary);
                    return response;
                }
                return null;
            } catch (error) {
                debugLog('DECODE', '❌ Error en decodificación:', error);
                return null;
            }
        }

        // Monkey-patch del WebSocket
        const OriginalWebSocket = window.WebSocket;
        function serializeMessage(protoName, obj) {
          return root.lookupType(`TikTok.${protoName}`).encode(obj).finish();
        }
        window.WebSocket = function(url, protocols) {
            debugLog('WEBSOCKET', `Nuevo WebSocket: ${url}`);
            
            if (!url.includes('tiktok.com')) {
                return new OriginalWebSocket(url, protocols);
            }

            debugStats.websocketsIntercepted++;
            debugLog('WEBSOCKET', `🎯 Interceptando WebSocket de TikTok!`);
            
            const ws = new OriginalWebSocket(url, protocols);
            ws.binaryType = 'arraybuffer';

            const originalAddEventListener = ws.addEventListener;
            ws.addEventListener = function(type, listener, options) {
                if (type === 'message') {
                    const newListener = async (event) => {
                        // Llamar al listener original
                        listener(event);
                        
                        // Procesar nuestro código
                        debugStats.messagesReceived++;
                        
                        try {
                            const decodedResponse = await deserializeWebsocketMessage(event.data);
                            if (decodedResponse && decodedResponse.id && decodedResponse.id > 0) {
                              const ackMsg = serializeMessage('WebcastWebsocketAck', { 
                                type: 'ack', 
                                id: decodedResponse.id  // ✅ Usar decodedResponse.id
                              });
                              ws.send(ackMsg);
                              debugStats.acksSent++; // Para debugging
                            }
                            if (decodedResponse && decodedResponse.messages) {
                                debugStats.messagesDecoded++;
                                
                                const events = decodedResponse.messages
                                    .map(msg => {
                                        const eventName = protoMessageTypes[msg.type];
                                        if (eventName) {
                                            try {
                                                const messageProto = root.lookupType(`TikTok.${msg.type}`);
                                                const decodedData = messageProto.decode(msg.binary);
                                                return { eventName, data: decodedData };
                                            } catch (err) {
                                                debugLog('MESSAGE', `❌ Error decodificando ${msg.type}:`, err);
                                                return null;
                                            }
                                        }
                                        return null;
                                    })
                                    .filter(event => event !== null);

                                if (events.length > 0) {
                                    debugStats.messagesSent++;
                                    debugLog('MESSAGE', `🚀 Enviando ${events.length} eventos`);
                                    
                                    // Enviar cada evento por separado
                                    events.forEach(event => {
                                        sendToContentScript(event.eventName, event.data);
                                    });
                                }
                            }
                        } catch (err) {
                            debugStats.errors++;
                            debugLog('MESSAGE', '❌ Error procesando mensaje:', err);
                        }
                    };
                    originalAddEventListener.call(this, type, newListener, options);
                } else {
                    originalAddEventListener.call(this, type, listener, options);
                }
            };

            return ws;
        };

        // Mantener propiedades del WebSocket original
        window.WebSocket.prototype = OriginalWebSocket.prototype;
        Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);

        debugLog('INIT', '🎉 Interceptor inicializado correctamente');
        
        // Mostrar estadísticas periódicamente
        setInterval(showStats, 10000);

    } catch (error) {
        debugStats.errors++;
        debugLog('INIT', '💥 Error fatal:', error);
    }
})();