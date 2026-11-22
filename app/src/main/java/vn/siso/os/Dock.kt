package vn.siso.os

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.provider.MediaStore
import android.text.TextUtils
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/**
 * Dock ở đáy màn hình chính: vạch kéo + dòng thông số máy + hàng app ghim.
 * Kéo vạch lên để mở rộng (app ghim + gần đây), kéo xuống để thu gọn.
 */
class Dock(
    private val act: Activity,
    parent: FrameLayout,
    private val onLong: (AppItem) -> Unit,
    private val statusLine: () -> String,
    private val onCollapsedHeight: (Int) -> Unit
) {
    private val box = LinearLayout(act)
    private val status = TextView(act)
    private val scroll = ScrollView(act)
    private val rows = LinearLayout(act)
    private val prefs = act.getSharedPreferences("siso", Context.MODE_PRIVATE)
    private var all = listOf<AppItem>()
    private var open = false
    @Volatile private var loading = false
    /** Gọi sau khi người dùng đổi thứ tự app ghim (để đồng bộ nơi khác). */
    var onPinsChanged: (() -> Unit)? = null
    private val cells = mutableListOf<Pair<View, AppItem>>()

    private fun dp(v: Int) = (v * act.resources.displayMetrics.density).toInt()
    private fun flag(k: String, d: Boolean = true) = prefs.getBoolean(k, d)

    private val ticker = object : Runnable {
        override fun run() {
            if (box.visibility == View.VISIBLE) status.text = statusLine()
            box.postDelayed(this, 5000)
        }
    }

    init {
        box.orientation = LinearLayout.VERTICAL
        box.gravity = Gravity.CENTER_HORIZONTAL
        box.setPadding(dp(4), dp(4), dp(4), dp(2))
        applyTheme()
        box.isClickable = true

        // vùng chạm của vạch kéo: chạm = bật/tắt, kéo lên = mở rộng, kéo xuống = thu gọn
        val handleBox = FrameLayout(act)
        handleBox.addView(View(act).apply {
            background = GradientDrawable().apply { cornerRadius = dp(2).toFloat(); setColor(Color.WHITE) }
        }, FrameLayout.LayoutParams(dp(26), dp(4), Gravity.CENTER))
        var downY = 0f; var moved = false
        handleBox.setOnTouchListener { v, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> { downY = e.rawY; moved = !flag("g_dock"); v.parent.requestDisallowInterceptTouchEvent(true) }
                MotionEvent.ACTION_MOVE -> {
                    val dy = e.rawY - downY
                    if (!moved && dy < -dp(14)) { moved = true; setExpanded(true) }
                    else if (!moved && dy > dp(14)) { moved = true; setExpanded(false) }
                }
                MotionEvent.ACTION_UP -> { if (!moved && flag("g_dock")) setExpanded(!open) }
            }
            true
        }
        box.addView(handleBox, LinearLayout.LayoutParams(-1, dp(32)))

        status.setTextColor(Color.parseColor("#93A3B8")); status.textSize = 10f
        status.gravity = Gravity.CENTER; status.maxLines = 1; status.ellipsize = TextUtils.TruncateAt.END
        box.addView(status, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(2) })

        scroll.isVerticalScrollBarEnabled = false
        scroll.overScrollMode = View.OVER_SCROLL_NEVER
        rows.orientation = LinearLayout.VERTICAL
        scroll.addView(rows, FrameLayout.LayoutParams(-1, -2))
        box.addView(scroll, LinearLayout.LayoutParams(-1, -2))

        // khi thu gọn: báo chiều cao để màn hình chính chừa chỗ, dock không đè lên thanh tác vụ
        box.addOnLayoutChangeListener { _, _, t, _, b, _, ot, _, ob ->
            if (!open && (b - t) != (ob - ot)) onCollapsedHeight(if (box.visibility == View.VISIBLE) b - t else 0)
        }
        parent.addView(box, FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM))
        box.postDelayed(ticker, 1000)
    }

    fun applyTheme() {
        val r = dp(28).toFloat()
        box.background = Glass.bg(0f, Glass.solidFill(), radii = floatArrayOf(r, r, r, r, 0f, 0f, 0f, 0f))
    }

    /** Nạp lại danh sách app rồi dựng dock. */
    fun refresh() {
        if (loading) { build(); return }
        loading = true
        Thread {
            val pm = act.packageManager
            val i = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            val list = pm.queryIntentActivities(i, 0)
                .filter { it.activityInfo.packageName != act.packageName }
                .map { AppItem(it.loadLabel(pm).toString(), ComponentName(it.activityInfo.packageName, it.activityInfo.name), it.loadIcon(pm)) }
                .toMutableList()
            list.add(AppItem("SISO", ComponentName(act, StoreActivity::class.java), Recents.storeIcon(act)))
            act.runOnUiThread { all = list; loading = false; build() }
        }.start()
    }

    private fun pinnedApps(): List<AppItem> {
        val byKey = all.associateBy { it.component.flattenToString() }
        return (prefs.getString("pins", "") ?: "").split("\n").filter { it.isNotBlank() }.mapNotNull { byKey[it] }
    }

    private fun apps(): List<AppItem> {
        if (open) return (pinnedApps() + try { Recents.list(act, all, 20) } catch (_: Exception) { emptyList() }).distinctBy { it.component }
        val pins = pinnedApps().take(prefs.getInt("dock_max", 5).coerceIn(3, 5))
        if (pins.isNotEmpty() || !flag("dock_default")) return pins
        val pm = act.packageManager
        val byKey = all.associateBy { it.component.flattenToString() }
        return listOf(
            Intent(Intent.ACTION_DIAL),
            Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_MESSAGING),
            Intent(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA)
        ).mapNotNull { pm.resolveActivity(it, 0)?.activityInfo }
            .mapNotNull { byKey[ComponentName(it.packageName, it.name).flattenToString()] }
            .distinctBy { it.component }
    }

    private fun launch(item: AppItem) {
        Recents.record(act, item.component.flattenToString())
        val i = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setComponent(item.component)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        try { act.startActivity(i) } catch (_: Exception) {
            Toast.makeText(act, "Không mở được ứng dụng.", Toast.LENGTH_SHORT).show()
        }
        if (open) setExpanded(false)
    }

    fun build() {
        rows.removeAllViews()
        cells.clear()
        val items = apps()
        if (!flag("dock_show")) { box.visibility = View.GONE; onCollapsedHeight(0); return }
        box.visibility = View.VISIBLE
        status.text = statusLine()
        val labels = flag("dock_labels")
        val perRow = 5
        items.chunked(perRow).forEach { chunk ->
            val row = LinearLayout(act).apply { orientation = LinearLayout.HORIZONTAL }
            for (item in chunk) {
                val cell = LinearLayout(act).apply {
                    orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_HORIZONTAL
                    setPadding(0, dp(3), 0, dp(3))
                    setOnClickListener { launch(item) }
                }
                attachReorder(cell, item)
                cells.add(cell to item)
                cell.addView(ImageView(act).apply { setImageDrawable(item.icon) }, LinearLayout.LayoutParams(dp(36), dp(36)))
                if (labels) cell.addView(TextView(act).apply {
                    text = item.label; setTextColor(Color.WHITE); textSize = 10f
                    maxLines = 1; ellipsize = TextUtils.TruncateAt.END; gravity = Gravity.CENTER
                }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(1) })
                row.addView(cell, LinearLayout.LayoutParams(0, -2, 1f))
            }
            repeat(perRow - chunk.size) { row.addView(View(act), LinearLayout.LayoutParams(0, 1, 1f)) }
            rows.addView(row, LinearLayout.LayoutParams(-1, -2))
        }
        box.post { if (!open) onCollapsedHeight(box.height) }
    }

    /** Giữ một app ghim rồi kéo sang vị trí khác để đổi chỗ; giữ rồi thả yên thì mở menu. */
    private fun attachReorder(cell: View, item: AppItem) {
        val id = item.component.flattenToString()
        var dragging = false
        var moved = false
        var dx0 = 0f; var dy0 = 0f
        val slop = android.view.ViewConfiguration.get(act).scaledTouchSlop
        cell.setOnLongClickListener {
            dragging = true; moved = false
            cell.parent?.requestDisallowInterceptTouchEvent(true)
            cell.performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS)
            cell.animate().scaleX(1.15f).scaleY(1.15f).setDuration(80).start()
            cell.elevation = dp(8).toFloat()
            true
        }
        cell.setOnTouchListener { v, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> { dx0 = e.rawX; dy0 = e.rawY; dragging = false; false }
                MotionEvent.ACTION_MOVE -> if (dragging) {
                    v.parent?.requestDisallowInterceptTouchEvent(true)
                    val dx = e.rawX - dx0; val dy = e.rawY - dy0
                    if (Math.abs(dx) > slop || Math.abs(dy) > slop) moved = true
                    v.translationX = dx; v.translationY = dy
                    true
                } else false
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> if (dragging) {
                    dragging = false
                    v.isPressed = false
                    v.animate().scaleX(1f).scaleY(1f).translationX(0f).translationY(0f).setDuration(120).start()
                    v.elevation = 0f
                    if (e.actionMasked == MotionEvent.ACTION_CANCEL) return@setOnTouchListener true
                    if (!moved) { onLong(item); return@setOnTouchListener true }
                    val tg = cells.firstOrNull { pair ->
                        val c = pair.first
                        if (c === v) false else {
                            val loc = IntArray(2); c.getLocationOnScreen(loc)
                            e.rawX >= loc[0] && e.rawX <= loc[0] + c.width && e.rawY >= loc[1] && e.rawY <= loc[1] + c.height
                        }
                    }?.second
                    val pins = (prefs.getString("pins", "") ?: "").split("\n").filter { it.isNotBlank() }.toMutableList()
                    val tid = tg?.component?.flattenToString()
                    if (tid != null && pins.contains(id) && pins.contains(tid)) {
                        pins.remove(id)
                        val movingLeft = cells.indexOfFirst { it.second === item } > cells.indexOfFirst { it.second === tg }
                        val ti = pins.indexOf(tid)
                        pins.add((if (movingLeft) ti else ti + 1).coerceIn(0, pins.size), id)
                        prefs.edit().putString("pins", pins.joinToString("\n")).apply()
                        build()
                        onPinsChanged?.invoke()
                    }
                    true
                } else false
                else -> false
            }
        }
    }

    fun setExpanded(want: Boolean) {
        if (want == open) return
        open = want
        build()
        val full = act.resources.displayMetrics.heightPixels
        scroll.post {
            val from = if (scroll.height > 0) scroll.height else dp(60)
            val to = if (want) (full * 0.40f).toInt() else {
                rows.measure(View.MeasureSpec.makeMeasureSpec(box.width, View.MeasureSpec.AT_MOST), View.MeasureSpec.UNSPECIFIED)
                rows.measuredHeight
            }
            ValueAnimator.ofInt(from, to).setDuration(Glass.dur(200)).apply {
                addUpdateListener { a -> scroll.layoutParams = scroll.layoutParams.also { it.height = a.animatedValue as Int } }
                addListener(object : AnimatorListenerAdapter() {
                    override fun onAnimationEnd(a: Animator) {
                        if (!want) { scroll.layoutParams = scroll.layoutParams.also { it.height = -2 } }
                    }
                })
                start()
            }
        }
    }

    val isExpanded get() = open
    fun collapse() { if (open) setExpanded(false) }
}
