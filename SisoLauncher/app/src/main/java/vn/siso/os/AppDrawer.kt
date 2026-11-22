package vn.siso.os

import android.Manifest
import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.provider.ContactsContract
import android.provider.Settings
import android.speech.RecognizerIntent
import android.text.Editable
import android.text.TextUtils
import android.text.TextWatcher
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.animation.AccelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ScrollView
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.FileProvider
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import java.io.File
import java.util.Locale
import java.util.concurrent.Executors

class AppItem(val label: String, val component: ComponentName, val icon: Drawable) {
    val key: String = Search.norm(label)
    val isStore get() = component.className == StoreActivity::class.java.name
}

internal sealed class Row {
    data class Head(val text: String) : Row()
    data class App(val item: AppItem, val mark: String? = null) : Row()
    data class Contact(val c: ContactHit) : Row()
    data class File(val f: FileHit) : Row()
    data class Prompt(val text: String, val btn: String, val action: () -> Unit) : Row()
    object Divider : Row()
}

/**
 * Ngăn ứng dụng gốc: lưới app, "Gần đây", và tìm gộp ứng dụng + danh bạ + tệp.
 */
class AppDrawer(
    private val act: Activity,
    parent: FrameLayout,
    private val onLong: (AppItem) -> Unit
) {

    companion object {
        const val REQ_CONTACTS = 203
        const val REQ_VOICE = 205
        private val LETTERS = listOf("A","B","C","D","Đ","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","#")
    }

    /** Biểu tượng đồng hồ "gần đây" vẽ tay, không phụ thuộc font. */
    private class ClockDrawable(private val col: Int) : Drawable() {
        private val p = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
        override fun draw(c: Canvas) {
            val b = bounds; val w = b.width().toFloat()
            p.color = col; p.strokeWidth = w * 0.11f
            val cx = b.exactCenterX(); val cy = b.exactCenterY(); val r = w * 0.4f
            c.drawArc(cx - r, cy - r, cx + r, cy + r, -60f, 320f, false, p)
            c.drawLine(cx, cy, cx, cy - r * 0.55f, p)
            c.drawLine(cx, cy, cx + r * 0.4f, cy + r * 0.25f, p)
        }
        override fun setAlpha(a: Int) { p.alpha = a }
        override fun setColorFilter(cf: ColorFilter?) { p.colorFilter = cf }
        override fun getOpacity() = PixelFormat.TRANSLUCENT
    }

    private val prefs = act.getSharedPreferences("siso", Activity.MODE_PRIVATE)
    private var cols = prefs.getInt("drawer_cols", 5).coerceIn(4, 6)
    private var showRecent = prefs.getBoolean("drawer_recent", true)
    private lateinit var gl: GridLayoutManager
    private lateinit var rv: RecyclerView
    private val indexBox = LinearLayout(act)
    private val bubble = TextView(act)
    private var letterPos = mapOf<String, Int>()
    private val clock = ClockDrawable(Color.parseColor("#93A3B8"))

    /** Chữ cái (hoặc biểu tượng đồng hồ) vẽ ở lề trái, ngang hàng đầu mỗi nhóm. */
    private val gutter = object : RecyclerView.ItemDecoration() {
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#93A3B8"); textSize = dp(13).toFloat()
        }
        override fun onDrawOver(c: Canvas, parent: RecyclerView, state: RecyclerView.State) {
            for (i in 0 until parent.childCount) {
                val v = parent.getChildAt(i)
                val p = parent.getChildAdapterPosition(v)
                if (p < 0 || p >= listAdapter.rows.size) continue
                val r = listAdapter.rows[p] as? Row.App ?: continue
                val m = r.mark ?: continue
                if (m == "recent") {
                    val s = dp(14); val l = dp(4); val t = v.top + dp(10)
                    clock.setBounds(l, t, l + s, t + s); clock.draw(c)
                } else c.drawText(m, dp(6).toFloat(), (v.top + dp(10 + 13)).toFloat(), paint)
            }
        }
    }

    private val panel = LinearLayout(act)
    private val search = EditText(act)
    private val listAdapter = Adapter()
    private var all = listOf<AppItem>()
    private var apps = listOf<AppItem>()          // kết quả app của truy vấn hiện tại (để bấm Enter)
    private var badges: Map<String, Int> = emptyMap()
    private val exec = Executors.newSingleThreadExecutor()
    @Volatile private var gen = 0
    val isShown get() = panel.visibility == View.VISIBLE
    private val voiceBtn = ImageView(act)
    private val behind: View = parent.getChildAt(0)
    private val scrim = View(act)
    private var state = 0   // 0: ẩn, 1: mở nửa màn hình, 2: toàn màn hình
    val isHalf get() = state == 1 && isShown

    private fun dp(v: Int) = (v * act.resources.displayMetrics.density).toInt()
    private fun flag(k: String, d: Boolean = true) = prefs.getBoolean(k, d)

    init {
        panel.orientation = LinearLayout.VERTICAL
        applyTheme()
        panel.setPadding(dp(6), dp(6), dp(2), dp(8))
        panel.visibility = View.GONE
        panel.isClickable = true

        search.apply {
            hint = "Tìm kiếm"
            setOnFocusChangeListener { _, f -> if (f && state == 1) snap(2) }
            setHintTextColor(Color.parseColor("#93A3B8"))
            setTextColor(Color.WHITE)
            textSize = 15f
            isSingleLine = true
            imeOptions = EditorInfo.IME_ACTION_GO
            setOnEditorActionListener { _, _, _ -> apps.firstOrNull()?.let { launch(it) }; true }
            setPadding(0, dp(12), 0, dp(12))
            background = null
            addTextChangedListener(object : TextWatcher {
                override fun afterTextChanged(s: Editable?) { render(s?.toString().orEmpty()) }
                override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
                override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            })
        }
        val bar = LinearLayout(act).apply {
            orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(16), 0, dp(6), 0)
            background = Glass.bg(dp(26).toFloat(), Color.parseColor("#2EFFFFFF"), Color.parseColor("#40FFFFFF"))
        }
        bar.addView(ImageView(act).apply {
            setImageResource(android.R.drawable.ic_menu_search); setColorFilter(Color.parseColor("#C8D3E0"))
        }, LinearLayout.LayoutParams(dp(22), dp(22)).apply { rightMargin = dp(12) })
        bar.addView(search, LinearLayout.LayoutParams(0, -2, 1f))
        bar.addView(voiceBtn.apply {
            setImageResource(android.R.drawable.ic_btn_speak_now); setColorFilter(Color.parseColor("#C8D3E0"))
            setPadding(dp(8), dp(8), dp(8), dp(8)); setOnClickListener { voice() }
            contentDescription = "Tìm bằng giọng nói"
        }, LinearLayout.LayoutParams(dp(40), dp(40)))
        bar.addView(TextView(act).apply {
            text = "⋮"; textSize = 22f; gravity = Gravity.CENTER; setTextColor(Color.parseColor("#C8D3E0"))
            setOnClickListener { menu(it) }
        }, LinearLayout.LayoutParams(dp(36), dp(40)))
        val handle = FrameLayout(act)
        handle.addView(View(act).apply {
            background = GradientDrawable().apply { cornerRadius = dp(2).toFloat(); setColor(Color.parseColor("#80FFFFFF")) }
        }, FrameLayout.LayoutParams(dp(36), dp(4), Gravity.CENTER))
        handle.setOnClickListener { snap(if (state == 1) 2 else 1) }
        panel.addView(handle, 0, LinearLayout.LayoutParams(-1, dp(18)).apply { bottomMargin = dp(2) })
        panel.addView(bar, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(8); leftMargin = dp(8); rightMargin = dp(10) })

        rv = RecyclerView(act).apply {
            gl = GridLayoutManager(act, cols)
            gl.spanSizeLookup = object : GridLayoutManager.SpanSizeLookup() {
                override fun getSpanSize(p: Int) = if (listAdapter.rows[p] is Row.App) 1 else gl.spanCount
            }
            layoutManager = gl
            adapter = listAdapter
            clipToPadding = false
            setPadding(dp(22), 0, dp(26), 0)
            addItemDecoration(gutter)
        }
        val body = FrameLayout(act)
        body.addView(rv, FrameLayout.LayoutParams(-1, -1))

        // thanh chữ cái bên phải: chạm / vuốt để nhảy nhanh
        indexBox.orientation = LinearLayout.VERTICAL
        indexBox.setOnTouchListener { v, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE -> {
                    v.parent.requestDisallowInterceptTouchEvent(true)
                    val n = indexBox.childCount
                    if (n > 0 && v.height > 0) jump((e.y / v.height * n).toInt().coerceIn(0, n - 1))
                }
                else -> bubble.visibility = View.GONE
            }
            true
        }
        body.addView(indexBox, FrameLayout.LayoutParams(dp(36), -1, Gravity.END).apply { topMargin = dp(4); bottomMargin = dp(4) })
        bubble.apply {
            setTextColor(Color.WHITE); gravity = Gravity.CENTER; visibility = View.GONE
            setPadding(dp(26), dp(16), dp(26), dp(16))
            background = Glass.bg(dp(26).toFloat(), Color.parseColor("#D91E2A3E"))
        }
        body.addView(bubble, FrameLayout.LayoutParams(-2, -2, Gravity.CENTER))
        panel.addView(body, LinearLayout.LayoutParams(-1, 0, 1f))

        scrim.setBackgroundColor(Color.parseColor("#33000000"))
        scrim.visibility = View.GONE
        scrim.setOnClickListener { hide() }
        parent.addView(scrim, FrameLayout.LayoutParams(-1, -1))
        parent.addView(panel, FrameLayout.LayoutParams(-1, -1))
    }

    fun applyTheme() {
        val r = dp(28).toFloat()
        panel.background = Glass.bg(0f, Glass.panelFill(), radii = floatArrayOf(r, r, r, r, 0f, 0f, 0f, 0f))
    }

    private fun fullH() = (if (panel.height > 0) panel.height else act.resources.displayMetrics.heightPixels).toFloat()

    fun show() {
        panel.animate().cancel()
        if (panel.visibility != View.VISIBLE) {
            panel.translationY = fullH()
            panel.alpha = 0.4f
            panel.visibility = View.VISIBLE
        }
        snap(2)
        search.setText("")
        voiceBtn.visibility = if (flag("s_voice")) View.VISIBLE else View.GONE
        load()
    }

    // ---------- kéo theo ngón tay: vuốt lên mở, vuốt xuống đóng ----------
    /** Danh sách đang ở đầu trang (không cuộn lên được nữa) thì kéo xuống mới đóng ngăn. */
    fun atTop() = !rv.canScrollVertically(-1)

    fun currentTy() = panel.translationY

    private fun halfTy() = fullH() * 0.45f

    /** Dừng ở nấc: 1 = nửa màn hình, 2 = toàn màn hình. */
    private fun snap(s: Int) {
        state = s
        scrim.visibility = View.VISIBLE
        Glass.blurBehind(behind, this, true)
        panel.animate().cancel()
        panel.animate().translationY(if (s == 1) halfTy() else 0f).alpha(1f)
            .setDuration(Glass.dur(220)).setInterpolator(Glass.interp()).start()
    }

    fun slideBegin() {
        panel.animate().cancel()
        scrim.visibility = View.VISIBLE
        if (panel.visibility != View.VISIBLE) {
            panel.translationY = fullH()
            panel.alpha = 0.4f
            panel.visibility = View.VISIBLE
            search.setText("")
            load()
        }
    }

    fun slideTo(ty: Float) {
        val h = fullH()
        val t = ty.coerceIn(0f, h)
        val half = halfTy()
        panel.translationY = t
        panel.alpha = if (t <= half) 1f else 1f - 0.6f * ((t - half) / (h - half))
    }

    /** Thả tay: tự chọn nấc gần nhất (toàn màn hình / nửa / đóng), có tính đà vuốt. */
    fun slideEnd(ty: Float, vy: Float) {
        val h = fullH(); val half = halfTy()
        val p = ty + vy * 0.12f
        when {
            p < half * 0.45f -> snap(2)
            p < half + (h - half) * 0.45f -> snap(1)
            else -> hide()
        }
    }

    private fun load() {
        Thread {
            val pm = act.packageManager
            val i = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            val list = pm.queryIntentActivities(i, 0)
                .filter { it.activityInfo.packageName != act.packageName }
                .map {
                    AppItem(
                        it.loadLabel(pm).toString(),
                        ComponentName(it.activityInfo.packageName, it.activityInfo.name),
                        it.loadIcon(pm)
                    )
                }
                .toMutableList()
            // app cài sẵn: SISO
            list.add(AppItem("SISO", ComponentName(act, StoreActivity::class.java), Recents.storeIcon(act)))
            val sorted = list.sortedWith(compareBy({ LETTERS.indexOf(letterOf(it)) }, { it.key }))
            act.runOnUiThread { all = sorted; render(search.text.toString()) }
        }.start()
    }

    fun hide() {
        if (!isShown) return
        state = 0
        panel.animate().cancel()
        (act.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(search.windowToken, 0)
        panel.animate().translationY(fullH()).alpha(0f).setDuration(Glass.dur(180)).setInterpolator(Glass.interpOut())
            .withEndAction { panel.visibility = View.GONE; panel.translationY = 0f; panel.alpha = 1f; scrim.visibility = View.GONE; Glass.blurBehind(behind, this, false) }.start()
    }

    fun refresh() { if (isShown) load() }

    fun applySettings() { voiceBtn.visibility = if (flag("s_voice")) View.VISIBLE else View.GONE }
    fun columns() = cols
    fun setColumns(n: Int) {
        cols = n.coerceIn(4, 6); prefs.edit().putInt("drawer_cols", cols).apply(); gl.spanCount = cols
        render(search.text.toString())
    }
    fun recentShown() = showRecent
    fun setRecentShown(on: Boolean) {
        showRecent = on; prefs.edit().putBoolean("drawer_recent", on).apply(); render(search.text.toString())
    }

    fun setBadges(m: Map<String, Int>) {
        badges = m
        if (isShown) listAdapter.notifyDataSetChanged()
    }

    /** Gọi khi người dùng vừa cấp/từ chối quyền danh bạ. */
    fun onPermissionResult() { if (isShown) render(search.text.toString()) }

    // ---------- dựng danh sách ----------
    private fun render(q: String) {
        val g = ++gen
        val nq = Search.norm(q.trim())
        if (nq.isEmpty()) {
            indexBox.visibility = View.VISIBLE
            val rows = ArrayList<Row>()
            if (showRecent) {
                val rec = Recents.list(act, all).take(cols)
                rec.forEachIndexed { i, a -> rows.add(Row.App(a, if (i == 0) "recent" else null)) }
                if (rec.isNotEmpty()) rows.add(Row.Divider)
                if (!Recents.hasUsageAccess(act)) {
                    rows.add(Row.Prompt("Cho phép \"Truy cập mức sử dụng\" để hàng này gồm cả app mở ngoài SISO OS.", "Cấp quyền") { Recents.openUsageSettings(act) })
                }
            }
            val pos = HashMap<String, Int>()
            var last = ""
            all.forEach { a ->
                val l = letterOf(a)
                val first = l != last
                if (first) { last = l; pos[l] = rows.size }
                rows.add(Row.App(a, if (first) l else null))
            }
            letterPos = pos
            buildIndex()
            apps = all
            listAdapter.submit(rows)
            return
        }
        indexBox.visibility = View.GONE
        apps = all.filter { it.key.contains(nq) }
        val base = ArrayList<Row>()
        if (apps.isNotEmpty()) { base.add(Row.Head("Ứng dụng")); apps.forEach { base.add(Row.App(it)) } }
        listAdapter.submit(base)

        exec.execute {
            val useC = flag("s_contacts"); val useF = flag("s_files")
            val contacts = if (useC) Search.contacts(act, q) else emptyList()
            val files = if (useF) Search.files(act, q) else emptyList()
            act.runOnUiThread {
                if (g != gen) return@runOnUiThread
                val rows = ArrayList<Row>(base)
                if (!useC) {
                } else if (!Search.hasContacts(act)) {
                    rows.add(Row.Head("Danh bạ"))
                    rows.add(Row.Prompt("Cho phép SISO OS đọc danh bạ để tìm người liên hệ.", "Cấp quyền") {
                        act.requestPermissions(arrayOf(Manifest.permission.READ_CONTACTS), REQ_CONTACTS)
                    })
                } else if (contacts.isNotEmpty()) {
                    rows.add(Row.Head("Danh bạ")); contacts.forEach { rows.add(Row.Contact(it)) }
                }
                if (!useF) {
                } else if (!Search.hasStorage(act)) {
                    rows.add(Row.Head("Tệp"))
                    rows.add(Row.Prompt("Cho phép truy cập tệp để tìm tài liệu, ảnh, nhạc trong máy.", "Cấp quyền") { askStorage() })
                } else if (files.isNotEmpty()) {
                    rows.add(Row.Head("Tệp")); files.forEach { rows.add(Row.File(it)) }
                }
                if (rows.isEmpty()) rows.add(Row.Prompt("Không tìm thấy kết quả nào.", "", {}))
                listAdapter.submit(rows)
            }
        }
    }

    private fun letterOf(i: AppItem): String {
        val c = i.label.trim().firstOrNull() ?: return "#"
        if (c == 'Đ' || c == 'đ') return "Đ"
        val n = Search.norm(i.label.trim()).firstOrNull()?.uppercaseChar() ?: return "#"
        return if (n in 'A'..'Z') n.toString() else "#"
    }

    private fun buildIndex() {
        indexBox.removeAllViews()
        val dim = Color.parseColor("#5E6B7C"); val on = Color.parseColor("#4DB2FF")
        indexBox.addView(ImageView(act).apply {
            setImageDrawable(ClockDrawable(on)); setPadding(dp(5), dp(5), dp(5), dp(5))
        }, LinearLayout.LayoutParams(-1, 0, 1f))
        LETTERS.forEach { l ->
            indexBox.addView(TextView(act).apply {
                text = l; textSize = 10f; gravity = Gravity.CENTER
                setTextColor(if (letterPos.containsKey(l)) on else dim)
            }, LinearLayout.LayoutParams(-1, 0, 1f))
        }
    }

    private fun jump(i: Int) {
        var pos = 0
        if (i > 0) {
            // chữ không có app thì nhảy tới chữ kế tiếp có app
            pos = (i - 1 until LETTERS.size).firstNotNullOfOrNull { letterPos[LETTERS[it]] } ?: (listAdapter.rows.size - 1)
        }
        gl.scrollToPositionWithOffset(pos.coerceAtLeast(0), 0)
        bubble.text = if (i == 0) "Gần đây" else LETTERS[i - 1]
        bubble.textSize = if (i == 0) 16f else 30f
        bubble.visibility = View.VISIBLE
    }

    private fun menu(anchor: View) {
        val m = PopupMenu(act, anchor)
        for (n in 4..6) m.menu.add(0, n, 0, (if (cols == n) "✓ " else "") + "$n cột")
        m.menu.add(0, 10, 0, if (showRecent) "Ẩn hàng gần đây" else "Hiện hàng gần đây")
        m.setOnMenuItemClickListener {
            when (it.itemId) {
                in 4..6 -> { cols = it.itemId; prefs.edit().putInt("drawer_cols", cols).apply(); gl.spanCount = cols }
                10 -> { showRecent = !showRecent; prefs.edit().putBoolean("drawer_recent", showRecent).apply() }
            }
            render(search.text.toString()); true
        }
        m.show()
    }

    private fun voice() {
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "vi-VN")
        try { act.startActivityForResult(i, REQ_VOICE) }
        catch (_: Exception) { Toast.makeText(act, "Máy không hỗ trợ nhập bằng giọng nói.", Toast.LENGTH_SHORT).show() }
    }

    fun onResult(req: Int, res: Int, data: Intent?) {
        if (req != REQ_VOICE || res != Activity.RESULT_OK) return
        val t = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull() ?: return
        search.setText(t); search.setSelection(t.length)
    }

    private fun askStorage() {
        if (Build.VERSION.SDK_INT >= 30) {
            act.startActivity(Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:${act.packageName}")))
        } else {
            act.requestPermissions(arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE), 201)
        }
    }

    // ---------- hành động ----------
    private fun launch(item: AppItem) {
        Recents.record(act, item.component.flattenToString())
        val i = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            .setComponent(item.component)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        try { act.startActivity(i) } catch (_: Exception) {
            Toast.makeText(act, "Không mở được ứng dụng.", Toast.LENGTH_SHORT).show()
        }
        hide()
    }

    private fun openContact(c: ContactHit) {
        try {
            act.startActivity(
                Intent(Intent.ACTION_VIEW, ContactsContract.Contacts.getLookupUri(c.id, c.lookup))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
            hide()
        } catch (_: Exception) {}
    }

    private fun dial(c: ContactHit) {
        try {
            act.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${Uri.encode(c.number)}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            hide()
        } catch (_: Exception) {}
    }

    private fun openFile(f: FileHit) {
        try {
            val file = File(f.path)
            val uri = FileProvider.getUriForFile(act, "${act.packageName}.files", file)
            val mime = android.webkit.MimeTypeMap.getSingleton()
                .getMimeTypeFromExtension(file.extension.lowercase()) ?: "*/*"
            act.startActivity(
                Intent(Intent.ACTION_VIEW).setDataAndType(uri, mime)
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            )
            hide()
        } catch (_: Exception) {
            Toast.makeText(act, "Không có ứng dụng nào mở được tệp này.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun size(n: Long) = when {
        n < 1024 -> "$n B"
        n < 1048576 -> "%.0f KB".format(n / 1024f)
        n < 1073741824 -> "%.1f MB".format(n / 1048576f)
        else -> "%.2f GB".format(n / 1073741824f)
    }

    // ---------- adapter ----------
    private inner class Adapter : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
        var rows = listOf<Row>()
        fun submit(l: List<Row>) { rows = l; notifyDataSetChanged() }

        override fun getItemViewType(p: Int) = when (rows[p]) {
            is Row.Head -> 0; is Row.App -> 1; is Row.Contact -> 2; is Row.File -> 3; is Row.Prompt -> 4; is Row.Divider -> 5
        }

        private fun text(size: Float, color: String) = TextView(act).apply {
            textSize = size; setTextColor(Color.parseColor(color))
            maxLines = 1; ellipsize = TextUtils.TruncateAt.END
        }

        inner class VH(v: View) : RecyclerView.ViewHolder(v)

        override fun onCreateViewHolder(p: ViewGroup, t: Int): RecyclerView.ViewHolder {
            val v: View = when (t) {
                0 -> text(13f, "#93A3B8").apply {
                    setPadding(dp(6), dp(14), dp(6), dp(4))
                    layoutParams = RecyclerView.LayoutParams(-1, -2)
                }
                1 -> LinearLayout(act).apply {
                    orientation = LinearLayout.VERTICAL
                    gravity = Gravity.CENTER_HORIZONTAL
                    setPadding(dp(4), dp(10), dp(4), dp(10))
                    layoutParams = RecyclerView.LayoutParams(-1, -2)
                    val box = FrameLayout(act)
                    box.addView(ImageView(act), FrameLayout.LayoutParams(dp(48), dp(48), Gravity.CENTER))
                    box.addView(TextView(act).apply {
                        setTextColor(Color.WHITE); textSize = 11f; gravity = Gravity.CENTER
                        setPadding(dp(5), 0, dp(5), 0); minWidth = dp(18); minHeight = dp(18)
                        background = GradientDrawable().apply { cornerRadius = dp(9).toFloat(); setColor(Color.parseColor("#EF4444")) }
                        visibility = View.GONE
                    }, FrameLayout.LayoutParams(-2, -2, Gravity.TOP or Gravity.END).apply { rightMargin = dp(10) })
                    addView(box, LinearLayout.LayoutParams(-1, dp(48)))
                    addView(TextView(act).apply {
                        setTextColor(Color.WHITE); textSize = 11f; gravity = Gravity.CENTER
                        maxLines = 1; ellipsize = TextUtils.TruncateAt.END
                    }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(4) })
                }
                2, 3 -> LinearLayout(act).apply {
                    orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
                    setPadding(dp(10), dp(8), dp(6), dp(8))
                    layoutParams = RecyclerView.LayoutParams(-1, -2).apply { bottomMargin = dp(4) }
                    background = Glass.bg(dp(18).toFloat(), Color.parseColor("#22FFFFFF"), Color.parseColor("#26FFFFFF"))
                    addView(TextView(act).apply {
                        gravity = Gravity.CENTER; setTextColor(Color.WHITE); textSize = 11f
                        background = GradientDrawable().apply { cornerRadius = dp(14).toFloat(); setColor(Color.parseColor("#33FFFFFF")) }
                    }, LinearLayout.LayoutParams(dp(38), dp(38)).apply { rightMargin = dp(10) })
                    val col = LinearLayout(act).apply { orientation = LinearLayout.VERTICAL }
                    col.addView(text(15f, "#FFFFFF")); col.addView(text(12f, "#93A3B8"))
                    addView(col, LinearLayout.LayoutParams(0, -2, 1f))
                    addView(Button(act).apply { text = "Gọi"; isAllCaps = false; textSize = 12f; minWidth = 0; minimumWidth = 0 })
                }
                5 -> View(act).apply {
                    setBackgroundColor(Color.parseColor("#33FFFFFF"))
                    layoutParams = RecyclerView.LayoutParams(-1, dp(1)).apply { topMargin = dp(8); bottomMargin = dp(8) }
                }
                else -> LinearLayout(act).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(dp(14), dp(12), dp(14), dp(12))
                    layoutParams = RecyclerView.LayoutParams(-1, -2).apply { bottomMargin = dp(4) }
                    background = Glass.bg(dp(18).toFloat(), Color.parseColor("#22FFFFFF"), Color.parseColor("#26FFFFFF"))
                    addView(TextView(act).apply { setTextColor(Color.parseColor("#C8D3E0")); textSize = 13f })
                    addView(Button(act).apply { isAllCaps = false; textSize = 12f })
                }
            }
            return VH(v)
        }

        override fun onBindViewHolder(h: RecyclerView.ViewHolder, pos: Int) {
            val v = h.itemView
            when (val r = rows[pos]) {
                is Row.Head -> (v as TextView).text = r.text
                is Row.Divider -> {}
                is Row.App -> {
                    val col = v as LinearLayout
                    val box = col.getChildAt(0) as FrameLayout
                    (box.getChildAt(0) as ImageView).setImageDrawable(r.item.icon)
                    val n = badges[r.item.component.packageName] ?: 0
                    (box.getChildAt(1) as TextView).apply {
                        visibility = if (n > 0 && !r.item.isStore) View.VISIBLE else View.GONE
                        text = if (n > 99) "99+" else n.toString()
                    }
                    (col.getChildAt(1) as TextView).text = r.item.label
                    v.setOnClickListener { launch(r.item) }
                    v.setOnLongClickListener { if (!r.item.isStore) onLong(r.item); true }
                }
                is Row.Contact -> {
                    val g = v as LinearLayout
                    (g.getChildAt(0) as TextView).text = r.c.name.take(1).uppercase()
                    val col = g.getChildAt(1) as LinearLayout
                    (col.getChildAt(0) as TextView).text = r.c.name
                    (col.getChildAt(1) as TextView).text = r.c.number
                    g.setOnClickListener { openContact(r.c) }
                    (g.getChildAt(2) as Button).setOnClickListener { dial(r.c) }
                }
                is Row.File -> {
                    val g = v as LinearLayout
                    val ext = r.f.name.substringAfterLast('.', "TỆP").take(4).uppercase()
                    (g.getChildAt(0) as TextView).text = ext
                    val col = g.getChildAt(1) as LinearLayout
                    (col.getChildAt(0) as TextView).text = r.f.name
                    (col.getChildAt(1) as TextView).text =
                        "${File(r.f.path).parentFile?.name ?: ""} · ${size(r.f.size)}"
                    g.getChildAt(2).visibility = View.GONE
                    g.setOnClickListener { openFile(r.f) }
                }
                is Row.Prompt -> {
                    val g = v as LinearLayout
                    (g.getChildAt(0) as TextView).text = r.text
                    (g.getChildAt(1) as Button).apply {
                        visibility = if (r.btn.isEmpty()) View.GONE else View.VISIBLE
                        text = r.btn
                        setOnClickListener { r.action() }
                    }
                    g.setOnClickListener(null)
                }
            }
        }

        override fun getItemCount() = rows.size
    }
}
