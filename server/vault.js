import { Vonage } from "@vonage/server-sdk";
import { vcr } from "@vonage/vcr-sdk";
import { tokenGenerate } from "@vonage/jwt";

import express from "express";
import axios from "axios";
import utils from "./vutils.cjs";
import dgram from "node:dgram";
import fs from "fs";
import qs from "qs";

const udpserver = dgram.createSocket("udp4");
const v2url = "https://api.nexmo.com/v2/verify/";
const tef_phone = "+34649380428";
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

console.log("Starting up with URL = " + server_url);
let gnids;
utils.getIniStuff().then((res) => {
  gnids = res;
  console.log("Got ini: ", gnids.masterkey);
});
const vid = 949;
const sid = 790;
const sbox = 953;
var vonage;
var users = [];
var requests = [];

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
  console.log("Keepalive: " + req.query);
  res.sendStatus(200);
});
async function getSB(id) {
  console.log("Creting sandbox user: ", id);
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
  utils.getNexmo(vid).then((result) => {
    console.log("Creating Silent user record for " + vid);
    users[vid] = result;
    users[vid].id = vid;
    users[vid].request_id = null;

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
      })
      .catch((err) => console.error(err));
  });
  utils.getNexmo(sid).then((result) => {
    console.log("Creating Silent user record for " + sid);
    users[sid] = result;
    users[sid].id = vid;
    users[sid].request_id = null;
  });
  let interval = setInterval(() => {
    axios
      .get(`${process.env.VCR_INSTANCE_PUBLIC_URL}/keepalive`)
      .then((resp) => {
        //console.log(resp.data);
      })
      .catch((err) => console.log("VCR interval error:", err.code));
  }, 30000);
  await getSB(sbox);
  console.log("****************************** TEF Location") 
  var lat = 40.44509;
  var long =  -3.6939;
  await doTef(tef_phone, lat, long );
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
      const jwt = tokenGenerate(users[vid].app_id, users[vid].keyfile, {});
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
      console.log("V2 Code error: ", err.response.status);
    }
  }
  return results.data;
}
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
    return res.status(200).json({ results: action, data: results });
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
  return res.status(200).json({ results: action, data: results.data });
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
    return res.status(200).json({ results: action, data: results });
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

  return res.status(200).json({ results: action, data: results.data });
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
  var action = "allow";
  if (req.body.demo) {
    // If demo mode, skip and return true...
    results = {
      action: "allow",
    };
    return res.status(200).json({ results: action, data: results });
  }
  if (
    phone.startsWith("49") ||
    phone.startsWith("34") ||
    phone.startsWith("14083751")
  ) {
    var ss = await getSS2(phone);
    console.log("Got Camara SS results: ", ss);
    return res.status(200).json({ results: action, data: ss });
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
  } catch (err) {
    console.log("getFraud error", err);
    return { error: err.data?.response };
  }

  return res.status(200).json({ results: action, data: results.data });
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
    phone.startsWith("49") ||
    phone.startsWith("34") ||
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
  if(phone.startsWith("34") || phone.startsWith("+34") || req.body.sandbox){ // TEF, most likely
    if(!phone.startsWith("+")) phone = "+"+phone;
    var lat = 40.44509;
    var long =  -3.6939;
        var tef =   await doTef(phone, lat, long );
        if(! tef || tef == 'NOT_FOUND') {
            results= 'block'
        }
   }
  return res.status(200).json({ results: results });
});
app.post("/getFacial", (req, res) => {
  console.log("getFacial request: ", req.body);
  var date = new Date().toLocaleString();
  if (!req.body.phone) {
    console.log("No phone passed in.");
    return res.status(200).end();
  }
  return res.status(200).json({ results: "allow" });
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
  camara += "?client_id=" + app; //f5daaf58-d4fa-4482-bc63-ac145dfec818';
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
    var auth_req_id = await tefAuth(phone);
    if(!auth_req_id) {
        console.log("tefAuth no results")
        return;
    }
    var access_token = await tefAccess(auth_req_id);
    if(!access_token) {
        console.log("tefAccess no results")
        return;
    }
    if(!lat) lat = 40.44509;
    if(!long) long =-3.6939;
    var results = await tefLocation(access_token, phone, lat, long);
    console.log("doTef results: ",results);
}
async function tefAuth(phone) {
  var results;
  var url =
    "https://sandbox.opengateway.telefonica.com/apigateway/bc-authorize";
  var body = {
    login_hint: "tel:" + phone,
    purpose: "dpv:FraudPreventionAndDetection#device-location-read",
  };
  console.log("tef Basic auth: ",body,'Basic ' + btoa(process.env.tef_id + ':' + process.env.tef_secret))
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
    console.log("tefAccess results: ", results.data);
    return results.data.access_token;
  } catch (err) {
    console.log("tefAccess error: ", err.response?.data);
  }
}
async function tefLocation(token, phone, lat, long) {
  if(!lat) lat = 40.44509;
  if(!long) long =-3.6939;
  var url = "https://sandbox.opengateway.telefonica.com/apigateway/location/v0/verify";
  var body = {
    ueId: { msisdn: phone },
    latitude: parseFloat(lat),
    longitude: parseFloat(long),
    accuracy: 2,
  };
  try {
    var results = await axios.post(url, body, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type' : 'application/json'
  },
    });
    console.log("tefLocation results: ", results.data);
    return results.data;
  } catch (err) {
    console.log("tefLocation error: ", err.response?.data);
    if(err.response?.data?.code) {
        return err.response.data.code;
    }
  }
}
async function createSilent(phoneNumber) {
  const brand = "VIDS";
  console.log("Creating silent_auth request for: ", phoneNumber);
  const body = {
    brand: brand,
    channel_timeout: 60,
    workflow: [
      { channel: "silent_auth", to: phoneNumber },
      //            { channel: "sms", to: phoneNumber },
      //    {channel: "voice", to: phoneNumber}
    ],
  };
  console.log("Sending V2 workflow: ", body);
  const jwt = tokenGenerate(users[vid].app_id, users[vid].keyfile, {});
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
    //let jwt = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3MDY5MDA4MjAsImV4cCI6MTczODQzNjgyMCwianRpIjoiWDdkZVNLMWN6bzFTIiwiYXBwbGljYXRpb25faWQiOiJmNWRhYWY1OC1kNGZhLTQ0ODItYmM2My1hYzE0NWRmZWM4MTgiLCJzdWIiOiIiLCJhY2wiOiIifQ.W65UtrVFlpmWp_aMAjomb0ZJnnpuGl9CJpF1D47IrET7ELy1mdnb46ljSqYP55IMblekgMSjLJ0otwzZOBaBtXXsRA4FTbd1fcl_W2EAjs27RRqGtxy0upYmbFu3eS9cpxhK85Rxz8umnZgviwF_U781XbMWcNZiAyN37bAYNFUpgt1ZnsKv-xkqyxzvV82HFO-3b-Nq-7CNdx6sX9lS5gVLMUIW6eEcOLMs3PBB2B3biq6FMMrqY7Dl-q-qZq2G-NcPFOwpTtbTkQrlcwzn4Ki1ab57RjJJBf5kpKNWmgQftFEWR7arFH8n0aSvERQ27a-f9QyxuF7bqomEBdRjPg';
    let jwt = tokenGenerate(users[id].app_id, users[id].keyfile, {});
    let app = users[id].app_id;
    let code = req.query.code;
    //        let results = await axios.get('https://api-eu.dev.v1.vonagenetworks.net/oauth2/token',
    let results = await axios.get("https://api-eu.vonage.com/oauth2/token", {
      data: qs.stringify({
        grant_type: "authorization_code",
        redirect_uri: server_url + "/nverify",
        code: code,
        client_id: app, //'f5daaf58-d4fa-4482-bc63-ac145dfec818',
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
  return res.status(200).json({ results: okay });
});

startup();
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
