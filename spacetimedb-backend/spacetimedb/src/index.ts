import { table, t, schema } from 'spacetimedb/server';


/// SCHEMAAAAA

const users = table({ name: 'users', public: true }, {
    identity: t.identity().primaryKey(), // Now the absolute Primary Key
    phone: t.string().unique(),          // Phone is still unique for bot lookups
    name: t.option(t.string()),       
    role: t.string(),                  
    trustScore: t.f32(),               
});

const distress_signals = table({ name: 'distress_signals', public: true }, {
    signalId: t.u64().primaryKey().autoInc(),
    userPhone: t.string(),             
    incidentId: t.option(t.u64()),     
    severity: t.u32(),                 
    message: t.string(),               
    status: t.string(),                // "pending", "assigned", "resolved"
    timestamp: t.u64(),
});


const live_entities = table({ name: 'live_entities', public: true }, {
    id: t.identity().primaryKey(),     
    // Changed to t.option to allow anonymous distress signals
    userPhone: t.option(t.string()),   
    type: t.string(),                  // "responder" | "distress"
    subType: t.string(),               // "medical", "fire", etc.
    status: t.string(),                
    lat: t.f64(),
    lng: t.f64(),
    lastSeen: t.u64(),                 
});


const incidents = table({ name: 'incidents', public: true }, {
    incidentId: t.u64().primaryKey().autoInc(),
    category: t.string(),              
    status: t.string(),                
    description: t.string(),           
    lat: t.f64(),
    lng: t.f64(),
});


const timeline_events = table({ name: 'timeline_events', public: true }, {
    eventId: t.u64().primaryKey().autoInc(),
    incidentId: t.u64(),               
    eventType: t.string(),             // "AUTO_ARRIVAL", "MANUAL_REPORT"
    message: t.string(),               
    timestamp: t.u64(),
});
  

const media_fragments = table({ name: 'media_fragments', public: true }, {
    fragmentId: t.u64().primaryKey().autoInc(),
    incidentId: t.u64(),               
    eventId: t.option(t.u64()),        // Null if it's just a general incident photo
    r2Url: t.string(),                 
    mediaType: t.string(),             
    timestamp: t.u64(),
});


  const spacetimedb =  schema({ 
    users, 
    distress_signals,
    live_entities, 
    incidents, 
    timeline_events, 
    media_fragments 
});

export default spacetimedb;


// REDUCERSSSS

export const update_location = spacetimedb.reducer(
   
    { 
        lat: t.f64(), 
        lng: t.f64(), 
        type: t.string(), 
        subType: t.string() 
    },
    (ctx, { lat, lng, type, subType }) => {
        const currentTime = BigInt(Date.now());
        
        
        const user = ctx.db.users.identity.find(ctx.sender);
  
        const phone = user ? user.phone : undefined;

        const existing = ctx.db.live_entities.id.find(ctx.sender);

        if (existing) {
            ctx.db.live_entities.id.update({
                ...existing,
                lat,
                lng,
                lastSeen: currentTime,
                type,
                subType,
                userPhone: phone 
            });
        } else {
            ctx.db.live_entities.insert({
                id: ctx.sender,
                userPhone: phone,
                type,
                subType,
                status: "active",
                lat,
                lng,
                lastSeen: currentTime,
            });
        }
    }
);