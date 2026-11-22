package vn.siso.os

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.ActivityManager
import android.app.AlertDialog
import android.app.WallpaperColors
import android.app.WallpaperManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.ContentUris
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.location.Location
import android.location.LocationManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.database.ContentObserver
import android.media.AudioManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Bundle
import android.os.Handler
import android.os.StatFs
import android.os.SystemClock
import android.os.Looper
import android.os.Environment
import android.provider.CalendarContract
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.util.Base64
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.widget.EditText
import android.webkit.JavascriptInterface
import android.webkit.MimeTypeMap
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.FileProvider
import androidx.core.view.WindowInsetsControllerCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.concurrent.Executors
import kotlin.math.roundToInt

class MainActivity : Activity() {

    private lateinit var web: WebView
    private lateinit var drawer: AppDrawer
    private lateinit var widgets: WidgetPanel
    private lateinit var lset: LauncherSettings
    private lateinit var dock: Dock
    private lateinit var shade: NotificationShade
    private lateinit var pill: TextView
    private var pageReady = false
    @Volatile private var homeBlocked = false   // JS báo: đang có cửa sổ / bảng mở trên màn hình chính
    private var lastBat: Pair<Int, Boolean>? = null
    private var batTemp = Double.NaN   // °C, từ ACTION_BATTERY_CHANGED

    private val netExec = Executors.newSingleThreadExecutor()

    private val prefs by lazy { getSharedPreferences("siso", MODE_PRIVATE) }
    private val root: File get() = Environment.getExternalStorageDirectory()

    private val pkgReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, i: Intent?) {
            drawer.refresh(); dock.refresh()
            if (pageReady) reloadLists()
        }
    }

    private val wifiReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, i: Intent?) = pushNet()
    }

    private val netCb = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) = pushNet()
        override fun onLost(network: Network) = pushNet()
        override fun onCapabilitiesChanged(network: Network, c: NetworkCapabilities) = pushNet()
    }

    private val volObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
        override fun onChange(selfChange: Boolean) = pushVol()
    }

    private val batReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, i: Intent?) = pushBattery(i)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Glass.load(prefs)

        // bản 3.11: bỏ dock ở đáy, chỉ cần vuốt lên để mở ngăn ứng dụng (một lần duy nhất)
        if (!prefs.getBoolean("dock_off_v1", false)) prefs.edit().putBoolean("dock_show", false).putBoolean("dock_off_v1", true).apply()
        val frame = PullFrame(this)
        web = WebView(this)
        frame.addView(web, FrameLayout.LayoutParams(-1, -1))
        // dock ở đáy màn hình chính (thêm trước ngăn app/widget để các bảng phủ lên trên nó)
        dock = Dock(this, frame, { appMenu(it) }, { vitalsLine() }) { h ->
            (web.layoutParams as FrameLayout.LayoutParams).also { it.bottomMargin = h }
            web.requestLayout()
        }
        dock.onPinsChanged = { web.evaluateJavascript("window.__pins&&__pins()", null) }
        drawer = AppDrawer(this, frame) { appMenu(it) }
        widgets = WidgetPanel(this, frame)
        lset = LauncherSettings(this, frame, object : LauncherSettings.Actions {
            override fun sysWallOn() = sysWall()
            override fun setSysWall(on: Boolean) { prefs.edit().putBoolean("sysWall", on).apply(); applyWallpaperMode() }
            override fun pickWallpaper() {
                try { startActivity(Intent.createChooser(Intent(Intent.ACTION_SET_WALLPAPER), "Chọn hình nền")) }
                catch (_: Exception) { Toast.makeText(this@MainActivity, "Máy không có bộ chọn hình nền.", Toast.LENGTH_SHORT).show() }
            }
            override fun openWidgets() = widgets.show()
            override fun applyDrawer() { drawer.applySettings(); dock.refresh(); if (pageReady) reloadLists() }
            override fun applyFeed() { web.evaluateJavascript("window.__feedApply&&__feedApply()", null) }
            override fun layGet(cb: (JSONObject) -> Unit) {
                web.evaluateJavascript("window.__layGet?__layGet():'{}'") { r ->
                    val o = try { JSONObject(org.json.JSONTokener(r).nextValue() as? String ?: "{}") } catch (_: Exception) { JSONObject() }
                    cb(o)
                }
            }
            override fun laySet(o: JSONObject) {
                web.evaluateJavascript("window.__laySet&&__laySet(" + JSONObject.quote(o.toString()) + ")", null)
            }
            override fun applyTheme() {
                Glass.load(prefs)
                drawer.applyTheme(); shade.applyTheme(); widgets.applyTheme(); dock.applyTheme()
                pushBg()
            }
            override fun fxGet(cb: (JSONObject) -> Unit) {
                web.evaluateJavascript("window.__fxGet?__fxGet():'{}'") { r ->
                    val o = try { JSONObject(org.json.JSONTokener(r).nextValue() as? String ?: "{}") } catch (_: Exception) { JSONObject() }
                    cb(o)
                }
            }
            override fun fxSet(o: JSONObject) {
                web.evaluateJavascript("window.__fxSet&&__fxSet(" + JSONObject.quote(o.toString()) + ")", null)
            }
            override fun drawerCols() = drawer.columns()
            override fun setDrawerCols(n: Int) = drawer.setColumns(n)
            override fun drawerRecent() = drawer.recentShown()
            override fun setDrawerRecent(on: Boolean) = drawer.setRecentShown(on)
        })

        // nút nhỏ ở mép trên: chạm để mở thông báo, hiện số thông báo đang có
        pill = TextView(this).apply {
            setTextColor(Color.WHITE); textSize = 10f; gravity = Gravity.CENTER
            minWidth = dp(40)
            setPadding(dp(8), 0, dp(8), 0)
            background = GradientDrawable().apply {
                cornerRadius = dp(8).toFloat()
                setColor(Color.parseColor("#59000000"))
                setStroke(dp(1), Color.parseColor("#59FFFFFF"))
            }
            setOnClickListener { shade.open() }
        }
        frame.addView(pill, FrameLayout.LayoutParams(-2, dp(14), Gravity.TOP or Gravity.CENTER_HORIZONTAL).apply {
            topMargin = dp(2)
        })

        shade = NotificationShade(
            this, frame,
            onQuick = {
                shade.close()
                web.evaluateJavascript("window.openQp&&openQp('quick')", null)
            },
            onCount = { n -> pill.text = if (n > 0) n.toString() else "" }
        )
        frame.listener = object : PullFrame.Listener {
            override fun canPush() = shade.canPushClose()
            override fun onPushStart() = shade.beginPush()
            override fun onPush(dy: Float) = shade.push(dy)
            override fun onPushEnd(dy: Float, vy: Float) = shade.endPush(dy, vy)
            override fun canPull() = prefs.getBoolean("g_pull", true) && !homeBlocked && !shade.isShown && !drawer.isShown && !widgets.isShown && !lset.isShown
            override fun onPullStart() = shade.beginPull()
            override fun onPull(dy: Float) = shade.pull(dy)
            override fun onPullEnd(dy: Float, vy: Float) = shade.endPull(dy, vy)
        }
        frame.slide = object : PullFrame.SlideListener {
            override fun canOpen() = prefs.getBoolean("g_slide", true) && !homeBlocked && !shade.isShown && !drawer.isShown && !widgets.isShown && !lset.isShown
            override fun canClose(x: Float) = drawer.isShown && (drawer.isHalf || drawer.atTop()) && x < frame.width - 40 * resources.displayMetrics.density
            override fun canExpand() = drawer.isHalf
            override fun startTy() = drawer.currentTy()
            override fun onSlideStart(opening: Boolean) = drawer.slideBegin()
            override fun onSlide(ty: Float) = drawer.slideTo(ty)
            override fun onSlideEnd(opening: Boolean, ty: Float, vy: Float) {
                drawer.slideEnd(ty, vy)
            }
        }
        setContentView(frame)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
        }
        applyWallpaperMode()
        web.webChromeClient = WebChromeClient()
        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                val js = assets.open("android-bridge.js").bufferedReader().use { it.readText() }
                view.evaluateJavascript(js) {
                    pageReady = true
                    pushBg()
                    lastBat?.let { sendBattery(it) }
                    pushBadges()
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val u = request.url
                if (u.scheme == "file") return u.path == "/" || u.path.isNullOrEmpty()
                startActivity(Intent(Intent.ACTION_VIEW, u))
                return true
            }
        }
        web.addJavascriptInterface(Bridge(), "SisoAndroid")
        web.loadUrl("file:///android_asset/siso-os.html")
    }

    // ---------- vòng đời ----------
    override fun onStart() {
        super.onStart()
        widgets.startListening()
        pushBattery(registerReceiver(batReceiver, IntentFilter(Intent.ACTION_BATTERY_CHANGED)))
        registerReceiver(wifiReceiver, IntentFilter(WifiManager.WIFI_STATE_CHANGED_ACTION))
        registerReceiver(pkgReceiver, IntentFilter().apply {
            addAction(Intent.ACTION_PACKAGE_ADDED); addAction(Intent.ACTION_PACKAGE_REMOVED)
            addAction(Intent.ACTION_PACKAGE_REPLACED); addDataScheme("package")
        })
        try { getSystemService(ConnectivityManager::class.java).registerDefaultNetworkCallback(netCb) } catch (_: Exception) {}
        contentResolver.registerContentObserver(Settings.System.CONTENT_URI, true, volObserver)
        pushNet(); pushVol()
        dock.refresh()
        SisoNotificationService.onChange = { shade.refresh(); pushBadges() }
        ensureNotificationListener()
        shade.refresh()
        pushBadges()
    }

    override fun onStop() {
        SisoNotificationService.onChange = null
        widgets.stopListening()
        try { unregisterReceiver(batReceiver) } catch (_: Exception) {}
        try { unregisterReceiver(wifiReceiver) } catch (_: Exception) {}
        try { unregisterReceiver(pkgReceiver) } catch (_: Exception) {}
        try { getSystemService(ConnectivityManager::class.java).unregisterNetworkCallback(netCb) } catch (_: Exception) {}
        contentResolver.unregisterContentObserver(volObserver)
        super.onStop()
    }

    override fun onResume() {
        super.onResume(); web.onResume()
        applyWallpaperMode()
        ensureNotificationListener()
        shade.refresh()
        // quay lại từ màn hình cấp quyền -> vẽ lại cửa sổ Tệp
        if (pageReady) web.evaluateJavascript("window.__fsRefresh&&__fsRefresh()", null)
    }

    override fun onPause() { web.onPause(); super.onPause() }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.hasCategory(Intent.CATEGORY_HOME)) {
            drawer.hide(); widgets.hide(); shade.hide()
            if (pageReady) web.evaluateJavascript("window.__home&&__home()", null)
        }
    }

    @Deprecated("Launcher không thoát khi bấm Back")
    override fun onBackPressed() {
        when {
            shade.isShown -> shade.close()
            dock.isExpanded -> dock.collapse()
            lset.isShown -> lset.hide()
            drawer.isShown -> drawer.hide()
            widgets.isShown -> widgets.hide()
            else -> web.evaluateJavascript(
                "window.__closeFo&&__closeFo();var s=document.getElementById(\"start\");s&&s.classList.remove(\"open\")", null
            )
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        widgets.onResult(requestCode, resultCode, data)
        drawer.onResult(requestCode, resultCode, data)
        lset.onResult(requestCode, resultCode, data)
    }

    override fun onRequestPermissionsResult(code: Int, p: Array<out String>, r: IntArray) {
        super.onRequestPermissionsResult(code, p, r)
        if (pageReady) web.evaluateJavascript("window.__fsRefresh&&__fsRefresh()", null)
        if (code == 202) refreshWeather()
        if (code == AppDrawer.REQ_CONTACTS) drawer.onPermissionResult()
        if (code == 204 && pageReady) web.evaluateJavascript("window.__feedRefresh&&__feedRefresh()", null)
    }

    // ---------- hình nền hệ thống, thông báo ----------
    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun sysWall() = prefs.getBoolean("sysWall", true)

    /** Bật/tắt chế độ trong suốt để lộ hình nền Android phía sau WebView. */
    /** Đẩy màu nền bảng đã chọn sang giao diện web (trang Hôm nay, các bảng kính). */
    private fun pushBg() {
        if (!pageReady) return
        val custom = prefs.contains("bg_rgb") || prefs.contains("bg_alpha")
        val js = if (custom)
            "window.__bgSet&&__bgSet('${Color.red(Glass.rgb)},${Color.green(Glass.rgb)},${Color.blue(Glass.rgb)}',${if (Glass.alphaPct >= 0) Glass.alphaPct else 58})"
        else "window.__bgSet&&__bgSet('',0)"
        web.evaluateJavascript(js, null)
    }

    private fun applyWallpaperMode() {
        val sys = sysWall()
        val base = 0xFF0B1424.toInt()
        window.setBackgroundDrawable(ColorDrawable(if (sys) Color.TRANSPARENT else base))
        web.setBackgroundColor(if (sys) Color.TRANSPARENT else base)
        var light = false
        if (sys && Build.VERSION.SDK_INT >= 31) {
            try {
                val c = WallpaperManager.getInstance(this).getWallpaperColors(WallpaperManager.FLAG_SYSTEM)
                light = c != null && (c.colorHints and WallpaperColors.HINT_SUPPORTS_DARK_TEXT) != 0
            } catch (_: Throwable) {}
        }
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = light
            isAppearanceLightNavigationBars = light
        }
    }

    private fun ensureNotificationListener() {
        if (SisoNotificationService.instance == null &&
            NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName)
        ) {
            try {
                NotificationListenerService.requestRebind(ComponentName(this, SisoNotificationService::class.java))
            } catch (_: Exception) {}
        }
    }

    // ---------- chấm số thông báo trên biểu tượng ----------
    private fun pushBadges() {
        if (!::web.isInitialized) return
        val m = SisoNotificationService.counts(packageName)
        drawer.setBadges(m)
        if (!pageReady) return
        val js = "window.__badges&&__badges(" + JSONObject(m).toString() + ")"
        runOnUiThread { web.evaluateJavascript(js, null) }
    }

    // ---------- Wi-Fi & âm lượng ----------
    private fun pushNet() {
        if (!::web.isInitialized) return
        val cm = getSystemService(ConnectivityManager::class.java)
        val wm = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val on = try { wm.isWifiEnabled } catch (_: Exception) { false }
        val caps = try { cm.getNetworkCapabilities(cm.activeNetwork) } catch (_: Exception) { null }
        val wifi = caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
        val cell = caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true
        val online = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        var ssid = ""
        if (wifi) try {
            @Suppress("DEPRECATION")
            ssid = wm.connectionInfo.ssid.trim('"')
            if (ssid == "<unknown ssid>") ssid = ""
        } catch (_: Exception) {}
        val js = "window.__net&&__net($on,$wifi,$cell,$online,${JSONObject.quote(ssid)})"
        runOnUiThread { web.evaluateJavascript(js, null) }
    }

    private fun pushVol() {
        if (!::web.isInitialized) return
        val am = getSystemService(AudioManager::class.java)
        val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC).coerceAtLeast(1)
        val pct = (am.getStreamVolume(AudioManager.STREAM_MUSIC) * 100f / max).roundToInt()
        val mute = am.isStreamMute(AudioManager.STREAM_MUSIC)
        runOnUiThread { web.evaluateJavascript("window.__vol&&__vol($pct,$mute)", null) }
    }

    // ---------- thời tiết (Open-Meteo) ----------
    private fun refreshWeather() {
        if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION), 202
            ); return
        }
        val lm = getSystemService(LocationManager::class.java)
        var loc: Location? = null
        for (p in listOf(LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER)) {
            try {
                val l = lm.getLastKnownLocation(p)
                if (l != null && (loc == null || l.time > loc.time)) loc = l
            } catch (_: Exception) {}
        }
        if (loc != null) { fetchWeather(loc.latitude, loc.longitude); return }
        if (Build.VERSION.SDK_INT >= 30) {
            try {
                lm.getCurrentLocation(LocationManager.NETWORK_PROVIDER, null, mainExecutor) { l ->
                    if (l != null) fetchWeather(l.latitude, l.longitude)
                }
            } catch (_: Exception) {}
        }
    }

    private fun fetchWeather(lat: Double, lon: Double) = netExec.execute {
        try {
            val url = URL(
                String.format(
                    Locale.US,
                    "https://api.open-meteo.com/v1/forecast?latitude=%.2f&longitude=%.2f&current=temperature_2m,weather_code&timezone=auto",
                    lat, lon
                )
            )
            val c = url.openConnection() as HttpURLConnection
            c.connectTimeout = 8000; c.readTimeout = 8000
            val cur = JSONObject(c.inputStream.bufferedReader().use { it.readText() }).getJSONObject("current")
            val t = cur.getDouble("temperature_2m").roundToInt()
            val code = cur.getInt("weather_code")
            runOnUiThread { web.evaluateJavascript("window.__weather&&__weather($t,$code)", null) }
        } catch (_: Exception) { /* giữ số liệu cũ */ }
    }

    // ---------- pin ----------
    private fun pushBattery(i: Intent?) {
        i ?: return
        val level = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = i.getIntExtra(BatteryManager.EXTRA_SCALE, 100)
        val st = i.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
        if (level < 0 || scale <= 0) return
        val charging = st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL
        lastBat = Pair(level * 100 / scale, charging)
        i.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE).takeIf { it != Int.MIN_VALUE }?.let { batTemp = it / 10.0 }
        if (pageReady) sendBattery(lastBat!!)
    }

    private fun sendBattery(b: Pair<Int, Boolean>) =
        web.evaluateJavascript("window.__bat&&__bat(${b.first},${b.second})", null)

    // ---------- app ghim ở thanh tác vụ ("pins") và app trên màn hình chính ("home") ----------
    private fun list(key: String): MutableList<String> =
        (prefs.getString(key, "") ?: "").split("\n").filter { it.isNotBlank() }.toMutableList()

    private fun saveList(key: String, l: List<String>) = prefs.edit().putString(key, l.joinToString("\n")).apply()

    private fun toggle(key: String, id: String) {
        val l = list(key)
        if (!l.remove(id)) l.add(id)
        saveList(key, l)
        reloadLists()
    }

    private fun reloadLists() {
        web.evaluateJavascript("window.__pins&&__pins();window.__homeApps&&__homeApps()", null)
        if (::dock.isInitialized) dock.refresh()
    }

    private fun appsJson(key: String): String {
        val arr = JSONArray()
        val keep = mutableListOf<String>()
        for (id in list(key)) {
            val cn = ComponentName.unflattenFromString(id) ?: continue
            try {
                val label = packageManager.getActivityInfo(cn, 0).loadLabel(packageManager).toString()
                arr.put(JSONObject().put("id", id).put("label", label).put("icon", iconB64(cn)))
                keep.add(id)
            } catch (_: Exception) { /* đã gỡ cài đặt */ }
        }
        if (keep.size != list(key).size) saveList(key, keep)
        return arr.toString()
    }

    /** App mặc định (cài sẵn theo máy) và chính launcher thì không cho gỡ. */
    private fun canUninstall(pkg: String): Boolean {
        if (pkg == packageName) return false
        return try {
            (packageManager.getApplicationInfo(pkg, 0).flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) == 0
        } catch (_: Exception) { false }
    }

    private fun appMenu(item: AppItem) {
        val id = item.component.flattenToString()
        val pkg = item.component.packageName
        val inDock = list("pins").contains(id)
        val onHome = list("home").contains(id)
        val names = mutableListOf(
            if (onHome) "Bỏ khỏi màn hình chính" else "Thêm vào màn hình chính",
            if (inDock) "Bỏ ghim khỏi thanh tác vụ" else "Ghim vào thanh tác vụ",
            "Thông tin ứng dụng"
        )
        if (canUninstall(pkg)) names.add("Gỡ cài đặt")
        AlertDialog.Builder(this)
            .setTitle(item.label)
            .setItems(names.toTypedArray()) { _, w ->
                when (w) {
                    0 -> toggle("home", id)
                    1 -> toggle("pins", id)
                    2 -> startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$pkg")))
                    3 -> startActivity(Intent(Intent.ACTION_DELETE, Uri.parse("package:$pkg")))
                }
            }.show()
    }

    private fun iconB64(cn: ComponentName): String {
        val d = packageManager.getActivityIcon(cn)
        val bmp = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888)
        d.setBounds(0, 0, 96, 96); d.draw(Canvas(bmp))
        val out = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    // ---------- tệp ----------
    private fun resolve(rel: String): File? {
        val f = File(root, rel).canonicalFile
        val r = root.canonicalFile
        return if (f == r || f.path.startsWith(r.path + File.separator)) f else null
    }

    private fun hasStorage() =
        if (Build.VERSION.SDK_INT >= 30) Environment.isExternalStorageManager()
        else checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED

    private fun renameFolder(id: String, current: String) {
        val et = EditText(this).apply { setText(current); setSelection(current.length); isSingleLine = true }
        AlertDialog.Builder(this)
            .setTitle("Tên thư mục")
            .setView(et)
            .setPositiveButton("Lưu") { _, _ ->
                val n = et.text.toString().trim().take(24).ifEmpty { "Thư mục" }
                web.evaluateJavascript("window.__folderName&&__folderName(${JSONObject.quote(id)},${JSONObject.quote(n)})", null)
            }
            .setNegativeButton("Hủy", null).show()
    }

    // ---------- cầu nối JS ----------
    /** Nhiệt độ CPU/SoC (°C) từ thermal_zone nếu máy cho đọc; NaN nếu không. */
    private fun cpuTemp(): Double {
        try {
            val zones = File("/sys/class/thermal").listFiles { f -> f.name.startsWith("thermal_zone") } ?: return Double.NaN
            var best = Double.NaN
            for (z in zones) {
                val type = try { File(z, "type").readText().trim().lowercase() } catch (_: Exception) { continue }
                if (!(type.contains("cpu") || type.contains("soc") || type.contains("tsens") || type.contains("big") || type.contains("little"))) continue
                var v = try { File(z, "temp").readText().trim().toDouble() } catch (_: Exception) { continue }
                if (v > 1000) v /= 1000.0
                if (v in 5.0..120.0 && (best.isNaN() || v > best)) best = v
            }
            return best
        } catch (_: Exception) { return Double.NaN }
    }


    private var usageTotal = 0L
    private var usageAt = 0L

    /** Dòng thông số hiện trên dock: RAM · bộ nhớ · nhiệt độ · thời gian dùng. */
    private fun vitalsLine(): String {
        val mi = ActivityManager.MemoryInfo()
        getSystemService(ActivityManager::class.java).getMemoryInfo(mi)
        val sf = StatFs(Environment.getDataDirectory().path)
        val parts = ArrayList<String>()
        parts.add("RAM " + ((mi.totalMem - mi.availMem) * 100 / maxOf(1L, mi.totalMem)) + "%")
        parts.add("Bộ nhớ " + ((sf.totalBytes - sf.availableBytes) * 100 / maxOf(1L, sf.totalBytes)) + "%")
        val t = cpuTemp().takeIf { !it.isNaN() } ?: batTemp.takeIf { !it.isNaN() }
        if (t != null) parts.add("${t.roundToInt()}°C")
        if (System.currentTimeMillis() - usageAt > 60_000) {
            usageAt = System.currentTimeMillis()
            usageTotal = Recents.usageToday(this)?.sumOf { it.second } ?: -1L
        }
        if (usageTotal >= 0) { val m = usageTotal / 60000; parts.add("Dùng " + (if (m >= 60) "${m / 60}h${m % 60}p" else "${m}p")) }
        return parts.joinToString(" · ")
    }

    inner class Bridge {
        @JavascriptInterface fun syncSystem() { pushNet(); pushVol() }

        @JavascriptInterface fun setVolume(pct: Int) = runOnUiThread {
            val am = getSystemService(AudioManager::class.java)
            val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            am.setStreamVolume(AudioManager.STREAM_MUSIC, (pct.coerceIn(0, 100) * max / 100f).roundToInt(), 0)
            if (pct > 0 && am.isStreamMute(AudioManager.STREAM_MUSIC))
                am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_UNMUTE, 0)
        }

        @JavascriptInterface fun setMute(mute: Boolean) = runOnUiThread {
            getSystemService(AudioManager::class.java).adjustStreamVolume(
                AudioManager.STREAM_MUSIC,
                if (mute) AudioManager.ADJUST_MUTE else AudioManager.ADJUST_UNMUTE, 0
            )
        }

        @JavascriptInterface fun openWifiPanel() = runOnUiThread {
            startActivity(
                if (Build.VERSION.SDK_INT >= 29) Intent(Settings.Panel.ACTION_INTERNET_CONNECTIVITY)
                else Intent(Settings.ACTION_WIFI_SETTINGS)
            )
        }

        @JavascriptInterface fun refreshWeather() = runOnUiThread { this@MainActivity.refreshWeather() }
        @JavascriptInterface fun openDrawer() = runOnUiThread { drawer.show() }
        @JavascriptInterface fun setHomeBlocked(b: Boolean) { homeBlocked = b }
        @JavascriptInterface fun openWidgets() = runOnUiThread { widgets.show() }
        @JavascriptInterface fun getFlag(key: String, def: Boolean): Boolean = prefs.getBoolean(key, def)
        @JavascriptInterface fun getFeedHidden(): String = prefs.getString("feed_hidden", "") ?: ""
        @JavascriptInterface fun openLauncherSettings() = runOnUiThread { lset.show() }
        @JavascriptInterface fun openShade() = runOnUiThread { shade.open() }

        @JavascriptInterface fun getSysWall(): Boolean = sysWall()

        @JavascriptInterface fun setSysWall(on: Boolean) = runOnUiThread {
            prefs.edit().putBoolean("sysWall", on).apply()
            applyWallpaperMode()
        }

        @JavascriptInterface fun pickSystemWallpaper() = runOnUiThread {
            try {
                startActivity(Intent.createChooser(Intent(Intent.ACTION_SET_WALLPAPER), "Chọn hình nền"))
            } catch (_: Exception) {
                Toast.makeText(this@MainActivity, "Máy không có bộ chọn hình nền.", Toast.LENGTH_SHORT).show()
            }
        }
        @JavascriptInterface fun openSettings() = runOnUiThread {
            startActivity(Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
        @JavascriptInterface fun openUrl(url: String) = runOnUiThread {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }

        // app ghim / màn hình chính
        @JavascriptInterface fun getPinned(): String = appsJson("pins")
        @JavascriptInterface fun getHome(): String = appsJson("home")

        @JavascriptInterface fun launch(id: String) = runOnUiThread {
            val cn = ComponentName.unflattenFromString(id) ?: return@runOnUiThread
            Recents.record(this@MainActivity, id)
            try {
                startActivity(
                    Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setComponent(cn)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
                )
            } catch (_: Exception) {
                Toast.makeText(this@MainActivity, "Không mở được ứng dụng.", Toast.LENGTH_SHORT).show()
            }
        }

        // bố cục màn hình chính (thư mục, thứ tự) do phần giao diện quản lý
        @JavascriptInterface fun getLayout(): String = prefs.getString("layout", "[]") ?: "[]"
        @JavascriptInterface fun saveLayout(json: String) { prefs.edit().putString("layout", json).apply() }

        @JavascriptInterface fun haptic() = runOnUiThread {
            web.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
        }

        // app web cài sẵn
        @JavascriptInterface fun openWeb(key: String) = runOnUiThread {
            if (key == "store") {
                Recents.record(this@MainActivity, ComponentName(this@MainActivity, StoreActivity::class.java).flattenToString())
                startActivity(Intent(this@MainActivity, StoreActivity::class.java))
            }
        }

        // ---------- trang "Hôm nay": lịch, nhiệm vụ, ghi chú, app hay dùng ----------
        private val DATA_KEYS = setOf("tasks", "notes", "habits", "cds", "water", "shop", "fx", "pgfx")

        @JavascriptInterface fun getData(key: String): String =
            if (key in DATA_KEYS) prefs.getString("d_$key", "[]") ?: "[]" else "[]"

        @JavascriptInterface fun setData(key: String, json: String) {
            if (key in DATA_KEYS) prefs.edit().putString("d_$key", json).apply()
        }

        @JavascriptInterface fun hasCalendar(): Boolean =
            checkSelfPermission(Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED

        @JavascriptInterface fun requestCalendar() = runOnUiThread {
            requestPermissions(arrayOf(Manifest.permission.READ_CALENDAR), 204)
        }

        @JavascriptInterface fun getEvents(): String {
            val arr = JSONArray()
            if (!hasCalendar()) return arr.toString()
            try {
                val now = System.currentTimeMillis()
                val b = CalendarContract.Instances.CONTENT_URI.buildUpon()
                ContentUris.appendId(b, now - 3600_000L); ContentUris.appendId(b, now + 7L * 86400_000)
                contentResolver.query(
                    b.build(),
                    arrayOf(
                        CalendarContract.Instances.TITLE, CalendarContract.Instances.BEGIN,
                        CalendarContract.Instances.END, CalendarContract.Instances.ALL_DAY,
                        CalendarContract.Instances.EVENT_LOCATION
                    ), null, null, CalendarContract.Instances.BEGIN + " ASC"
                )?.use { c ->
                    while (c.moveToNext() && arr.length() < 8) {
                        arr.put(
                            JSONObject().put("t", c.getString(0) ?: "(Không có tiêu đề)").put("b", c.getLong(1))
                                .put("e", c.getLong(2)).put("ad", c.getInt(3) == 1).put("loc", c.getString(4) ?: "")
                        )
                    }
                }
            } catch (_: Exception) {}
            return arr.toString()
        }

        @JavascriptInterface fun openCalendar() = runOnUiThread {
            try {
                startActivity(
                    Intent(Intent.ACTION_VIEW, Uri.parse("content://com.android.calendar/time/${System.currentTimeMillis()}"))
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            } catch (_: Exception) {
                Toast.makeText(this@MainActivity, "Máy không có ứng dụng Lịch.", Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface fun getFrequent(): String {
            val arr = JSONArray()
            val seen = HashSet<String>()
            for (k in Recents.frequent(this@MainActivity)) {
                if (arr.length() >= 8) break
                val cn = (if (k.contains('/')) ComponentName.unflattenFromString(k)
                          else packageManager.getLaunchIntentForPackage(k)?.component) ?: continue
                if (cn.packageName == packageName && cn.className != StoreActivity::class.java.name) continue
                val id = cn.flattenToString()
                if (!seen.add(id)) continue
                try {
                    val label = packageManager.getActivityInfo(cn, 0).loadLabel(packageManager).toString()
                    arr.put(JSONObject().put("id", id).put("label", label).put("icon", iconB64(cn)))
                } catch (_: Exception) {}
            }
            return arr.toString()
        }

        @JavascriptInterface fun openRecents() = runOnUiThread { drawer.show() }

        @JavascriptInterface fun folderMenu(id: String, name: String) = runOnUiThread {
            AlertDialog.Builder(this@MainActivity)
                .setTitle(name)
                .setItems(arrayOf("Đổi tên", "Giải tán thư mục")) { _, w ->
                    if (w == 0) renameFolder(id, name)
                    else web.evaluateJavascript("window.__folderAct&&__folderAct(${JSONObject.quote(id)},\"dissolve\")", null)
                }.show()
        }

        @JavascriptInterface fun renameFolder(id: String, name: String) = runOnUiThread { this@MainActivity.renameFolder(id, name) }

        @JavascriptInterface fun askUnpin(id: String) = runOnUiThread {
            AlertDialog.Builder(this@MainActivity)
                .setTitle("Bỏ ghim khỏi thanh tác vụ?")
                .setPositiveButton("Bỏ ghim") { _, _ -> toggle("pins", id) }
                .setNegativeButton("Hủy", null).show()
        }

        @JavascriptInterface fun askHomeRemove(id: String) = runOnUiThread {
            val pkg = ComponentName.unflattenFromString(id)?.packageName ?: return@runOnUiThread
            val names = mutableListOf("Bỏ khỏi màn hình chính", "Thông tin ứng dụng")
            if (canUninstall(pkg)) names.add("Gỡ cài đặt")
            AlertDialog.Builder(this@MainActivity)
                .setItems(names.toTypedArray()) { _, w ->
                    when (w) {
                        0 -> toggle("home", id)
                        1 -> startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$pkg")))
                        2 -> startActivity(Intent(Intent.ACTION_DELETE, Uri.parse("package:$pkg")))
                    }
                }.show()
        }

        @JavascriptInterface fun openBluetoothSettings() = runOnUiThread {
            startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS))
        }

        /** Số liệu nhẹ để cập nhật liên tục trên thanh tác vụ. */
        /** Thời gian dùng máy hôm nay + top app. access=false nếu chưa cấp quyền. */
        @JavascriptInterface fun getUsage(): String {
            val u = Recents.usageToday(this@MainActivity)
                ?: return JSONObject().put("access", false).toString()
            val pm = packageManager
            val apps = JSONArray()
            for ((pkg, ms) in u.take(6)) {
                val label = try { pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString() } catch (_: Exception) { continue }
                apps.put(JSONObject().put("label", label).put("ms", ms))
            }
            return JSONObject().put("access", true).put("total", u.sumOf { it.second }).put("apps", apps).toString()
        }

        @JavascriptInterface fun requestUsage() = runOnUiThread { Recents.openUsageSettings(this@MainActivity) }

        @JavascriptInterface fun getVitals(): String {
            val mi = ActivityManager.MemoryInfo()
            getSystemService(ActivityManager::class.java).getMemoryInfo(mi)
            val sf = StatFs(Environment.getDataDirectory().path)
            val o = JSONObject()
                .put("ramTotal", mi.totalMem).put("ramFree", mi.availMem)
                .put("stTotal", sf.totalBytes).put("stFree", sf.availableBytes)
            if (!batTemp.isNaN()) o.put("batTemp", batTemp)
            val c = cpuTemp(); if (!c.isNaN()) o.put("cpuTemp", c)
            return o.toString()
        }

        @JavascriptInterface fun getDeviceInfo(): String {
            val mi = ActivityManager.MemoryInfo()
            getSystemService(ActivityManager::class.java).getMemoryInfo(mi)
            val sf = StatFs(Environment.getDataDirectory().path)
            val dm = resources.displayMetrics
            val cpu = (if (Build.VERSION.SDK_INT >= 31) Build.SOC_MODEL else "").ifBlank { Build.HARDWARE }
            return JSONObject()
                .put("model", "${Build.MANUFACTURER} ${Build.MODEL}")
                .put("android", "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
                .put("cpu", cpu)
                .put("screen", "${dm.widthPixels}×${dm.heightPixels} · ${dm.densityDpi} dpi")
                .put("ramTotal", mi.totalMem).put("ramFree", mi.availMem)
                .put("stTotal", sf.totalBytes).put("stFree", sf.availableBytes)
                .put("uptime", SystemClock.elapsedRealtime())
                .put("bat", lastBat?.first ?: -1)
                .also { o ->
                    if (!batTemp.isNaN()) o.put("batTemp", batTemp)
                    val c = cpuTemp(); if (!c.isNaN()) o.put("cpuTemp", c)
                }
                .toString()
        }

        // tệp
        @JavascriptInterface fun hasStorage(): Boolean = this@MainActivity.hasStorage()

        @JavascriptInterface fun requestStorage() = runOnUiThread {
            if (Build.VERSION.SDK_INT >= 30) {
                startActivity(
                    Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:$packageName"))
                )
            } else {
                requestPermissions(
                    arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE), 201
                )
            }
        }

        @JavascriptInterface fun listDir(rel: String): String {
            val f = resolve(rel) ?: return "{}"
            val arr = JSONArray()
            (f.listFiles() ?: emptyArray())
                .filter { !it.name.startsWith(".") }
                .sortedWith(compareBy({ !it.isDirectory }, { it.name.lowercase() }))
                .forEach {
                    arr.put(
                        JSONObject().put("n", it.name).put("d", it.isDirectory)
                            .put("s", if (it.isFile) it.length() else 0L).put("m", it.lastModified())
                    )
                }
            return JSONObject().put("items", arr).put("free", root.freeSpace).put("total", root.totalSpace).toString()
        }

        @JavascriptInterface fun readText(rel: String): String {
            val f = resolve(rel) ?: return ""
            if (!f.isFile) return ""
            return try {
                f.inputStream().use { s ->
                    val buf = ByteArray(100_000)
                    val n = s.read(buf)
                    if (n <= 0) "" else String(buf, 0, n, Charsets.UTF_8)
                }
            } catch (_: Exception) { "" }
        }

        @JavascriptInterface fun openFile(rel: String) = runOnUiThread {
            val f = resolve(rel) ?: return@runOnUiThread
            try {
                val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.files", f)
                val mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(f.extension.lowercase()) ?: "*/*"
                startActivity(
                    Intent(Intent.ACTION_VIEW).setDataAndType(uri, mime)
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            } catch (_: Exception) {
                Toast.makeText(this@MainActivity, "Không có ứng dụng nào mở được tệp này.", Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface fun deleteFile(rel: String): Boolean {
            val f = resolve(rel) ?: return false
            return f != root.canonicalFile && f.delete()
        }
    }
}
