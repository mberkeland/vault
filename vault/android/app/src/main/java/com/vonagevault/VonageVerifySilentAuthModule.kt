package com.vonagevault

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.vonage.clientlibrary.VGCellularRequestClient
import com.vonage.clientlibrary.VGCellularRequestParameters
import org.json.JSONObject
import java.net.URL

class VonageVerifySilentAuthModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    val client = VGCellularRequestClient.initializeSdk(reactContext)
    override fun getName() = "VonageVerifySilentAuthModule"


    @ReactMethod
    fun openWithDataCellular(url: String, debug: Boolean, promise: Promise) {
        Log.d("openWithDataCellular", "openWithDataCellular url: $url, debug: $debug")
        val params = VGCellularRequestParameters(
          url = url,
          headers = mapOf("x-my-header" to "My Value") ,
          queryParameters = mapOf("query-param" to "value"),
          maxRedirectCount = 20
        )

        val resp: JSONObject =  VGCellularRequestClient.getInstance().startCellularGetRequest(params, debug)

        if (resp.optString("error") != "") {
            promise.reject("openWithDataCellular failed: ", resp.optString("error"))
        } else {
            val status = resp.optInt("http_status")
            if (status == 200) {
                promise.resolve(resp.toString())
            } else {
                promise.reject("openWithDataCellular failed: ", status.toString())
            }
        }
    }
}