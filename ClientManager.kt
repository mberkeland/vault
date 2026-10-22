package com.vonagevault

import android.annotation.SuppressLint
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.vonage.android_core.VGClientConfig
import com.vonage.clientcore.core.api.ClientConfigRegion
import com.vonage.voice.api.*
import com.vonage.clientcore.core.api.LoggingLevel
import com.vonage.clientcore.core.api.ConfigKt.setDefaultLoggingLevel

class ClientManager(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private var client: VoiceClient = VoiceClient.createClient(context)
    private var callID: String? = null
    private var eventEmitter: EventEmitter = EventEmitter(context)

    init {
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
        client.createSession(jwt, null) { error, sessionId ->
            if (error != null) {
                this.sendEvent("onStatusChange", "status", "Error")
            }
            if (sessionId != null) {
                this.sendEvent("onStatusChange", "status", "Connected")
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
        if (callID != null) {
            client.hangup(callID) { error ->
                if (error == null) {
                    this.sendEvent("onCallStateChange", "state", "Idle")
                }
                null
            }
        }
    }
}
