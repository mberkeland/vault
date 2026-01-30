package com.vonagevault

import android.annotation.SuppressLint
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.vonage.android_core.VGClientConfig
import com.vonage.clientcore.core.api.ClientConfigRegion
import com.vonage.voice.api.*
//import com.vonage.clientcore.core.api.LoggingLevel
//import com.vonage.clientcore.core.api.ConfigKt.setDefaultLoggingLevel

class ClientManager(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private var client: VoiceClient = VoiceClient(context)
    private var callID: String? = null
    private var eventEmitter: EventEmitter = EventEmitter(context)

    init {
        Log.d("ClientManager", "Initializing VoiceClient")
        client.setConfig(VGClientConfig(ClientConfigRegion.US))
    }

    override fun getName(): String {
        return "ClientManager"
    }

    private fun sendEvent(event: String, name: String, text: String) {
        val params: WritableMap = Arguments.createMap()
        params.putString(name, text)
        eventEmitter.sendEvent(event, params)
    }

    @ReactMethod
    fun login(jwt: String) {
        Log.d("ClientManager", "login: $jwt")

        client.createSession(jwt, null) { error, sessionId ->
            if (error != null) {
                this.sendEvent("onStatusChange", "status", "Error")
            }
            if (sessionId != null) {
                this.sendEvent("onStatusChange", "status", "Connected");
                client.setOnLegStatusUpdate { callId, legId, status ->
                  Log.d("ClientManager", "Leg status update: callId=$callId, legId=$legId, status=$status")
                  this.sendEvent("onCallStateChange", "state", status.name)
                }
                client.setOnCallHangupListener { callId, callQuality, reason ->
                    Log.d("ClientManager", "Call hangup: callId=$callId, reason=$reason")
                    this.sendEvent("onCallStateChange", "state", "Idle")
                }
            }
            null
        }
    }

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun makeCall(number: String) {
        val callData: HashMap<String, String> = HashMap()

        callData["to"] = number
        client.serverCall(callData) { error, outboundCallID ->
            if (error != null) {
                this.sendEvent("onCallStateChange", "state", "Error")
            }
            if (outboundCallID != null) {
                this.sendEvent("onCallStateChange", "state", "On Call")
                callID = outboundCallID
            }
            null
        }
    }

    @ReactMethod
    fun endCall() {
        val currentCallID = callID
        if (currentCallID != null) {
            client.hangup(currentCallID) { error ->
                if (error == null) {
                    this.sendEvent("onCallStateChange", "state", "Idle")
                }
                null
            }
        }
    }
}
