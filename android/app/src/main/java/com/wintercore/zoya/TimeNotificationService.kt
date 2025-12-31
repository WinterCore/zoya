package com.wintercore.zoya

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.text.SpannableString
import android.text.style.ForegroundColorSpan
import android.util.Log
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.net.URL
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

class TimeNotificationService : Service() {
    companion object {
        const val TAG = "BatteryNotification"
        const val CHANNEL_ID = "battery_notification_channel"
        const val NOTIFICATION_ID = 1
        const val UPDATE_INTERVAL = 150_000L // 2.5 minutes
        const val PREFS_NAME = "battery_notification_prefs"

        const val EXTRA_TOKEN = "token"
        const val EXTRA_SECRET = "secret"
        const val EXTRA_DEVICE_PN = "devicePn"
        const val EXTRA_DEVICE_SN = "deviceSn"
        const val EXTRA_DEVICE_CODE = "deviceCode"
        const val EXTRA_DEVICE_ADDR = "deviceAddr"
        const val PREF_LAST_GRID_ON = "lastGridOnTimestamp"

        private const val BASE_URL = "http://android.shinemonitor.com/public/"
        private const val SUFFIX_CONTEXT = "i18n=pt_BR&lang=pt_BR&source=1&_app_client_=android&_app_id_=wifiapp.volfw.watchpower&_app_version_=1.0.6.3"
    }

    private val prefs: SharedPreferences by lazy {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private val handler = Handler(Looper.getMainLooper())
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var updateRunnable: Runnable

    private var token: String = ""
    private var secret: String = ""
    private var devicePn: String = ""
    private var deviceSn: String = ""
    private var deviceCode: Int = 0
    private var deviceAddr: Int = 0

    // Current notification data
    private var batteryPercent: Int = 0
    private var watts: Int = 0
    private var gridOn: Boolean = false
    private var lastUpdateTime: String = "--:--"
    private var hoursSinceLastGridOn: Double? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        updateRunnable = object : Runnable {
            override fun run() {
                fetchAndUpdateNotification()
                handler.postDelayed(this, UPDATE_INTERVAL)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Try to get credentials from intent first, fall back to SharedPreferences
        val intentToken = intent?.getStringExtra(EXTRA_TOKEN)

        if (!intentToken.isNullOrEmpty()) {
            // Fresh start with credentials from JS - save them
            token = intentToken
            secret = intent.getStringExtra(EXTRA_SECRET) ?: ""
            devicePn = intent.getStringExtra(EXTRA_DEVICE_PN) ?: ""
            deviceSn = intent.getStringExtra(EXTRA_DEVICE_SN) ?: ""
            deviceCode = intent.getIntExtra(EXTRA_DEVICE_CODE, 0)
            deviceAddr = intent.getIntExtra(EXTRA_DEVICE_ADDR, 0)

            // Persist to SharedPreferences for restart
            prefs.edit().apply {
                putString(EXTRA_TOKEN, token)
                putString(EXTRA_SECRET, secret)
                putString(EXTRA_DEVICE_PN, devicePn)
                putString(EXTRA_DEVICE_SN, deviceSn)
                putInt(EXTRA_DEVICE_CODE, deviceCode)
                putInt(EXTRA_DEVICE_ADDR, deviceAddr)
                apply()
            }
            Log.i(TAG, "Service started with fresh credentials, saved to prefs")
        } else {
            // Restart - load from SharedPreferences
            token = prefs.getString(EXTRA_TOKEN, "") ?: ""
            secret = prefs.getString(EXTRA_SECRET, "") ?: ""
            devicePn = prefs.getString(EXTRA_DEVICE_PN, "") ?: ""
            deviceSn = prefs.getString(EXTRA_DEVICE_SN, "") ?: ""
            deviceCode = prefs.getInt(EXTRA_DEVICE_CODE, 0)
            deviceAddr = prefs.getInt(EXTRA_DEVICE_ADDR, 0)
            Log.i(TAG, "Service restarted, loaded credentials from prefs")
        }

        Log.d(TAG, "Service starting with device: $devicePn")

        val notification = buildNotification()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        // Start the update loop
        handler.post(updateRunnable)

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(updateRunnable)
        executor.shutdown()
        Log.i(TAG, "Service destroyed")
    }

    fun clearCredentials() {
        prefs.edit().clear().apply()
        Log.i(TAG, "Credentials cleared from prefs")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Battery Status",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Shows battery status"
            setShowBadge(false)
        }

        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        val title = if (gridOn) {
            "$batteryPercent% · Charging · $lastUpdateTime"
        } else {
            "$batteryPercent% · ${formatWatts(watts)} · $lastUpdateTime"
        }

        val subtitle = if (!gridOn && hoursSinceLastGridOn != null) {
            val text = "${formatDuration(hoursSinceLastGridOn!!)} since last grid"
            SpannableString(text).apply {
                setSpan(ForegroundColorSpan(Color.YELLOW), 0, length, 0)
            }
        } else {
            null
        }

        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .apply { if (subtitle != null) setContentText(subtitle) }
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(pendingIntent)
            .setProgress(100, batteryPercent, false)
            .setColor(Color.GREEN)
            .build()
    }

    private fun formatDuration(hours: Double): String {
        val totalMinutes = (hours * 60).toInt()
        val h = totalMinutes / 60
        val m = totalMinutes % 60
        val minuteStr = if (m == 1) "1 minute" else "$m minutes"
        val hourStr = if (h == 1) "1 hour" else "$h hours"

        return when {
            h == 0 -> minuteStr
            m == 0 -> hourStr
            else -> "$hourStr and $minuteStr"
        }
    }

    private fun formatWatts(watts: Int): String {
        return "%,dW".format(Locale.US, watts)
    }

    private fun fetchAndUpdateNotification() {
        executor.execute {
            try {
                val now = SimpleDateFormat("HH:mm:ss", Locale.US).format(Date())
                Log.i(TAG, "[$now] Fetching battery data...")
                val data = fetchBatteryData()
                if (data != null) {
                    batteryPercent = data.batteryPercent
                    watts = data.watts
                    gridOn = data.gridOn
                    lastUpdateTime = data.timeString

                    // Update last grid on timestamp cache
                    if (data.lastGridOnTimestamp != null) {
                        val cached = prefs.getLong(PREF_LAST_GRID_ON, 0)
                        if (data.lastGridOnTimestamp > cached) {
                            prefs.edit().putLong(PREF_LAST_GRID_ON, data.lastGridOnTimestamp).apply()
                        }
                    }

                    // Calculate hours since last grid on
                    hoursSinceLastGridOn = calculateHoursSinceLastGridOn(data.lastGridOnTimestamp)

                    Log.d(TAG, "Data fetched: $batteryPercent%, ${watts}W, gridOn=$gridOn, hoursSinceGrid=$hoursSinceLastGridOn")

                    handler.post {
                        updateNotification()
                    }
                } else {
                    Log.w(TAG, "Failed to fetch battery data")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching battery data", e)
            }
        }
    }

    private fun calculateHoursSinceLastGridOn(todayLastGridOn: Long?): Double? {
        // First try today's data
        var lastGridOn = todayLastGridOn

        // If no grid on today, check cache
        if (lastGridOn == null || lastGridOn == 0L) {
            val cached = prefs.getLong(PREF_LAST_GRID_ON, 0)
            if (cached > 0) {
                lastGridOn = cached
            }
        }

        // If still no data, try fetching yesterday
        if (lastGridOn == null || lastGridOn == 0L) {
            lastGridOn = fetchYesterdayLastGridOn()
            if (lastGridOn != null && lastGridOn > 0) {
                prefs.edit().putLong(PREF_LAST_GRID_ON, lastGridOn).apply()
            }
        }

        if (lastGridOn == null || lastGridOn == 0L) {
            return null
        }

        val now = System.currentTimeMillis()
        return (now - lastGridOn) / (1000.0 * 60 * 60)
    }

    private fun fetchYesterdayLastGridOn(): Long? {
        try {
            val calendar = java.util.Calendar.getInstance()
            calendar.add(java.util.Calendar.DAY_OF_YEAR, -1)
            val yesterday = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(calendar.time)

            val baseParams = "&action=queryDeviceDataOneDay&pn=$devicePn&devcode=$deviceCode&sn=$deviceSn&devaddr=$deviceAddr&date=$yesterday&$SUFFIX_CONTEXT"
            val salt = generateHashedSalt()
            val signature = sha1(salt + secret + token + baseParams)

            val url = "${BASE_URL}?sign=$signature&salt=$salt&token=$token$baseParams"
            Log.d(TAG, "Fetching yesterday's data for grid on cache")

            val connection = URL(url).openConnection()
            connection.connectTimeout = 10000
            connection.readTimeout = 10000

            val response = connection.getInputStream().bufferedReader().readText()
            val json = JSONObject(response)

            if (json.optInt("err", -1) != 0) {
                return null
            }

            val dat = json.getJSONObject("dat")
            val rows = dat.getJSONArray("row")

            return findLastGridOnTimestamp(rows)
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching yesterday's data", e)
            return null
        }
    }

    private fun findLastGridOnTimestamp(rows: org.json.JSONArray): Long? {
        val timeFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)

        // Iterate backwards to find last grid on
        for (i in rows.length() - 1 downTo 0) {
            val row = rows.getJSONObject(i)
            val fields = row.getJSONArray("field")
            val gridVoltage = fields.getString(15).toDoubleOrNull() ?: 0.0

            if (gridVoltage > 0) {
                val timestamp = fields.getString(1)
                return try {
                    timeFormat.parse(timestamp)?.time
                } catch (e: Exception) {
                    null
                }
            }
        }
        return null
    }

    private fun updateNotification() {
        val title = if (gridOn) {
            "$batteryPercent% · Charging · $lastUpdateTime"
        } else {
            "$batteryPercent% · ${formatWatts(watts)} · $lastUpdateTime"
        }
        Log.i(TAG, "Updating notification: $title")

        val notification = buildNotification()
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun fetchBatteryData(): BatteryData? {
        if (token.isEmpty() || secret.isEmpty() || devicePn.isEmpty()) {
            Log.w(TAG, "Missing credentials")
            return null
        }

        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val baseParams = "&action=queryDeviceDataOneDay&pn=$devicePn&devcode=$deviceCode&sn=$deviceSn&devaddr=$deviceAddr&date=$today&$SUFFIX_CONTEXT"
        val salt = generateHashedSalt()
        val signature = sha1(salt + secret + token + baseParams)

        val url = "${BASE_URL}?sign=$signature&salt=$salt&token=$token$baseParams"
        Log.d(TAG, "Fetching from URL: $url")

        val connection = URL(url).openConnection()
        connection.connectTimeout = 10000
        connection.readTimeout = 10000

        val response = connection.getInputStream().bufferedReader().readText()
        val json = JSONObject(response)

        if (json.optInt("err", -1) != 0) {
            Log.e(TAG, "API error: ${json.optInt("err")}")
            return null
        }

        val dat = json.getJSONObject("dat")
        val rows = dat.getJSONArray("row")

        if (rows.length() == 0) {
            Log.w(TAG, "No data rows")
            return null
        }

        // Get the last row (most recent data)
        val lastRow = rows.getJSONObject(rows.length() - 1)
        val fields = lastRow.getJSONArray("field")

        // Parse relevant fields based on the TypeScript parseInverterData
        // field[15] = gridVoltage
        // field[21] = batteryCapacity
        // field[27] = acOutputActivePower
        // field[1] = timestamp

        val timestamp = fields.getString(1)
        val gridVoltage = fields.getString(15).toDoubleOrNull() ?: 0.0
        val batteryCapacity = fields.getString(21).toIntOrNull() ?: 0
        val acOutputActivePower = fields.getString(27).toIntOrNull() ?: 0

        val timeFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
        val displayFormat = SimpleDateFormat("h:mm a", Locale.US)
        val parsedTime = try {
            timeFormat.parse(timestamp)
        } catch (e: Exception) {
            Date()
        }
        val timeString = displayFormat.format(parsedTime ?: Date())

        // Find last grid on timestamp from today's data
        val lastGridOnTimestamp = findLastGridOnTimestamp(rows)

        return BatteryData(
            batteryPercent = batteryCapacity,
            watts = acOutputActivePower,
            gridOn = gridVoltage > 0,
            timeString = timeString,
            lastGridOnTimestamp = lastGridOnTimestamp
        )
    }

    private fun generateHashedSalt(): String {
        val dayOfMonth = java.util.Calendar.getInstance().get(java.util.Calendar.DAY_OF_MONTH)
        return sha1(dayOfMonth.toString()).substring(0, 10)
    }

    private fun sha1(input: String): String {
        val digest = MessageDigest.getInstance("SHA-1")
        val bytes = digest.digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    data class BatteryData(
        val batteryPercent: Int,
        val watts: Int,
        val gridOn: Boolean,
        val timeString: String,
        val lastGridOnTimestamp: Long?
    )
}
