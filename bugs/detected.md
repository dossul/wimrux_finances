des arrivés sur la page d'acceuil
index-Rkwyub1B.js:2  POST https://gfe4bd9y.eu-central.insforge.app/api/auth/refresh 401 (Unauthorized)
request @ index-Rkwyub1B.js:2
post @ index-Rkwyub1B.js:2
getCurrentSession @ index-Rkwyub1B.js:2
await in getCurrentSession
c @ index-Rkwyub1B.js:3
C @ index-Rkwyub1B.js:2
vy @ index-Rkwyub1B.js:3
kb @ index-Rkwyub1B.js:3
await in kb
(anonymous) @ index-Rkwyub1B.js:3
Promise.then
(anonymous) @ index-Rkwyub1B.js:3
Promise.then
(anonymous) @ index-Rkwyub1B.js:3
index-Rkwyub1B.js:3 [Auth Store] Error loading session: InsForgeError: No refresh token provided
    at xf.fromApiError (index-Rkwyub1B.js:2:195504)
    at zv.request (index-Rkwyub1B.js:2:196886)
    at async Zv.getCurrentSession (index-Rkwyub1B.js:2:204455)
    at async Proxy.c (index-Rkwyub1B.js:3:17907)
    at async Array.vy (index-Rkwyub1B.js:3:7407)
    at async kb (index-Rkwyub1B.js:3:108788)


    des que je m'authentifie

    index-Rkwyub1B.js:2  GET https://gfe4bd9y.eu-central.insforge.app/api/database/records/invoices?select=id%2Creference%2Ctype%2Cstatus%2Ctotal_ttc&status=in.%28pending_validation%2Capproved%29&order=created_at.desc 404 (Not Found)
(anonymous) @ index-Rkwyub1B.js:2
then @ index-Rkwyub1B.js:2
index-Rkwyub1B.js:2  GET https://gfe4bd9y.eu-central.insforge.app/api/database/records/invoices?select=id%2Cstatus%2Ctotal_ttc%2Cclient_id%2Ccreated_at&created_at=gte.2025-05-27T09%3A59%3A44.906Z 404 (Not Found)

quand je clique sur  facture:

﻿
index-Rkwyub1B.js:2 
 GET https://gfe4bd9y.eu-central.insforge.app/api/database/records/invoices?select=*&order=created_at.desc 404 (Not Found)