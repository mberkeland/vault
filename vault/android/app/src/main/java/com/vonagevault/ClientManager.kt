package com.vonagevault

import android.annotation.SuppressLint
import android.util.Log
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioDeviceCallback
import android.content.Context
import androidx.core.content.ContextCompat
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
    private var audioFocusRequest: AudioFocusRequest? = null
    private var hasAudioFocus = false
    private var currentDevice = 0
    init {
        Log.d("ClientManager", "Initializing VoiceClient")
        client.setConfig(VGClientConfig(ClientConfigRegion.US))
        val listener = AudioManager.OnCommunicationDeviceChangedListener { device -> // Handle changes
            Log.d("ClientManager", "Audio device changed {$device}")
            if(currentDevice>0 && (currentDevice != device?.id)) {
            Log.d("ClientManager", "Mismatched Audio device, changing {$device.id} to {$currentDevice}")
                //setCommunicationDevices();
            }
            //currentCommunicationDevice = device
        }
        client.setOnLegStatusUpdate { callId, legId, status ->
            Log.d("ClientManager", "Leg status update: callId=$callId, legId=$legId, status=$status")
            this.sendEvent("onCallStateChange", "state", status.name)
        }
        client.setOnCallHangupListener { callId, callQuality, reason ->
            Log.d("ClientManager", "Call hangup: callId=$callId, reason=$reason")
            this.sendEvent("onCallStateChange", "state", "Idle")
        }

        val executor = ContextCompat.getMainExecutor(context)
        audioManager.addOnCommunicationDeviceChangedListener(executor, listener)
   }

    override fun getName(): String {
        return "ClientManager"
    }
    private val audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        when (focusChange) {
            AudioManager.AUDIOFOCUS_GAIN -> {
                // Resume playback or increase volume
                // e.g., mediaPlayer.start()
            }
            AudioManager.AUDIOFOCUS_LOSS, AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                // Stop or pause playback
                // e.g., mediaPlayer.pause()
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                // Lower volume (duck)
            }
        }
    }
    private fun requestAudioFocus(): Boolean {
            val playbackAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()

            audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(playbackAttributes)
                .setAcceptsDelayedFocusGain(true) // Allows system to grant focus later
                .setOnAudioFocusChangeListener(audioFocusChangeListener)
                .build()
            
            val result = audioManager.requestAudioFocus(audioFocusRequest!!)
            Log.d("ClientManager", "requestAudioFocus: ${result}")
            hasAudioFocus = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        return hasAudioFocus
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
                /*
                client.setOnLegStatusUpdate { callId, legId, status ->
                  Log.d("ClientManager", "Leg status update: callId=$callId, legId=$legId, status=$status")
                  this.sendEvent("onCallStateChange", "state", status.name)
                }
                client.setOnCallHangupListener { callId, callQuality, reason ->
                    Log.d("ClientManager", "Call hangup: callId=$callId, reason=$reason")
                    this.sendEvent("onCallStateChange", "state", "Idle")
                }
                */
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
        requestAudioFocus()
        // Get the list of currently available communication devices
        val devices: List<AudioDeviceInfo> = audioManager.availableCommunicationDevices
        Log.d("ClientManager", "Available communication devices: ${devices.size}")
        var found = false;
        //lateinit var bestDevice:AudioDeviceInfo
        var bestDevice = 0;
        for (device in devices) {
            // Log device details
            Log.d("ClientManager", "Device ID: ${device.id}, Raw Type: ${device.type}, Type: ${deviceTypeToString(device.type)}, Name: ${device.productName} device: {$device}")
            
            // Example of selecting and setting a specific device
            // This example looks for the first BUILTIN_SPEAKER
            if (!found && (device.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER)) {
                // You can use setCommunicationDevice(device) to route audio to this device
 //               val result = audioManager.setCommunicationDevice(device)
                Log.d("ClientManager", "Setting BUILTIN_SPEAKER ${device.id} type ${device.type}")
                bestDevice=device.id
            }
            if((device.type == AudioDeviceInfo.TYPE_BLE_HEADSET) || (device.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP) || (device.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO)) {
//                val result = audioManager.setCommunicationDevice(device)
                Log.d("ClientManager", "Setting Bluetooth ${device.id} type ${device.type}")
                bestDevice=device.id
                found=true;
            }
        }
        Log.d("ClientManager","Ok, the best device is $bestDevice")
        currentDevice = bestDevice;
        for (device in devices) {
            if(device.id == bestDevice) {
            val result = audioManager.setCommunicationDevice(device)
            Log.d("ClientManager", "Setting Output device type ${device.type} result: ${result}")
            }
        }
    }
    @SuppressLint("MissingPermission")
    @ReactMethod
    fun makeCall(number: String) {
        val callData: HashMap<String, String> = HashMap()

        callData["to"] = number
        Log.d("ClientManager", "makeCall to ${number}")

        client.serverCall(callData) { error, outboundCallID ->
            if (error != null) {
                this.sendEvent("onCallStateChange", "state", "Error")
                Log.d("ClientManager", "makeCall error ${error}")
            }
            if (outboundCallID != null) {
                setCommunicationDevices();
                this.sendEvent("onCallStateChange", "state", "On Call")
                callID = outboundCallID
                Log.d("ClientManager", "makeCall callId ${callID}")
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
