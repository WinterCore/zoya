package com.wintercore.zoya

import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

class TimeNotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "TimeNotificationModule"

    @ReactMethod
    fun startService(sessionData: ReadableMap, deviceData: ReadableMap, promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, TimeNotificationService::class.java).apply {
                putExtra(TimeNotificationService.EXTRA_TOKEN, sessionData.getString("token"))
                putExtra(TimeNotificationService.EXTRA_SECRET, sessionData.getString("secret"))
                putExtra(TimeNotificationService.EXTRA_DEVICE_PN, deviceData.getString("pn"))
                putExtra(TimeNotificationService.EXTRA_DEVICE_SN, deviceData.getString("sn"))
                putExtra(TimeNotificationService.EXTRA_DEVICE_CODE, deviceData.getInt("devcode"))
                putExtra(TimeNotificationService.EXTRA_DEVICE_ADDR, deviceData.getInt("devaddr"))
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            // Clear saved credentials so service doesn't restart
            val prefs = reactApplicationContext.getSharedPreferences(
                TimeNotificationService.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            prefs.edit().clear().apply()

            val intent = Intent(reactApplicationContext, TimeNotificationService::class.java)
            reactApplicationContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
