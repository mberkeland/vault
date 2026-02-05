package com.vonagevault

import android.annotation.SuppressLint
import android.util.Log
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.content.Context
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
    private var audioManager: AudioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
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
    fun deviceTypeToString(type: Int): String {
    return when (type) {
        AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> "BUILTIN_EARPIECE"
        AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "BUILTIN_SPEAKER"
        AudioDeviceInfo.TYPE_WIRED_HEADSET -> "WIRED_HEADSET"
        AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "WIRED_HEADPHONES"
        AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "BLUETOOTH_SCO"
        AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "BLUETOOTH_A2DP"
        AudioDeviceInfo.TYPE_BLE_HEADSET -> "BLE_HEADSET"
        // Add other types as needed
        else -> "UNKNOWN_TYPE ($type)"
    }
}
    fun setCommunicationDevices() {
        // Get the list of currently available communication devices
        val devices: List<AudioDeviceInfo> = audioManager.availableCommunicationDevices
        
        Log.d("ClientManager", "Available communication devices: ${devices.size}")

        for (device in devices) {
            // Log device details
            Log.d("ClientManager", "Device ID: ${device.id}, Raw Type: ${device.type}, Type: ${deviceTypeToString(device.type)}, Name: ${device.productName}")
            
            // Example of selecting and setting a specific device
            // This example looks for the first BUILTIN_SPEAKER
            if (device.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                // You can use setCommunicationDevice(device) to route audio to this device
                val result = audioManager.setCommunicationDevice(device)
                Log.d("ClientManager", "Setting BUILTIN_SPEAKER result: $result")
            }
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
                setCommunicationDevices();
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
