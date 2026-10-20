import { Vonage } from "@vonage/server-sdk";
import { vcr } from "@vonage/vcr-sdk";
import { tokenGenerate } from "@vonage/jwt";
//import { IdentityInsights } from "@vonage/identity-insights";

import express from "express";
import axios from "axios";
import utils from "./vutils.cjs";
import dgram from "node:dgram";
import fs from "fs";
import qs from "qs";
import Pusher from "pusher"

const udpserver = dgram.createSocket("udp4");
const v2url = "https://api.nexmo.com/v2/verify/";
const tef_phone = "+34649380428";
const aclPaths = {
  "paths": {
    "/*/users/**": {},
    "/*/conversations/**": {},
    "/*/sessions/**": {},
    "/*/devices/**": {},
    "/*/image/**": {},
    "/*/media/**": {},
    "/*/push/**": {},
    "/*/knocking/**": {},
    "/*/legs/**": {}
  }
}

udpserver.on("message", (msg, rinfo) => {
  console.log(
    `UDP ******************************************** Received message from ${rinfo.address}:${rinfo.port}: ${msg}`
  );
});

udpserver.on("listening", () => {
  const address = udpserver.address();
  console.log(`UDP server listening on ${address.address}:${address.port}`);
});
udpserver.bind(41234);
const app = express();
const port = process.env.VCR_PORT;
const server_url = process.env.VCR_INSTANCE_PUBLIC_URL;
const vcrstate = vcr.getInstanceState();

console.log("Starting up MWC version with URL = " + server_url);
let gnids;
utils.getIniStuff().then((res) => {
  gnids = res;
  console.log("Got ini: ", gnids.masterkey);
});
const vid = 949;
const sid = 790; // was 2
const sbox = 953;
var vonage;
var users = [];
var requests = [];
var ws_url = process.env.diana ? "wss://" + process.env.diana : "wss://neru-ef3346a6-v2sonic2-v2sonic2.use1.runtime.vonage.cloud"; //wsprefix + server_url.slice(5); // https://
var pkey;
var pusher;
app.use(express.json());
app.use(express.static("public"));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "OPTIONS,GET,POST,PUT,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With"
  );
  next();
});

app.get("/_/health", async (req, res) => {
  res.sendStatus(200);
});
app.get("/keepalive", (req, res) => {
  //console.log("Keepalive: " + req.query);
  res.sendStatus(200);
});
async function getSB(id) {
  console.log("Creating sandbox user: ", id);
  utils.getNexmo(id).then((result) => {
    users[id] = result;
    users[id].id = id;
    users[id].request_id = null;

    const sbVonage = new Vonage(
      {
        apiKey: result.key,
        apiSecret: result.secret,
        applicationId: result.app_id,
        privateKey: result.keyfile,
      },
      {}
    );

    sbVonage.applications
      .getApplication(result.app_id)
      .then((resp) => {
        console.log("SANDBOX getApplication results: ", resp.capabilities);
        let caps = resp.capabilities;
        caps.verify = {
          webhooks: {
            status_url: {
              address: server_url + "/verifystatus?uid=" + id,
              http_method: "POST",
            },
          },
          version: "v2",
        };
        /*
                vonage[sid].applications.updateApplication({
                    id: result.app_id,
                    name: "VIDS",
                    capabilities: caps
                }).then(result => {
                    console.log(result.capabilities.verify, result.capabilities.network_apis, result.capabilities.networkApis);
                }).catch(error => {
                    console.error(error);
                })
                */
      })
      .catch((err) => console.error(err));
  });
}

async function startup() {
  await vcrstate.set('14083753079', "Hello");
  utils.getNexmo(vid).then((result) => {
    console.log("Creating SilentAuth user record for " + vid, result.key, result.app_id);
    users[vid] = result;
    users[vid].id = vid;
    users[vid].request_id = null;
    if (result.pusher_key) {
      console.log("Got pusher key: ", result.pusher_key);
      pkey = result.pusher_key;
      pusher = new Pusher({
        appId: result.pusher_id,
        key: result.pusher_key,
        secret: result.pusher_secret,
        useTLS: true, // optional, defaults to false
        cluster: "us3"
      });
    }
    vonage = new Vonage(
      {
        apiKey: result.key,
        apiSecret: result.secret,
        applicationId: result.app_id,
        privateKey: result.keyfile,
      },
      {}
    );
    vonage.applications
      .getApplication(result.app_id)
      .then((resp) => {
        //console.log("getApplication results: ", resp.capabilities)
        let caps = resp.capabilities;
        caps.verify = {
          webhooks: {
            status_url: {
              address: server_url + "/verifystatus?uid=" + vid,
              http_method: "POST",
            },
          },
          version: "v2",
        };
        caps.voice = {
          webhooks: {
            answer_url: {
              address: server_url + "/answer",
              httpMethod: "GET"
            },
            eventUrl: {
              address: server_url + "/event",
              httpMethod: "POST"
            },
            fallback_answer_url: {
              address: "https://vids.vonage.com/fallback/answer",
              httpMethod: "POST"
            }
          }
        };
        if (!process.env.VCR_INSTANCE_PUBLIC_URL.includes("-debug-")) {
          vonage.applications
            .updateApplication({
              id: result.app_id,
              name: "VIDS",
              capabilities: caps,
            })
            .then((result) => {
              //console.log(result.capabilities.verify, result.capabilities.network_apis, result.capabilities.networkApis);
            })
            .catch((error) => {
              console.error(error);
            });
        }
      })
      .catch((err) => console.error(err));
  });
  utils.getNexmo(sid).then((result) => {
    console.log("Creating SIMSwap/Sandbox user record for " + sid, result.key);
    users[sid] = result;
    users[sid].id = vid;
    users[sid].request_id = null;
    console.log("Creating Identity Insights user: ", users[sid].app_id);

  });
  if (!process.env.VCR_INSTANCE_PUBLIC_URL.includes("-debug-")) {
    let interval = setInterval(() => {
      axios
        .get(`${process.env.VCR_INSTANCE_PUBLIC_URL}/keepalive`)
        .then((resp) => {
          //console.log(resp.data);
        })
        .catch((err) => console.log("VCR interval error:", err.code));
    }, 30000);
  }
  await getSB(sbox);
  var tmp = await vcrstate.get('14083753079');

  console.log("****************************** VCR state: ", tmp)
  var lat = 40.44509;
  var long = -3.6939;
  //await doTef(tef_phone, lat, long );
}
app.post("/verifystatus", (req, res) => {
  console.log("Got Verify status!!!!", req.body);
  var date = new Date().toLocaleString();

  return res.status(200).end();
});
app.post("/checkcode", async (req, res) => {
  console.log("Got checkcode: ", req.body);
  if (req.body.reqId && req.body.code) {
    verifyRequest(req.body.reqId, req.body.code);
  }
  var date = new Date().toLocaleString();
  return res.status(200).end();
});
async function verifyRequest(reqId, code) {
  var results = {};
  if (reqId && code) {
    try {
      var url = v2url;
      const jwt = tokenGenerate(users[sid].app_id, users[sid].keyfile, {});
      results = await axios.post(
        url + reqId,
        { code: "" + code },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + jwt,
          },
        }
      );
    } catch (err) {
      console.log("V2 Code error: ", err.response?.status);
    }
  }
  return results.data;
}
app.post("/authenticate", async (req, res) => {
  console.log("Got AI Authentications request!!!!", req.body);
  var date = new Date().toLocaleString();
  var methods = [];
  if (req.body.sessionId) {
    var stuff = await vcrstate.get('' + req.body.sessionId);
    if (stuff) {
      stuff.action = "authenticate";
      stuff.sessionId = req.body.sessionId;
      stuff.reason = req.body.reason;
      await pusher.trigger('vault-' + stuff.deviceId, "authenticate", stuff);
      setTimeout(() => {
        console.log("Sent authenticate pusher event to gui: ", stuff);
        pusher.trigger('nova', "event", stuff);
      }, 1000);
      methods = stuff.methods
    }
  }
  //  setTimeout(() => {
  console.log("Returning Got AI Authentications request!!!!", { methods: methods });
  return res.status(200).json({ methods: methods }).end();
  //  }, 5000);
});
app.post("/checkAuthentication", async (req, res) => {
  console.log("Got AI checkAuthentication request!!!!", req.body);
  var date = new Date().toLocaleString();
  var counter = 0;
  let interval = setInterval(async () => {
    //  setTimeout(async () => {
    var methods = [];
    var obj = {}
    if (req.body.sessionId) {
      var stuff = await vcrstate.get('' + req.body.sessionId);
      if (stuff) {
        console.log("got Stuff on checkAuthentication", stuff)
        obj = stuff;
        if (obj && Object.hasOwn(obj, "result") && obj.methods?.length && (obj.count >= obj.methods?.length)) {
          clearInterval(interval);
          console.log("Returning Got AI checkAuthentication request", obj);
          return res.status(200).json(obj).end();
        } else {
          console.log("Not enough steps finished yet.. keep waiting: ", counter)
        }
      } else {
        console.log("No stuff in checkAuthentication yet.. keep waiting: ", counter)
      }
    }
    if (counter++ > 24) {
      clearInterval(interval);
      console.log("Got AI checkAuthentication TIMEOUT, so block")
      return res.status(200).json({ result: 'block', reason: 'unable to run verification checks' }).end();
    }
  }, 500);
});
app.post("/getFd", async (req, res) => {
  console.log("getFd request: ", req.body);
  var date = new Date().toLocaleString();
  if (!req.body.phone) {
    console.log("No phone passed in.");
    return res.status(200).end();
  }
  var phone = req.body.phone.replace(/\D/g, "");
  let basic = Buffer.from(users[vid].key + ":" + users[vid].secret).toString(
    "base64"
  );
  var results = {};
  var action = "allow";
  var body = {
    to: phone,
    from: users[vid].vfrom,
    product: "voice",
  };
  console.log("Sending getDefender body: ", body);
  if (req.body.demo) {
    // If demo mode, skip and return true...
    results = {
      rule_id: "-1",
      action: "allow",
      subsystem: "prefix",
      risk_attributes: [],
    };
    return res.status(200).json({ results: action, data: results }).end();
  }
  try {
    results = await axios.post(
      "https://api.nexmo.com/v0.1/fraud-defender/check",
      body,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + basic,
        },
      }
    );
    console.log("Got getDefender results: ", results.data);
    if (results.data.action) {
      action = results.data.action;
    }
  } catch (err) {
    console.log("getDefender error", err);
  }
  return res.status(200).json({ results: action, data: results.data }).end();
});
app.post("/getFraud", async (req, res) => {
  console.log("getFraud request: ", req.body);
  var date = new Date().toLocaleString();
  if (!req.body.phone) {
    console.log("No phone passed in.");
    return res.status(200).end();
  }
  var phone = req.body.phone.replace(/\D/g, "");
  let basic = Buffer.from(users[vid].key + ":" + users[vid].secret).toString(
    "base64"
  );
  var results = {};
  var ss = "invalid";
  var action = "allow";
  if (req.body.demo) {
    // If demo mode, skip and return true...
    results = {
      action: "allow",
    };
    return res.status(200).json({ results: action, data: results }).end();
  }
  var body = {
    type: "phone",
    phone: phone,
    insights: [],
  };
  body.insights.push("fraud_score");
  //if (ss == 'invalid') {
  //    body.insights.push("sim_swap");

  console.log("Number Insight request: ", body);
  try {
    results = await axios.post("https://api.nexmo.com/v2/ni", body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + basic,
      },
    });
    console.log("Got insight v2 results: ", results.data);
    if (results.data?.fraud_score) {
      action = results.data.fraud_score.risk_recommendation;
      if (action == "block") action = "warning";
    }
  } catch (err) {
    console.log("getFraud error", err.data);
    return { error: err.data?.response };
  }

  return res.status(200).json({ results: action, data: results.data }).end();
});
app.post("/getSimswap", async (req, res) => {
  console.log("getSimswap request: ", req.body);
  var date = new Date().toLocaleString();
  if (!req.body.phone) {
    console.log("No phone passed in.");
    return res.status(200).end();
  }
  var phone = req.body.phone.replace(/\D/g, "");
  let basic = Buffer.from(users[vid].key + ":" + users[vid].secret).toString(
    "base64"
  );
  var results = {};
  var ss = "invalid";
  var action = "allow";//"warning"; // was "allow"
  if (req.body.demo) {
    // If demo mode, skip and return true...
    results = {
      action: "allow",
    };
    return res.status(200).json({ results: action, data: results }).end();
  }
  if (
    phone.startsWith("x49") ||
    phone.startsWith("x34") ||
    phone.startsWith("x1408375")
  ) {
    var ss = await getSS2(phone);
    console.log("Got Camara SS results: ", ss);
    if (ss == 'invalid') {
      action = 'warning'
    }
    return res.status(200).json({ results: action, data: ss }).end();
  }
  var body = {
    type: "phone",
    phone: phone,
    insights: [],
  };
  //if (ss == 'invalid') {
  body.insights.push("sim_swap");

  console.log("Number Insight request: ", body);
  try {
    if (1 || phone.startsWith("1408375")) {
      console.log("Using Identity Insights: ", users[sid].app_id);
      const jwt = tokenGenerate(users[sid].app_id, users[sid].keyfile, {});
      const params = {
        phone_number: phone,
        insights: {
          format: {},
          original_carrier: {},
          current_carrier: {},
          sim_swap: {
            period: 240
          },
        },
      };
      //const clientInsights = new IdentityInsights(jwt, {});

      //const results = await clientInsights.getIdentityInsights(params);
      var obj = {
        phone_number: phone,
        purpose: "FraudPreventionAndDetection",
        insights: {
          format: {},
          sim_swap: {
            period: 240
          },
          original_carrier: {},
          current_carrier: {}
        }
      }
      results = await axios.post("https://api-us.vonage.com/v0.1/identity-insights", obj, {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
        },
      });
      console.log("Got Number Insightresults: ", results.data, results.data?.insights?.sim_swap);
      if (results.data?.insights?.sim_swap?.hasOwnProperty('is_swapped')) {
        action = (results.data.insights.sim_swap.is_swapped) ? "block" : "allow";
      }
    } else {
      results = await axios.post("https://api.nexmo.com/v2/ni", body, {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + basic,
        },
      });
      console.log("Got insight v2 results: ", results.data);
      if (results.data?.sim_swap) {
        action = results.data.sim_swap.swapped ? "block" : "allow";
      }
    }
  } catch (err) {
    console.log("getFraud error", err);
    return { error: err.data?.response };
  }

  return res.status(200).json({ results: action, data: results.data }).end();
});
app.post("/getNv", async (req, res) => {
  console.log("getNv request: ", req.body);
  var date = new Date().toLocaleString();
  var redirect;
  var reqid = "";
  if (!req.body.phone) {
    console.log("No phone passed in.");
    return res.status(200).end();
  }
  var phone = req.body.phone.replace(/\D/g, "");
  let type = "sa";
  let sandbox = false;
  if (
    //    phone.startsWith("49") ||
    //    phone.startsWith("34") ||
    phone.startsWith("990")
  ) {
    type = "nv";
    if (phone.startsWith("990")) {
      console.log("Using sandbox for ", phone);
      sandbox = true;
    }
  }
  if (type == "nv") {
    console.log("Doing NV");
    redirect = await createCamara(phone, req.body.id, sandbox);
    console.log("Camara request: ", redirect);
  } else {
    let sreq = await createSilent(phone);
    console.log("createSilent results: ", sreq);
    redirect = sreq.body?.check_url;
    reqid = sreq.body?.request_id;
  }
  return res
    .status(200)
    .json({ redirect: redirect, type: type, sandbox: sandbox, reqid: reqid });
});
app.post("/getLocation", async (req, res) => {
  console.log("getLocation request: ", req.body);
  var date = new Date().toLocaleString();
  var phone = req.body.phone;
  var results = "allow";
  if (!phone) {
    console.log("No phone passed in.");
    return res.status(200).end();
  }
  if (phone.startsWith("34") || phone.startsWith("+34") || req.body.sandbox) { // TEF, most likely
    if (!phone.startsWith("+")) phone = "+" + phone;
    var lat = 40.44509;
    var long = -3.6939;
    if (req.body.location?.latitude) lat = req.body.location.latitude
    if (req.body.location?.longitude) long = req.body.location.longitude
    var tef = await doTef(phone, lat, long);
    if (!tef || tef == 'NOT_FOUND') {
      results = 'block'
    }
  }
  return res.status(200).json({ results: results }).end();
});
app.post("/getAi", async (req, res) => {
  console.log("getAi request: ", req.body);
  var date = new Date().toLocaleString();
  var phone = req.body.phone.replace(/\D/g, "");
  var results = "allow";
  var deviceId = req.body.id;
  var methods = req.body.methods ?? [];
  var lang = req.body.lang ?? 'en';

  var jwt = null;
  if (!phone) {
    console.log("No phone passed in.");
    return res.status(200).end();
  }
  console.log("Using/creating user: ", phone)
  await vonage.users.getUser(phone)
    .then((user) => {
      console.log("Got existing user!");
      jwt = tokenGenerate(users[vid].app_id, users[vid].keyfile, {
        sub: phone,
        exp: Math.round(new Date().getTime() / 1000) + 3600,
        acl: aclPaths
      });
    }
    )
    .catch(async (error) => {
      console.log("User not found, let's create it!")
      await vonage.users.createUser({
        'name': phone,
        'displayName': phone,
      })
        .then((user) => {
          console.log("Created` user: ", user)
          jwt = tokenGenerate(users[vid].app_id, users[vid].keyfile, {
            sub: phone,
            exp: Math.round(new Date().getTime() / 1000) + 3600,
            acl: aclPaths
          });
        })
        .catch((error) => console.error(error));
    }
    );
  /*
      setTimeout(() => {
        console.log("Sending pusher event to deviceId: ", deviceId);
      pusher.trigger('vault-' + deviceId, "event", { event: 'test' });
      }, 2000);
  */

  var ai = "30";//"19895281169";
  await vcrstate.set('' + phone, { deviceId: deviceId, phone: phone, methods: methods, lang: lang })
  console.log("Set vcrstate for phone ", phone, " to deviceId: ", deviceId);
  var stuff = await vcrstate.get('' + phone);
  console.log("vcrstate get returned: ", stuff, stuff.phone);

  return res.status(200).json({ results: results, jwt: jwt, callto: ai, pkey: pkey }).end();
});

app.post("/getFacial", (req, res) => {
  console.log("getFacial request: ", req.body);
  var date = new Date().toLocaleString();
  if (!req.body.phone) {
    console.log("No phone passed in.");
    return res.status(200).end();
  }
  return res.status(200).json({ results: "allow" }).end();
});
async function getSS2(phone) {
  const jwt = tokenGenerate(users[sid].app_id, users[sid].keyfile, {});
  try {
    let results = await axios.post(
      "https://api-eu.vonage.com/oauth2/bc-authorize?login_hint=tel:" +
      phone +
      "&scope=openid%20dpv%3AFraudPreventionAndDetection%23check-sim-swap",
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
          "X-Nexmo-Trace-Id": "TEST_CAMARA_AUTH",
        },
      }
    );
    console.log("oAuth authorization request: ", results.data);
    let results2 = await axios.post(
      "https://api-eu.vonage.com/oauth2/token?grant_type=urn:openid:params:grant-type:ciba&auth_req_id=" +
      results.data.auth_req_id,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + jwt,
          "X-Nexmo-Trace-Id": "TEST_CAMARA_AUTH",
        },
      }
    );
    console.log("oAuth token response: ", results2.data.expires_in);
    let ss = await axios.post(
      "https://api-eu.vonage.com/camara/sim-swap/v040/check",
      {
        phoneNumber: phone,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + results2.data.access_token,
          "X-Nexmo-Trace-Id": "TEST_CAMARA_AUTH",
        },
      }
    );
    console.log("SS response: ", ss.data);
    return ss.data.swapped;
  } catch (e) {
    console.error("Camara SS error: ", e.response.data);
  }
  return "invalid";
}
app.get("/answer", async (req, res) => {
  console.log("vapi answer webhook: ", req.query);
  var date = new Date().toLocaleString();
  var uuid = req.query.uuid
  var promptId = req.query.to;
  var stream = req.query.streamid;
  var stuff = await vcrstate.get('' + req.query.from_user);
  var lang = 'en';
  if (stuff && stuff.deviceId) {
    stream = stuff.deviceId;
    lang = stuff.lang ?? 'en';
  }
  var conf = "conf_" + uuid;
  let url = ws_url + "/socket?uid=" + uuid + "&streamid=" + stream + "&orig_uuid=" + uuid + "&region=us&promptId=" + promptId + "&video=1&usefilter=" + 1 + "&voice=" + lang + "&orig_number=u" + req.query.from_user;
  var ncco = [
    /*    {
          action: "connect",
          from: "Vonage",
          limit: 300,
          endpoint: [
            {
              type: "websocket",
              uri: url,
              //server_wss + "/socket?region=" + region + "&con_uuid=" + req.query.uuid + "&orig_uuid=" + req.query.uuid + "&orig_number=" + req.query.from + "&orig_to=" + req.query.to,
              "content-type": "audio/l16;rate=16000",
            },
          ],
        },*/
    {
      action: "conversation",
      name: conf,  // to handle multiple separate conf calls with VIDS Live Translation demo
      endOnExit: true, // valid ONLY for 1-to-1 calls (not for multi-party conference calls), so it ends any websockets still up and the other's participant call leg
    }
  ];
  console.log("Returning answer ncco: ", ncco);
  if (stuff) {
    stuff.uuid = uuid;
    stuff.url = url;
    stuff.conf = conf;
    await vcrstate.set('' + uuid, stuff).then(() => {
      vcrstate.expire('' + uuid, 600);
      console.log("UUID state expiration set: ", uuid)
    })
    console.log("Updated vcrstate for phone ", req.query.from_user, stuff);
  }
  // Now register a callback from Diana for when we need a transfer:
  var diana = "https://" + process.env.diana + "/register";
  axios.post(diana, {
    phone: 'u' + req.query.from_user,
    url: server_url + "/transfer?uuid=" + uuid + "&orig_number=u" + req.query.from_user + "&orig_to=" + req.query.to,
    uuid: uuid,
    deviceId: stream
  });
  return res.status(200).json(ncco).end();
});
app.post("/transfer", async (req, res) => {
  console.log("vapi transfer webhook: ", req.body);
  var date = new Date().toLocaleString();
  var dest;
  if (req.body.transfer) {
    var to = req.body.transfer;
    if (to.toLowerCase().startsWith("sip")) {
      var headers = { "custom-session": "" + novaSession, conversation: `${server_url}/conversation?session=${req.body.novaSession}`, phone: req.body.phone }
      console.log("SIP Headers: ", headers)
      dest = {
        type: "sip",
        uri: '' + to, //"sip:19174634229@vcc-us.api.vonage.com",
        headers: headers
      };
      from = req.body.phone;
    } else {
      dest = {
        type: 'phone',
        number: to,
      };
    }
    var obj = {
      answer_url: [server_url + '/ws_answer?original_uuid=' + req.body.uuid + '&transfer=true&conference_name=conf_' + req.body.uuid + '&deviceId=' + req.body.deviceId],
      to: [dest],
      from: {
        type: 'phone',
        number: users[vid].from,
      },
    };
    console.log("Connection obj: ", obj)
    setTimeout(async () => {
      vonage.voice.createOutboundCall(obj)
        .then(async (result) => {
          console.log("Call transfer results: ", result)
        })
        .catch((error) => console.error(error));
    }, 1000)
  }
  return res.status(200).end();
})
app.post("/event", async (req, res) => {
  console.log("vapi event webhook: ", req.body);
  var date = new Date().toLocaleString();
  if (req.body.type == 'transfer') { //MSB
    console.log("Got transfer, query params: ", req.query)
    var stuff = await vcrstate.get('' + req.body.uuid);
    var transfer = await vcrstate.get('transfer_' + req.body.uuid);
    if (transfer) {
      // Presumably this is the second transfer so we want to /infer action 
      console.log("Transfer with inference, so doing /infer action: ", req.body, transfer);
      vcrstate.delete('transfer_' + req.body.uuid) // So we don;t transfer twice...
      const targetConv = transfer.original_uuid; // For individual leg
      try {
        var prompt = 'Do not interpret or offer help, ONLY repeat whatever is said.  Do not add to it.'
        //            const inferUrl = `${v.apiHost}/v1/conversations/${encodeURIComponent('' + targetConv)}/infer`;
        var st = "select * from prompts where id=33"; // Default, in case prompt is not found in DB
        let ures2 = await utils.getDb('prompts', st, null);
        console.log("ures2 rows: ", ures2.length)
        if (!ures2?.length && ures2[0].prompt) {
          console.log("No tools!?!?!");
        } else {
          console.log("Found prompt ", ures2[0].id)
          prompt = ures2[0].prompt
        }
        console.log("Using infer prompt: ", prompt)
        const inferUrl = `https://api-us.vonage.com/v1/calls/${encodeURIComponent('' + targetConv)}/infer`;
        const jwt = tokenGenerate(users[vid].app_id, users[vid].keyfile, {});
        const inferResp = await axios.put(
          inferUrl,
          {
            audio: false,
            event_url: [`${server_url}/infer?deviceId=${transfer.deviceId}`],
            prompt: prompt
          },
          {
            headers: {
              'Authorization': 'Bearer ' + jwt,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log("Infer PUT status: ", targetConv, inferResp.status, inferResp.data);
      } catch (err) {
        console.error("Infer PUT error: ", targetConv, err.response?.status, err.response?.data ?? err.message);
      }
    } else if (stuff) {
      console.log("Found stuff for transfer, creating outbound call: ", stuff);
      //      vcrstate.delete('' + req.body.uuid) // So we don;t transfer twice...
      vonage.voice.createOutboundCall({
        to: [{
          type: 'websocket',
          uri: stuff.url,
          'content-type': 'audio/l16;rate=16000',  // NEVER change the content-type parameter argument
          headers: {}
        }],
        from: {
          type: 'phone',
          number: 19999999999 // cannot use a longer than 15-digit string (e.g. not call_uuid)
        },
        answer_url: [server_url + '/ws_answer?original_uuid=' + req.body.uuid + '&conference_name=' + stuff.conf],
      })
        .then(res => console.log(">>> WebSocket create status:", res))
        .catch(err => console.error(">>> WebSocket create error:", err));
    }

  }
  return res.status(200).end();
});
function normalizeJson(json) {
  if (!json) return null;
  if (json.type != 'infer') return null;
  if ((json.stop_reason && json.stop_reason == 'INTERRUPTED') || !json.text) {
    console.log("Inference data was interrupted or text empty, ignoring");
    return;
  }
  var inferenceText = String(json.text || '').trim()
  try {
    var decodedInferenceText = JSON.parse(inferenceText);
    if (typeof decodedInferenceText == 'string') inferenceText = decodedInferenceText.trim();
  } catch (e) {
    console.log("Inference text is not valid JSON, continuing with normalization: ", inferenceText)
  }
  inferenceText = inferenceText.replace(/\\"/g, '"');
  if (inferenceText.charAt(0) == '"' && inferenceText.charAt(1) == '{') {
    inferenceText = inferenceText.slice(1);
  }
  inferenceText = inferenceText.replace(/([_"]) +/g, '$1')
    .replace(/ +"/g, '"');
  if (inferenceText.charAt(0) != '{') inferenceText = '{' + inferenceText;
  if (inferenceText.charAt(inferenceText.length - 1) != '}') {
    if (((inferenceText.match(/"/g) || []).length % 2) != 0) inferenceText += '"';
    inferenceText += '}';
  }
  inferenceText = inferenceText
    .replace(/([{,]\s*)([A-Za-z][A-Za-z0-9_ ]*)\s*:/g, function (match, prefix, name) {
      return prefix + '"' + name.trim().replace(/_\s+/g, '_') + '":';
    })
    .replace(/,\s*}/g, '}');
  var obj = JSON.parse(inferenceText);
  console.log("Normalized inference JSON: ", obj);
  var normalizeInference = function (value) {
    if (Array.isArray(value)) return value.map(normalizeInference);
    if (value && typeof value == 'object') {
      Object.keys(value).forEach(function (key) {
        var normalizedKey = key.trim().replace(/_\s+/g, '_');
        var normalizedValue = normalizeInference(value[key]);
        if (normalizedKey != key) delete value[key];
        value[normalizedKey] = normalizedValue;
      });
      return value;
    }
    if (typeof value == 'string') return value.trim().replace(/_\s+/g, '_');
    return value;
  };
  obj = normalizeInference(obj);
  if(obj.interrupted) {
    console.log("Inference data was interrupted, ignoring");
    return null;
  }
  return obj;
}
// Inference webhook. Placeholder for now: log the incoming body and ack with 200.
app.post("/infer", async (req, res) => {
  console.log("[/infer] incoming body:", JSON.stringify(req.body, null, 2));
  console.log("[/infer] query params:", req.query);
  if (req.body.role == "ASSISTANT") {
    req.body.mode = 'INFER'
    var obj = normalizeJson(req.body);
    if (obj) {
      var deviceId = req.query.deviceId;
      if (Object.prototype.hasOwnProperty.call(obj, 'trigger') && deviceId) {
        var triggerStateKey = 'infer_trigger_' + deviceId;
        var lastTrigger = await vcrstate.get(triggerStateKey);
        if (lastTrigger === obj.trigger) {
          console.log("[/infer] dropping duplicate trigger for device:", deviceId, obj.trigger);
          return res.sendStatus(200);
        }
        await vcrstate.set(triggerStateKey, obj.trigger);
        vcrstate.expire(triggerStateKey, 300);
      }
      
      req.body.text = JSON.stringify(obj);
      console.log("Normalized inference text: ", req.body.text);
      pusher.trigger('nova', "event", req.body);
      if (deviceId && obj) {
        obj.type='infer';
        pusher.trigger('vault-' + deviceId, "infer", obj);
      }
    }
  }
  res.sendStatus(200);
});

app.get("/ws_answer", async (req, res) => {
  console.log("Got ws_answer: ", req.query, req.body)
  var nccoResponse = [];
  if (req.query.conference_name) {
    var eox = req.query.transfer ? true : false;
    nccoResponse = [
      {
        action: "conversation",
        name: '' + req.query.conference_name,  // to handle multiple separate conf calls with VIDS Live Translation demo
        endOnExit: eox, // ends any websockets still up and the other's participant call leg, only if a transfer`
      }
    ]
    if (req.query.transfer) {
      await vcrstate.set('transfer_' + req.query.uuid, req.query).then(() => {
        vcrstate.expire('transfer_' + req.query.uuid, 300);
      })
      console.log("Transfer info on answer NCCO: ", req.query)
    }
  }
  res.status(200).json(nccoResponse);
})
app.post("/stepResults", async (req, res) => {
  console.log("Step Results: ", req.body);
  var date = new Date().toLocaleString();
  pusher.trigger('nova', "event", req.body);
  if (req.body.sessionId) {
    var validRes = ["allow", "block"]
    var stuff = await vcrstate.get('' + req.body.sessionId);
    if (!stuff) {
      console.log("No stuff, returning");
      return res.status(200).end();
    }
    console.log("Doing the big check: ", req.body.id > 0, validRes.includes(req.body.results?.toLowerCase()), (req.body.id > 0) && (validRes.includes(req.body.results?.toLowerCase())))
    if ((req.body.id > 0) && (validRes.includes(req.body.results?.toLowerCase()))) {
      var name = req.body.name.replace('\n', ' ');
      stuff.name = name;
      console.log("Are we processing the auth now? ", stuff)
      if (!stuff.count) {
        stuff.count = 1;
      } else {
        stuff.count++;
      }
      if (!stuff.result || req.body.results == 'block') {
        stuff.result = req.body.results;
      }
      console.log("Setting new stuff: ", stuff)
      await vcrstate.set(req.body.sessionId, stuff).then(() => {
        vcrstate.expire(req.body.sessionId, 300);
        console.log("stepResults state expiration set: ", req.body.sessionId)
      })
    }
    console.log("Got stuff on stepResults: ", stuff)
  }
  return res.status(200).end();
});
async function createCamara(phoneNumber, uuid, sandbox = false) {
  console.log(
    "Creating Camara Number Verification auth request for: ",
    phoneNumber
  );
  let app = users[sid].app_id;
  let state = "nv" + phoneNumber;
  if (sandbox) {
    app = users[sbox].app_id;
    state = "sb" + phoneNumber;
    console.log("Setting Sandbox into Redirection, app=" + app);
  }
  let camara = encodeURI("https://oidc.idp.vonage.com/oauth2/auth");
  camara += "?client_id=" + app;
  camara += "&redirect_uri=" + server_url + "/nverify";
  //    camara += '&redirect_uri=' + 'https://vids.vonage.com/vfraud' + '/nverify';
  camara += "&response_type=code";
  camara +=
    "&scope=" +
    "openid+dpv%3AFraudPreventionAndDetection%23number-verification-verify-read";
  camara += "&state=" + state;
  camara += "&login_hint=" + phoneNumber; //'34665609431';
  console.log("Camara oAuth request: ", camara);
  return camara;
}
async function doTef(phone, lat, long) {
  var res = false;
  var auth_req_id = await tefAuth(phone);
  if (!auth_req_id) {
    console.log("tefAuth no results")
    return;
  }
  var access_token = await tefAccess(auth_req_id);
  if (!access_token) {
    console.log("tefAccess no results")
    return;
  }
  if (!lat) lat = 40.44509;
  if (!long) long = -3.6939;
  var results = await tefLocation(access_token, phone, lat, long);
  console.log("doTef results: ", results);
  if (results?.verificationResult) res = results?.verificationResult;
  return res;
}
async function tefAuth(phone) {
  var results;
  var url =
    "https://sandbox.opengateway.telefonica.com/apigateway/bc-authorize";
  var body = {
    login_hint: "tel:" + phone,
    purpose: "dpv:FraudPreventionAndDetection#device-location-read",
  };
  console.log("tef Basic auth: ", body, 'Basic ' + btoa(process.env.tef_id + ':' + process.env.tef_secret))
  try {
    results = await axios.post(url, body, {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Authorization: 'Basic ' + btoa(process.env.tef_id + ':' + process.env.tef_secret)
      }
    });
    console.log("tefAuth results: ", results.data.auth_req_id);
    return results.data.auth_req_id;
  } catch (err) {
    console.log("tefAuth error: ", err);
  }
}
async function tefAccess(reqId) {
  var url = "https://sandbox.opengateway.telefonica.com/apigateway/token";
  var body = {
    grant_type: "urn:openid:params:grant-type:ciba",
    auth_req_id: reqId,
  };
  try {
    var results = await axios.post(url, body, {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Authorization: 'Basic ' + btoa(process.env.tef_id + ':' + process.env.tef_secret)

      },
    });
    console.log("tefAccess results: ", results.data.expires_in);
    return results.data.access_token;
  } catch (err) {
    console.log("tefAccess error: ", err.response?.data);
  }
}
async function tefLocation(token, phone, lat, long) {
  if (!lat) lat = 40.44509;
  if (!long) long = -3.6939;
  var url = "https://sandbox.opengateway.telefonica.com/apigateway/location/v0/verify";
  var body = {
    ueId: { msisdn: phone },
    latitude: parseFloat(lat),
    longitude: parseFloat(long),
    accuracy: 20,
  };
  console.log("Tef Location body: ", body)
  try {
    var results = await axios.post(url, body, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
    });
    console.log("tefLocation results: ", results.data);
    return results.data;
  } catch (err) {
    console.log("tefLocation error: ", err.response?.data);
    if (err.response?.data?.code) {
      return err.response.data.code;
    }
  }
}
async function createSilent(phoneNumber, mobile = true) {
  const brand = "VIDS";
  console.log("Creating silent_auth request for: ", phoneNumber);
  const body = {
    brand: brand,
    channel_timeout: 60,
    workflow: [
      //{ channel: "silent_auth", to: phoneNumber }
      { channel: "sms", to: phoneNumber },
      //    {channel: "voice", to: phoneNumber}
    ],
  };
  if (mobile) {
    console.log("Adding Silent Auth to top of the Verify Workflow")
    body.channel_timeout = 120;
    body.workflow.unshift({ channel: "silent_auth", to: phoneNumber });
  }
  console.log("Sending V2 workflow: ", body);
  const jwt = tokenGenerate(users[sid].app_id, users[sid].keyfile, {});
  //console.log("jwt: " + jwt);
  var results;
  var url = v2url;
  if (phoneNumber.startsWith("61")) {
    url = v2url_eu;
  }
  try {
    results = await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + jwt,
      },
    });
    console.log("createRequest", results.data);
    return { status: results.status, body: results.data };
  } catch (err) {
    console.log("V2 Code error: ", err.response?.data);
    return {
      results: "" + err.response?.status,
      reason: err.response?.data?.detail,
    };
  }
}
async function nvcall(phone, token) {
  console.log("Got Camara Number Verification Token webhook!!!!");
  var date = new Date().toLocaleString();
  //get phone here, from req_id?
  try {
    //let results = await axios.post('https://api-eu.dev.v1.vonagenetworks.net/camara/number-verification/v031/verify',
    let results = await axios.post(
      "https://api-eu.vonage.com/camara/number-verification/v031/verify",
      {
        phoneNumber: phone,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
          "X-Nexmo-Trace-Id": "TEST_CAMARA_AUTH",
        },
      }
    );
    console.log(
      "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Camara nverify devicecheck request, got results for " +
      phone +
      ": ",
      results.data
    );
    return results.data;
  } catch (err) {
    console.log(
      "Camara nverify devicecheck request error: ",
      err.response?.status,
      err.response?.statusText
    );
    return {
      results: "" + err.response?.status,
      reason: err.response?.data?.detail,
    };
  }
}
app.all("/nverify", async (req, res) => {
  console.log(
    "Got Camara Number Verification redirection webhook!!!!",
    req.query
  );
  var date = new Date().toLocaleString();
  let state = req.query.state;
  let okay = false;
  let phone = state.slice(2);
  let id = sid;
  if (state.startsWith("sb")) {
    id = sbox;
  }
  if (!phone) phone = "34665609431";
  try {
    let jwt = tokenGenerate(users[id].app_id, users[id].keyfile, {});
    let app = users[id].app_id;
    let code = req.query.code;
    //        let results = await axios.get('https://api-eu.dev.v1.vonagenetworks.net/oauth2/token',
    let results = await axios.get("https://api-eu.vonage.com/oauth2/token", {
      data: qs.stringify({
        grant_type: "authorization_code",
        redirect_uri: server_url + "/nverify",
        code: code,
        client_id: app,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Bearer " + jwt,
        Cookie: "FPID=3aeb2aa0-c8f4-4a20-a376-1eae04e1aabf",
      },
    });
    console.log(
      "Camara nverify token request, got results: ",
      results.data?.token_type
    );
    if (results.data.access_token) {
      // Ha!  We got the token back!
      let nvresults = await nvcall(phone, results.data.access_token);
      if (nvresults) {
        console.log("nvresults: ", nvresults);
        if (nvresults.devicePhoneNumberVerified) {
          okay = true;
        } else {
          okay = false;
        }
      } else {
        okay = false;
      }
      //return { status: results.status, body: results.data }
    } else {
      okay = false;
    }
  } catch (err) {
    console.log("Camara nverify token request error: ", err);
    okay = false;
  }
  return res.status(200).json({ results: okay }).end();
});


async function getSim(phone) {
  console.log("Using Identity Insights: ", users[sid].app_id);
  var action = "block"; // Default action is to block
  const jwt = tokenGenerate(users[sid].app_id, users[sid].keyfile, {});
  const params = {
    phone_number: phone,
    insights: {
      format: {},
      original_carrier: {},
      current_carrier: {},
      sim_swap: {
        period: 240
      },
    },
  };
  //const clientInsights = new IdentityInsights(jwt, {});

  //const results = await clientInsights.getIdentityInsights(params);
  var obj = {
    phone_number: phone,
    purpose: "FraudPreventionAndDetection",
    insights: {
      format: {},
      sim_swap: {
        period: 240
      },
      original_carrier: {},
      current_carrier: {}
    }
  }
  var results = await axios.post("https://api-us.vonage.com/v0.1/identity-insights", obj, {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + jwt,
    },
  });
  console.log("Got Number Insightresults: ", results.data, results.data?.insights?.sim_swap);
  if (results.data?.insights?.sim_swap?.hasOwnProperty('is_swapped')) {
    action = (results.data.insights.sim_swap.is_swapped) ? "block" : "allow";
  } else if (results.data?.insights?.sim_swap?.status) {
    action = results.data?.insights?.sim_swap?.status.code
  }
  return action;
}
async function cognitoRequest(action, body) {
  var region = process.env.cognitoRegion || 'us-east-1';
  var data;
  try {
    /*
    const response = await fetch(
      `https://cognito-idp.${region}.amazonaws.com/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
        },
        body: JSON.stringify(body),
      }
    );

    data = await response.json();
    if (!response.ok) {
      console.log("Cognito request response error: ", data.message || data.__type || 'Request failed')
      return null;
    }
    */
    const results = await axios.post(
      `https://cognito-idp.${region}.amazonaws.com/`,
      body,
      {
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
        },
      }
    );
    console.log("Got cognito response: ", results.data)
    data = results.data

  } catch (err) {
    console.log("Cognito request error: ", err?.code, err?.status, err?.data)
  }
  return data;
}
app.post("/cognitoInit", async (req, res) => {
  var date = new Date().toLocaleString();
  console.log(`cognitoInit request at ${date} : `, req.body);
  if (!req.body.phone) return res.status(200).end();
  var phone = req.body.phone.replace(/\D/g, "");
  var deviceId = req.body.deviceId ?? '';
  var body = {
    AuthFlow: 'CUSTOM_AUTH',
    ClientId: process.env.cognitoClient,
    AuthParameters: {
      USERNAME: '+' + phone,
      DEVICEID: deviceId
    }
  }
  var cog = await cognitoRequest('InitiateAuth', body)
  console.log("Cognito initialization request results: ", cog)
  if (cog?.Session) {
    console.log("Got session, storing data: ", phone);
    try {
      await vcrstate.set('' + phone, cog).then(() => {
        console.log("State set, setting expiry")
        vcrstate.expire('' + phone, 300);
        console.log("Cognito Request state expiration set: ", uuid)
      })
    } catch (err) {
      console.log("vcrstate.set error")
    }
  }
  console.log("Returning 200ok for cognitoInit")
  return res.status(200).json({ results: cog }).end();
})
app.post("/cognitoStart", async (req, res) => {
  var date = new Date().toLocaleString();
  console.log(`cognitoStart request at ${date} : `, req.body);
  var mobile = req.body.mobile ?? false;
  //mobile = true /// for test
  var phone = req.body.user?.replace(/\D/g, "");
  var deviceId = req.body.deviceId ?? '';
  if (!phone) return res.status(200).end();
  var block = await getSim(phone)
  var redirect = "";
  let sreq = await createSilent(phone, mobile ? true : false);
  console.log("Cognito createSilent results: ", sreq);
  redirect = sreq.body?.check_url;
  var reqid = sreq.body?.request_id;
  var ret = { simswap: block, redirect: redirect, request_id: reqid };
  console.log("Return from cognitoStart: ", ret)
  return res.status(200).json(ret).end();
})
app.post("/cognitoResults", async (req, res) => {
  var date = new Date().toLocaleString();
  console.log(`cognitoResults request at ${date} : `, req.body);
  if (!req.body.phone || !req.body.code) return res.status(200).end();
  var phone = req.body.phone.replace(/\D/g, "");
  var code = req.body.code;
  var stuff = await vcrstate.get('' + phone);
  if (!stuff) {
    console.log("Not finding stored cognito session for ", phone)
    return res.status(200).end();
  }
  var session = stuff.Session;
  var body = {
    ClientId: process.env.cognitoClient,
    ChallengeName: 'CUSTOM_CHALLENGE',
    Session: session,
    ChallengeResponses: {
      USERNAME: '+' + phone,
      ANSWER: code,
    }
  }
  var cog = await cognitoRequest('RespondToAuthChallenge', body)
  console.log("Cognito initialization request: ", cog)

  return res.status(200).json({ results: cog }).end();
})

startup();
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
