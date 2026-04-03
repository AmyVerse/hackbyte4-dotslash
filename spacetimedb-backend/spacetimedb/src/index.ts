import { table, t, schema, SenderError } from 'spacetimedb/server';


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

const dispatch_requests = table({ name: 'dispatch_requests', public: true }, {
    requestId: t.u64().primaryKey().autoInc(),
    incidentId: t.u64(),
    responderPhone: t.string(),
    status: t.string(), // "pending", "accepted", "rejected"
    timestamp: t.u64(),
});
  const spacetimedb =  schema({ 
    users, 
    distress_signals,
    live_entities, 
    incidents, 
    timeline_events, 
    media_fragments ,
    dispatch_requests
});

export default spacetimedb;


export const update_location = spacetimedb.reducer(
    {
        lat: t.f64(),
        lng: t.f64(),
        type: t.string(),
        subType: t.string()
    },
    (ctx, { lat, lng, type, subType }) => {
       
        if (lat < -90.0 || lat > 90.0) throw new SenderError("Invalid latitude.");
        if (lng < -180.0 || lng > 180.0) throw new SenderError("Invalid longitude.");
        if (!type) throw new SenderError("Entity type is required.");

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
                status: "active", // Ensure they are marked active if they move
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

export const link_user = spacetimedb.reducer(
    { 
        phone: t.string(), 
        name: t.option(t.string()) 
    },
    (ctx, { phone, name }) => {
        
        if (!phone || phone.trim() === "" || phone.length < 7) {
            throw new SenderError("Invalid phone number provided.");
        }

        const existingByPhone = ctx.db.users.phone.find(phone);

        if (existingByPhone) {
            // DEVICE HOPPING: If the user exists but they are logging in from a NEW device
            // (e.g., started on WhatsApp, now opened the Web Map), their ctx.sender changed.
            // Because 'identity' is the Primary Key, we delete the old row and insert the new one.
            if (existingByPhone.identity.toHexString() !== ctx.sender.toHexString()) {
                ctx.db.users.identity.delete(existingByPhone.identity);
                
                ctx.db.users.insert({
                    ...existingByPhone,
                    identity: ctx.sender,
                    // Update name if provided, otherwise keep the old one
                    name: name !== undefined ? name : existingByPhone.name
                });
            } else {
                // Same device, they just want to update their name
                ctx.db.users.identity.update({
                    ...existingByPhone,
                    name: name !== undefined ? name : existingByPhone.name
                });
            }
        } else {
            // BRAND NEW USER REGISTRATION
            ctx.db.users.insert({
                identity: ctx.sender,
                phone: phone,
                name: name, // This is already string | undefined
                role: "civilian",
                trustScore: 0.5
            });
        }
    }
);


export const report_distress = spacetimedb.reducer(
    {
        severity: t.u32(),
        message: t.string()
    },
    (ctx, { severity, message }) => {
        
        if (severity < 1 || severity > 5) {
            throw new SenderError("Severity must be between 1 and 5.");
        }
        if (!message || message.trim() === "") {
            throw new SenderError("Distress message cannot be empty.");
        }

        const currentTime = BigInt(Date.now());

        
        const user = ctx.db.users.identity.find(ctx.sender);
        
        const phone = user ? user.phone : "anonymous";

       
      
        ctx.db.distress_signals.insert({
            signalId: 0n,          
            userPhone: phone,
            incidentId: undefined, 
            severity,
            message,
            status: "pending",
            timestamp: currentTime
        });

        
        const existingMarker = ctx.db.live_entities.id.find(ctx.sender);

        if (existingMarker) {
            ctx.db.live_entities.id.update({
                ...existingMarker,
                type: "distress",
                status: "active",
                lastSeen: currentTime
            });
        }
        // (If they aren't on the map yet, the frontend should immediately call 
        // update_location right after calling report_distress)
    }
);

export const create_incident = spacetimedb.reducer(
    {
        category: t.string(), 
        description: t.string(),
        lat: t.f64(),
        lng: t.f64()
    },
    (ctx, { category, description, lat, lng }) => {
       
        const user = ctx.db.users.identity.find(ctx.sender);
        
        if (!user || (user.role !== "dispatcher" && user.role !== "responder" && user.role !== "system")) {
            throw new SenderError("Unauthorized: Only dispatchers or responders can create incidents.");
        }

        const currentTime = BigInt(Date.now());

     
        const newIncident = ctx.db.incidents.insert({
            incidentId: 0n, 
            category,
            status: "active",
            description,
            lat,
            lng
        });

       
        ctx.db.timeline_events.insert({
            eventId: 0n, 
            incidentId: newIncident.incidentId,
            eventType: "INCIDENT_CREATED",
            message: `Incident created by ${user.name || user.phone}`,
            timestamp: currentTime
        });
    }
);  

export const request_responder = spacetimedb.reducer(
    {
        incidentId: t.u64(),
        responderPhone: t.string()
    },
    (ctx, { incidentId, responderPhone }) => {
        const dispatcher = ctx.db.users.identity.find(ctx.sender);
        if (!dispatcher || (dispatcher.role !== "dispatcher" && dispatcher.role !== "system")) {
            throw new SenderError("Unauthorized: Only dispatchers can deploy responders.");
        }

        const responder = ctx.db.users.phone.find(responderPhone);
        if (!responder || responder.role !== "responder") {
            throw new SenderError("Valid responder phone number required.");
        }

        // Create the pending request (frontend can listen for this to show a pop-up!)
        ctx.db.dispatch_requests.insert({
            requestId: 0n, // autoInc
            incidentId,
            responderPhone,
            status: "pending",
            timestamp: BigInt(Date.now())
        });
    }
);



export const accept_dispatch = spacetimedb.reducer(
    {
        requestId: t.u64(),
        lat: t.f64(),
        lng: t.f64(),
        subType: t.string() // "ambulance", "police", etc.
    },
    (ctx, { requestId, lat, lng, subType }) => {
        const responder = ctx.db.users.identity.find(ctx.sender);
        if (!responder || responder.role !== "responder") {
            throw new SenderError("Unauthorized.");
        }

        const request = ctx.db.dispatch_requests.requestId.find(requestId);
        if (!request || request.status !== "pending") {
            throw new SenderError("Request not found or already handled.");
        }

        const currentTime = BigInt(Date.now());

        
        ctx.db.dispatch_requests.requestId.update({
            ...request,
            status: "accepted"
        });

        // 2. Put them on the live map using their ACTUAL device GPS
        const existingMarker = ctx.db.live_entities.id.find(ctx.sender);
        if (existingMarker) {
            ctx.db.live_entities.id.update({
                ...existingMarker,
                status: "dispatched",
                lat,
                lng,
                lastSeen: currentTime
            });
        } else {
            ctx.db.live_entities.insert({
                id: ctx.sender,
                userPhone: responder.phone,
                type: "responder",
                subType,
                status: "dispatched",
                lat,
                lng,
                lastSeen: currentTime
            });
        }

        // 3. Log it to the timeline
        ctx.db.timeline_events.insert({
            eventId: 0n, 
            incidentId: request.incidentId,
            eventType: "RESPONDER_ACCEPTED",
            message: `Responder ${responder.name || responder.phone} is en route.`,
            timestamp: currentTime
        });
    }
);











// --- LIFECYCLE HOOKS ---








export const onDisconnect = spacetimedb.clientDisconnected(ctx => {
    
    const existingMarker = ctx.db.live_entities.id.find(ctx.sender);
    
    if (existingMarker) {
        // Mark them as offline so the frontend knows to fade/remove their dot
        ctx.db.live_entities.id.update({
            ...existingMarker,
            status: "offline"
        });
    }
});
