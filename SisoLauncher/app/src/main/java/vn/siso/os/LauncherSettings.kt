package vn.siso.os

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.text.Editable
import android.text.TextWatcher
import android.view.Gravity
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/**
 * Màn hình "Cài đặt trình khởi chạy": thanh tìm kiếm ở trên, danh sách mục có biểu tượng màu, tiêu đề và mô tả.
 * Mở bằng nút ⚙ trên thanh tác vụ.
 */
class LauncherSettings(
    private val act: Activity,
    parent: FrameLayout,
    private val actions: Actions
) {
    interface Actions {
        fun sysWallOn(): Boolean
        fun setSysWall(on: Boolean)
        fun pickWallpaper()
        fun openWidgets()
        fun applyDrawer()
        fun applyFeed()
        fun drawerCols(): Int
        fun setDrawerCols(n: Int)
        fun drawerRecent(): Boolean
        fun setDrawerRecent(on: Boolean)
        fun layGet(cb: (org.json.JSONObject) -> Unit)
        fun laySet(o: org.json.JSONObject)
        fun applyTheme()
        fun fxGet(cb: (org.json.JSONObject) -> Unit)
        fun fxSet(o: org.json.JSONObject)
    }

    private class Entry(val glyph: String, val color: String, val title: String, val sub: String, val run: () -> Unit) {
        val key = Search.norm("$title $sub")
    }

    companion object {
        const val REQ_IMPORT = 301
        /** Các khóa cài đặt do màn hình này quản lý (dùng cho "Đặt lại cài đặt"). */
        private val SETTING_KEYS = listOf(
            "sysWall", "drawer_cols", "drawer_recent",
            "dock_show", "dock_max", "dock_labels", "dock_default",
            "g_pull", "g_slide", "g_dock", "g_feed",
            "s_contacts", "s_files", "s_voice", "feed_hidden",
            "bg_rgb", "bg_alpha", "bg_blur", "fx_speed", "fx_motion"
        )
        private val FEED_CARDS = listOf("Lịch", "Nhiệm vụ", "Ghi chú", "Thời tiết", "Thói quen", "Uống nước", "Đếm ngược", "Danh sách mua sắm", "Ứng dụng thường xuyên sử dụng")
    }

    private val prefs = act.getSharedPreferences("siso", Context.MODE_PRIVATE)
    private fun flag(k: String, d: Boolean = true) = prefs.getBoolean(k, d)
    private fun flip(k: String, d: Boolean = true) = prefs.edit().putBoolean(k, !flag(k, d)).apply()
    private fun chk(label: String, on: Boolean) = (if (on) "✓ " else "○ ") + label

    private class Opt(val label: String, val reopen: Boolean = true, val run: () -> Unit)

    /** Hộp thoại danh sách lựa chọn; chọn xong mở lại để thấy trạng thái mới. */
    private fun optionsDialog(title: String, opts: () -> List<Opt>) {
        val o = opts()
        AlertDialog.Builder(act).setTitle(title)
            .setItems(o.map { it.label }.toTypedArray()) { _, w ->
                o[w].run(); if (o[w].reopen) optionsDialog(title, opts)
            }
            .setNegativeButton("Xong", null).show()
    }

    private val panel = LinearLayout(act)
    private val list = LinearLayout(act)
    private val search = EditText(act)
    val isShown get() = panel.visibility == View.VISIBLE

    private fun dp(v: Int) = (v * act.resources.displayMetrics.density).toInt()
    private fun go(i: Intent) = try { act.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
        catch (_: Exception) { Toast.makeText(act, "Máy không mở được mục này.", Toast.LENGTH_SHORT).show() }

    private val entries: List<Entry> by lazy {
        listOf(
            Entry("⚙", "#3B82F6", "Cài đặt hệ thống", "Nhấn để mở cài đặt thiết bị của bạn") { go(Intent(Settings.ACTION_SETTINGS)) },
            Entry("▣", "#F43F5E", "Hình nền", "Dùng hình nền hệ thống hoặc chọn hình mới") { wallpaperDialog() },
            Entry("◐", "#F59E0B", "Chủ đề", "Chế độ sáng, tối") { go(Intent(Settings.ACTION_DISPLAY_SETTINGS)) },
            Entry("▯", "#A855F7", "Màn hình chính", "Bố cục, kích thước biểu tượng và widget") { homeDialog() },
            Entry("✦", "#EC4899", "Hiệu ứng và màu nền", "Chỉnh hiệu ứng mở, lướt trang và màu nền các bảng") {
                actions.fxGet { fxCache = it; themeDialog() }
            },
            Entry("⇩", "#3B82F6", "Đế", "Dock ở đáy màn hình chính: hiện, số app, nhãn") { dockDialog() },
            Entry("⁞⁞", "#EAB308", "Ngăn ứng dụng", "Số cột và hàng ứng dụng gần đây") { drawerDialog() },
            Entry("≫", "#8B5CF6", "Cử chỉ", "Bật hoặc tắt các thao tác vuốt") { gestureDialog() },
            Entry("▦", "#EF4444", "Nguồn cấp dữ liệu", "Chọn thẻ hiện trong trang Hôm nay") { feedDialog() },
            Entry("⌕", "#84CC16", "Tìm kiếm", "Chọn nguồn kết quả và nút giọng nói") { searchDialog() },
            Entry("🔔", "#06B6D4", "Quyền đọc thông báo", "Cho SISO hiện thông báo và chấm số trên biểu tượng") {
                go(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            },
            Entry("⏱", "#22C55E", "Dữ liệu sử dụng", "Cấp quyền để xem thời gian dùng máy và app gần đây") { Recents.openUsageSettings(act) },
            Entry("▤", "#F97316", "Quyền truy cập tệp", "Cho phép SISO duyệt bộ nhớ trong") {
                if (Build.VERSION.SDK_INT >= 30)
                    go(Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:${act.packageName}")))
                else go(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${act.packageName}")))
            },
            Entry("⌂", "#6366F1", "Trình khởi chạy mặc định", "Đặt SISO làm màn hình chính") { go(Intent(Settings.ACTION_HOME_SETTINGS)) },
            Entry("?", "#64748B", "Trợ giúp và phản hồi", "Hướng dẫn nhanh và gửi phản hồi qua email") { helpDialog() },
            Entry("☁", "#65A30D", "Sao lưu và khôi phục", "Lưu hoặc nạp lại cài đặt, ghi chú, nhiệm vụ") { backupDialog() },
            Entry("ⓘ", "#3B82F6", "Giới thiệu về SISO OS", "Phiên bản ứng dụng") { aboutDialog() },
            Entry("⚑", "#0EA5E9", "Cài đặt nâng cao", "Đặt lại cài đặt, xóa lịch sử gần đây") { advancedDialog() }
        )
    }

    init {
        panel.orientation = LinearLayout.VERTICAL
        panel.setBackgroundColor(Color.parseColor("#F00B1118"))
        panel.visibility = View.GONE
        panel.isClickable = true

        // hàng trên cùng: ảnh đại diện tròn + ô tìm kiếm
        val top = LinearLayout(act).apply {
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(14), dp(14), dp(14), dp(14))
            setBackgroundColor(Color.parseColor("#FF121A24"))
        }
        val avatar = ImageView(act).apply {
            setImageDrawable(Recents.storeIcon(act)); scaleType = ImageView.ScaleType.CENTER_CROP
            background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(Color.parseColor("#2A3547")) }
            clipToOutline = true
            setOnClickListener { hide() }
            contentDescription = "Đóng"
        }
        top.addView(avatar, LinearLayout.LayoutParams(dp(42), dp(42)).apply { rightMargin = dp(12) })
        search.apply {
            hint = "Tìm kiếm cài đặt trình khởi chạy"
            setHintTextColor(Color.parseColor("#C8D3E0")); setTextColor(Color.WHITE); textSize = 16f
            isSingleLine = true; setPadding(dp(18), dp(10), dp(18), dp(10))
            background = GradientDrawable().apply { cornerRadius = dp(26).toFloat(); setColor(Color.parseColor("#1E2836")) }
            addTextChangedListener(object : TextWatcher {
                override fun afterTextChanged(s: Editable?) { render(s?.toString().orEmpty()) }
                override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
                override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            })
        }
        top.addView(search, LinearLayout.LayoutParams(0, -2, 1f))
        panel.addView(top, LinearLayout.LayoutParams(-1, -2))

        list.orientation = LinearLayout.VERTICAL
        list.setPadding(dp(8), dp(8), dp(8), dp(24))
        panel.addView(ScrollView(act).apply { addView(list) }, LinearLayout.LayoutParams(-1, 0, 1f))
        parent.addView(panel, FrameLayout.LayoutParams(-1, -1))
    }

    fun show() {
        search.setText("")
        render("")
        panel.alpha = 0f; panel.translationY = dp(40).toFloat(); panel.visibility = View.VISIBLE
        panel.animate().alpha(1f).translationY(0f).setDuration(200).start()
    }

    fun hide() {
        if (!isShown) return
        (act.getSystemService(Activity.INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(search.windowToken, 0)
        panel.animate().alpha(0f).translationY(dp(40).toFloat()).setDuration(160)
            .withEndAction { panel.visibility = View.GONE }.start()
    }

    private fun render(q: String) {
        list.removeAllViews()
        val nq = Search.norm(q)
        val shown = entries.filter { nq.isEmpty() || it.key.contains(nq) }
        for (e in shown) {
            val row = LinearLayout(act).apply {
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(16), dp(14), dp(16), dp(14))
                setOnClickListener { e.run() }
            }
            row.addView(TextView(act).apply {
                text = e.glyph; textSize = 15f; gravity = Gravity.CENTER; setTextColor(Color.parseColor(e.color))
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(Color.parseColor("#33" + e.color.removePrefix("#")))
                }
            }, LinearLayout.LayoutParams(dp(40), dp(40)).apply { rightMargin = dp(18) })
            val col = LinearLayout(act).apply { orientation = LinearLayout.VERTICAL }
            col.addView(TextView(act).apply { text = e.title; setTextColor(Color.WHITE); textSize = 17f })
            col.addView(TextView(act).apply { text = e.sub; setTextColor(Color.parseColor("#93A3B8")); textSize = 13f })
            row.addView(col, LinearLayout.LayoutParams(0, -2, 1f))
            list.addView(row, LinearLayout.LayoutParams(-1, -2))
        }
        if (shown.isEmpty()) list.addView(TextView(act).apply {
            text = "Không tìm thấy cài đặt phù hợp."; setTextColor(Color.parseColor("#93A3B8")); setPadding(dp(16), dp(24), dp(16), 0)
        })
    }

    // ---------- hộp thoại con ----------
    private fun wallpaperDialog() {
        val on = actions.sysWallOn()
        AlertDialog.Builder(act)
            .setTitle("Hình nền")
            .setItems(arrayOf(
                if (on) "Tắt hình nền hệ thống (dùng hình nền SISO)" else "Dùng hình nền hệ thống",
                "Chọn hình nền mới…"
            )) { _, w -> if (w == 0) actions.setSysWall(!on) else actions.pickWallpaper() }
            .setNegativeButton("Đóng", null).show()
    }

    // ---------- hiệu ứng và màu nền ----------
    private var fxCache = org.json.JSONObject()

    private val PRESETS = listOf(
        "Xanh đêm" to Color.rgb(16, 26, 44), "Đen" to Color.rgb(0, 0, 0), "Xám than" to Color.rgb(28, 30, 36),
        "Tím" to Color.rgb(40, 24, 64), "Xanh lục" to Color.rgb(12, 44, 40),
        "Đỏ rượu" to Color.rgb(56, 16, 28), "Xanh dương" to Color.rgb(14, 40, 84)
    )
    private val ALPHAS = listOf("Tự động" to -1, "Rất trong (40%)" to 40, "Trong (55%)" to 55,
        "Vừa (70%)" to 70, "Đậm (85%)" to 85, "Đặc (100%)" to 100)
    private val SPEEDS = listOf("Tắt hiệu ứng", "Nhanh", "Vừa", "Chậm")
    private val MOTIONS = listOf("Giảm tốc", "Nảy", "Mượt", "Đều")
    private val FEED_KINDS = listOf("spring" to "Nảy", "slide" to "Trượt", "blur" to "Mờ nhòe", "rise" to "Trồi lên",
        "fade" to "Mờ dần", "zoom" to "Phóng to", "none" to "Không")
    private val FEED_SPEEDS = listOf("Nhanh", "Vừa", "Chậm")
    private val PAGE_KINDS = listOf("slide" to "Trượt", "cube" to "Khối lập phương", "stack" to "Xếp chồng",
        "flip" to "Lật", "zoom" to "Thu phóng", "fade" to "Mờ dần", "carousel" to "Xoay vòng")
    private val PAGE_POWER = listOf("Nhẹ", "Vừa", "Mạnh")

    private fun saveInt(k: String, v: Int) { prefs.edit().putInt(k, v).apply(); actions.applyTheme() }
    private fun onOff(b: Boolean) = if (b) "Bật" else "Tắt"

    private fun fxF() = fxCache.optJSONObject("f") ?: org.json.JSONObject().also { fxCache.put("f", it) }
    private fun fxP() = fxCache.optJSONObject("p") ?: org.json.JSONObject().also { fxCache.put("p", it) }
    private fun setF(k: String, v: Any) { fxF().put(k, v); actions.fxSet(org.json.JSONObject().put("f", org.json.JSONObject().put(k, v))) }
    private fun setP(k: String, v: Any) { fxP().put(k, v); actions.fxSet(org.json.JSONObject().put("p", org.json.JSONObject().put(k, v))) }

    /** Hộp chọn một mục; chọn xong quay lại menu cha. */
    private fun pick(title: String, names: List<String>, cur: Int, onPick: (Int) -> Unit) {
        AlertDialog.Builder(act).setTitle(title)
            .setSingleChoiceItems(names.toTypedArray(), cur) { d, w -> onPick(w); d.dismiss(); themeDialog() }
            .setNegativeButton("Quay lại") { _, _ -> themeDialog() }
            .setOnCancelListener { themeDialog() }
            .show()
    }

    private fun hexDialog() {
        val et = EditText(act).apply { hint = "#RRGGBB, ví dụ #1A2B3C"; setSingleLine() }
        AlertDialog.Builder(act).setTitle("Mã màu nền")
            .setView(et)
            .setPositiveButton("Áp dụng") { _, _ ->
                try {
                    val c = Color.parseColor(et.text.toString().trim().let { if (it.startsWith("#")) it else "#$it" })
                    saveInt("bg_rgb", Color.rgb(Color.red(c), Color.green(c), Color.blue(c)))
                } catch (_: Exception) { Toast.makeText(act, "Mã màu không hợp lệ.", Toast.LENGTH_SHORT).show() }
                themeDialog()
            }
            .setNegativeButton("Quay lại") { _, _ -> themeDialog() }
            .show()
    }

    private fun themeDialog() = optionsDialog("Hiệu ứng và màu nền") {
        val f = fxF(); val pg = fxP()
        val rgb = prefs.getInt("bg_rgb", Glass.DEFAULT_RGB)
        val colorName = PRESETS.firstOrNull { it.second == rgb }?.first ?: "Tùy chỉnh"
        val alphaName = ALPHAS.firstOrNull { it.second == prefs.getInt("bg_alpha", -1) }?.first ?: "Tự động"
        val feedKind = f.optString("k", "spring")
        listOf(
            Opt("Màu nền bảng: $colorName", false) {
                pick("Màu nền bảng", PRESETS.map { it.first } + "Tùy chỉnh (nhập mã màu)…",
                    PRESETS.indexOfFirst { it.second == rgb }) { w ->
                    if (w < PRESETS.size) saveInt("bg_rgb", PRESETS[w].second) else hexDialog()
                }
            },
            Opt("Độ trong của nền: $alphaName", false) {
                pick("Độ trong của nền", ALPHAS.map { it.first }, ALPHAS.indexOfFirst { it.second == prefs.getInt("bg_alpha", -1) }) {
                    if (ALPHAS[it].second < 0) { prefs.edit().remove("bg_alpha").apply(); actions.applyTheme() }
                    else saveInt("bg_alpha", ALPHAS[it].second)
                }
            },
            Opt("Làm mờ phía sau bảng: ${onOff(flag("bg_blur"))}") { flip("bg_blur"); actions.applyTheme() },
            Opt("Tốc độ hiệu ứng bảng: ${SPEEDS[Glass.speed.coerceIn(0, 3)]}", false) {
                pick("Tốc độ hiệu ứng bảng", SPEEDS, Glass.speed) { saveInt("fx_speed", it) }
            },
            Opt("Kiểu chuyển động bảng: ${MOTIONS[Glass.motion.coerceIn(0, 3)]}", false) {
                pick("Kiểu chuyển động bảng", MOTIONS, Glass.motion) { saveInt("fx_motion", it) }
            },
            Opt("Hiệu ứng mở trang Hôm nay: ${FEED_KINDS.firstOrNull { it.first == feedKind }?.second ?: "Nảy"}", false) {
                pick("Hiệu ứng mở trang Hôm nay", FEED_KINDS.map { it.second }, FEED_KINDS.indexOfFirst { it.first == feedKind }) {
                    setF("k", FEED_KINDS[it].first)
                }
            },
            Opt("Tốc độ trang Hôm nay: ${FEED_SPEEDS[f.optInt("s", 1).coerceIn(0, 2)]}", false) {
                pick("Tốc độ trang Hôm nay", FEED_SPEEDS, f.optInt("s", 1)) { setF("s", it) }
            },
            Opt("Thẻ Hôm nay hiện lần lượt: ${onOff(f.optInt("stag", 1) == 1)}") { setF("stag", if (f.optInt("stag", 1) == 1) 0 else 1) },
            Opt("Hiệu ứng khi chạm nút: ${onOff(f.optInt("press", 1) == 1)}") { setF("press", if (f.optInt("press", 1) == 1) 0 else 1) },
            Opt("Hiệu ứng lướt trang màn hình chính: ${PAGE_KINDS.firstOrNull { it.first == pg.optString("k", "slide") }?.second ?: "Trượt"}", false) {
                pick("Hiệu ứng lướt trang", PAGE_KINDS.map { it.second }, PAGE_KINDS.indexOfFirst { it.first == pg.optString("k", "slide") }) {
                    setP("k", PAGE_KINDS[it].first)
                }
            },
            Opt("Cường độ lướt trang: ${PAGE_POWER[pg.optInt("i", 1).coerceIn(0, 2)]}", false) {
                pick("Cường độ lướt trang", PAGE_POWER, pg.optInt("i", 1)) { setP("i", it) }
            },
            Opt("Đặt lại hiệu ứng và màu nền") {
                prefs.edit().remove("bg_rgb").remove("bg_alpha").remove("bg_blur").remove("fx_speed").remove("fx_motion").apply()
                actions.applyTheme()
                setF("k", "spring"); setF("s", 1); setF("stag", 1); setF("press", 1); setP("k", "slide"); setP("i", 1)
            }
        )
    }

    private fun homeDialog() = optionsDialog("Màn hình chính") {
        listOf(
            Opt("Bố cục và kích thước biểu tượng", reopen = false) {
                hide()
                HomeLayout(act, { cb -> actions.layGet(cb) }, { o -> actions.laySet(o) }) { show() }.show()
            },
            Opt("Widget Android", reopen = false) { hide(); actions.openWidgets() }
        )
    }

    private fun drawerDialog() = optionsDialog("Ngăn ứng dụng") {
        val cols = actions.drawerCols()
        (4..6).map { n -> Opt(chk("$n cột", cols == n)) { actions.setDrawerCols(n) } } +
            Opt(chk("Hiện hàng gần đây", actions.drawerRecent())) { actions.setDrawerRecent(!actions.drawerRecent()) }
    }

    private fun dockDialog() = optionsDialog("Đế") {
        val max = prefs.getInt("dock_max", 5).coerceIn(3, 5)
        listOf(
            Opt(chk("Hiện dock ở màn hình chính", flag("dock_show"))) { flip("dock_show"); actions.applyDrawer() },
            Opt(chk("Hiện tên dưới biểu tượng", flag("dock_labels"))) { flip("dock_labels"); actions.applyDrawer() },
            Opt(chk("Dùng Điện thoại/Tin nhắn/Máy ảnh khi chưa ghim app", flag("dock_default"))) { flip("dock_default"); actions.applyDrawer() }
        ) + (3..5).map { n ->
            Opt(chk("Tối đa $n app trên dock", max == n)) { prefs.edit().putInt("dock_max", n).apply(); actions.applyDrawer() }
        }
    }

    private fun gestureDialog() = optionsDialog("Cử chỉ") {
        listOf(
            Opt(chk("Vuốt xuống từ mép trên: mở thông báo", flag("g_pull"))) { flip("g_pull") },
            Opt(chk("Vuốt lên: mở ngăn ứng dụng", flag("g_slide"))) { flip("g_slide") },
            Opt(chk("Kéo vạch trắng trên dock: mở rộng dock", flag("g_dock"))) { flip("g_dock") },
            Opt(chk("Vuốt phải ở trang đầu: mở trang Hôm nay", flag("g_feed"))) { flip("g_feed") }
        )
    }

    private fun hiddenCards() = (prefs.getString("feed_hidden", "") ?: "").split(",").mapNotNull { it.toIntOrNull() }.toSet()

    private fun feedDialog() = optionsDialog("Nguồn cấp dữ liệu") {
        val hid = hiddenCards()
        FEED_CARDS.mapIndexed { i, name ->
            Opt(chk(name, i !in hid)) {
                val n = if (i in hid) hid - i else hid + i
                prefs.edit().putString("feed_hidden", n.sorted().joinToString(",")).apply()
                actions.applyFeed()
            }
        }
    }

    private fun searchDialog() = optionsDialog("Tìm kiếm") {
        listOf(
            Opt(chk("Tìm trong danh bạ", flag("s_contacts"))) { flip("s_contacts") },
            Opt(chk("Tìm trong tệp", flag("s_files"))) { flip("s_files") },
            Opt(chk("Nút tìm bằng giọng nói", flag("s_voice"))) { flip("s_voice"); actions.applyDrawer() }
        )
    }

    // ---------- trợ giúp và phản hồi ----------
    private fun helpDialog() = optionsDialog("Trợ giúp và phản hồi") {
        listOf(
            Opt("Hướng dẫn nhanh", false) {
                AlertDialog.Builder(act).setTitle("Hướng dẫn nhanh").setMessage(
                    "• Vuốt lên: mở ngăn ứng dụng.\n" +
                    "• Vuốt xuống từ mép trên: mở thông báo.\n" +
                    "• Vuốt phải ở trang đầu: mở trang Hôm nay.\n" +
                    "• Màn hình chính: kéo vạch trắng ở dock lên để mở rộng, xuống để thu gọn.\n" +
                    "• Giữ biểu tượng app: ghim vào thanh tác vụ, đưa ra màn hình chính hoặc gỡ cài đặt.\n" +
                    "• Nút ⚙ trên thanh tác vụ: mở màn hình này."
                ).setPositiveButton("Đóng", null).show()
            },
            Opt("Gửi phản hồi qua email…", false) {
                val v = try { act.packageManager.getPackageInfo(act.packageName, 0).versionName } catch (_: Exception) { "?" }
                val body = "\n\n---\nSISO OS $v\n${Build.MANUFACTURER} ${Build.MODEL} · Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"
                val i = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:"))
                    .putExtra(Intent.EXTRA_SUBJECT, "Phản hồi về SISO OS").putExtra(Intent.EXTRA_TEXT, body)
                try { act.startActivity(Intent.createChooser(i, "Gửi phản hồi bằng")) }
                catch (_: Exception) { Toast.makeText(act, "Máy chưa có ứng dụng email.", Toast.LENGTH_SHORT).show() }
            },
            Opt("Thông tin ứng dụng (xóa bộ nhớ đệm, quyền)", false) {
                go(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${act.packageName}")))
            }
        )
    }

    // ---------- sao lưu và khôi phục ----------
    private fun backupDialog() = optionsDialog("Sao lưu và khôi phục") {
        listOf(
            Opt("Sao lưu: lưu thành tệp và chia sẻ", false) { exportBackup() },
            Opt("Khôi phục từ tệp sao lưu…", false) {
                val i = Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*")
                try { act.startActivityForResult(i, REQ_IMPORT) }
                catch (_: Exception) { Toast.makeText(act, "Máy không có bộ chọn tệp.", Toast.LENGTH_SHORT).show() }
            }
        )
    }

    /** Sao lưu mọi cài đặt và dữ liệu (trừ widget, vì mã widget chỉ có nghĩa trên máy này). */
    private fun exportBackup() {
        try {
            val o = JSONObject()
            for ((k, v) in prefs.all) {
                if (k == "widgets" || v == null) continue
                val e = JSONObject()
                when (v) {
                    is String -> e.put("t", "s").put("v", v)
                    is Boolean -> e.put("t", "b").put("v", v)
                    is Int -> e.put("t", "i").put("v", v)
                    is Long -> e.put("t", "l").put("v", v)
                    is Float -> e.put("t", "f").put("v", v.toDouble())
                    is Set<*> -> e.put("t", "set").put("v", JSONArray(v.map { it.toString() }))
                    else -> continue
                }
                o.put(k, e)
            }
            val root = JSONObject().put("app", "siso-os").put("version", 1).put("prefs", o)
            val name = "siso-backup-" + SimpleDateFormat("yyyyMMdd-HHmm", Locale.US).format(Date()) + ".json"
            val f = File(act.cacheDir, name).apply { writeText(root.toString(2)) }
            val uri = FileProvider.getUriForFile(act, "${act.packageName}.files", f)
            val send = Intent(Intent.ACTION_SEND).setType("application/json")
                .putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            act.startActivity(Intent.createChooser(send, "Lưu bản sao lưu vào"))
        } catch (e: Exception) {
            Toast.makeText(act, "Không tạo được bản sao lưu.", Toast.LENGTH_LONG).show()
        }
    }

    fun onResult(req: Int, res: Int, data: Intent?) {
        if (req != REQ_IMPORT || res != Activity.RESULT_OK) return
        val uri = data?.data ?: return
        val text = try { act.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() } } catch (_: Exception) { null }
        val p = try { JSONObject(text ?: "").takeIf { it.optString("app") == "siso-os" }?.getJSONObject("prefs") } catch (_: Exception) { null }
        if (p == null) { Toast.makeText(act, "Đây không phải tệp sao lưu của SISO OS.", Toast.LENGTH_LONG).show(); return }
        AlertDialog.Builder(act).setTitle("Khôi phục").setMessage("Nạp ${p.length()} mục từ tệp sao lưu và thay thế dữ liệu hiện tại?")
            .setNegativeButton("Hủy", null)
            .setPositiveButton("Khôi phục") { _, _ ->
                val ed = prefs.edit()
                val widgets = prefs.getString("widgets", "")
                ed.clear()
                for (k in p.keys()) {
                    val e = p.getJSONObject(k)
                    when (e.getString("t")) {
                        "s" -> ed.putString(k, e.getString("v"))
                        "b" -> ed.putBoolean(k, e.getBoolean("v"))
                        "i" -> ed.putInt(k, e.getInt("v"))
                        "l" -> ed.putLong(k, e.getLong("v"))
                        "f" -> ed.putFloat(k, e.getDouble("v").toFloat())
                        "set" -> { val a = e.getJSONArray("v"); ed.putStringSet(k, (0 until a.length()).map { a.getString(it) }.toSet()) }
                    }
                }
                if (!widgets.isNullOrEmpty()) ed.putString("widgets", widgets)
                ed.apply()
                Toast.makeText(act, "Đã khôi phục. Đang nạp lại…", Toast.LENGTH_SHORT).show()
                act.recreate()
            }.show()
    }

    // ---------- cài đặt nâng cao ----------
    private fun advancedDialog() = optionsDialog("Cài đặt nâng cao") {
        listOf(
            Opt("Xóa lịch sử ứng dụng gần đây", false) {
                prefs.edit().remove("recents").remove("freq").apply()
                actions.applyDrawer()
                Toast.makeText(act, "Đã xóa lịch sử.", Toast.LENGTH_SHORT).show()
            },
            Opt("Đặt lại cài đặt trình khởi chạy", false) {
                confirm("Đặt lại cài đặt", "Đưa mọi lựa chọn trong màn hình này về mặc định. App ghim, bố cục và dữ liệu Hôm nay được giữ nguyên.") {
                    val ed = prefs.edit(); SETTING_KEYS.forEach { ed.remove(it) }; ed.apply()
                    act.recreate()
                }
            },
            Opt("Đặt lại ghim và bố cục màn hình chính", false) {
                confirm("Đặt lại bố cục", "Bỏ ghim mọi app khỏi thanh tác vụ và xóa bố cục/app trên màn hình chính.") {
                    prefs.edit().remove("pins").remove("home").remove("layout").apply()
                    act.recreate()
                }
            }
        )
    }

    private fun confirm(title: String, msg: String, ok: () -> Unit) {
        AlertDialog.Builder(act).setTitle(title).setMessage(msg).setNegativeButton("Hủy", null)
            .setPositiveButton("Đặt lại") { _, _ -> ok() }.show()
    }

    private fun aboutDialog() {
        val v = try { act.packageManager.getPackageInfo(act.packageName, 0).versionName } catch (_: Exception) { "?" }
        AlertDialog.Builder(act).setTitle("SISO OS").setMessage("Phiên bản $v\nTrình khởi chạy Android.")
            .setPositiveButton("Đóng", null).show()
    }
}
