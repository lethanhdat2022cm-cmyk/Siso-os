package vn.siso.os

import android.app.Activity
import android.appwidget.AppWidgetHost
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/** Host widget Android thật, hiển thị trong một bảng phủ lên SISO OS. */
class WidgetPanel(private val act: Activity, parent: FrameLayout) {

    companion object { const val REQ_PICK = 101; const val REQ_CONFIG = 102 }

    private val host = AppWidgetHost(act, 1024)
    private val mgr = AppWidgetManager.getInstance(act)
    private val prefs = act.getSharedPreferences("siso", Activity.MODE_PRIVATE)
    private val panel = LinearLayout(act)
    private val list = LinearLayout(act)
    private var pendingId = -1
    val isShown get() = panel.visibility == View.VISIBLE

    private val behind: View = parent.getChildAt(0)

    fun applyTheme() {
        val r = dp(28).toFloat()
        panel.background = Glass.bg(0f, Glass.panelFill(), radii = floatArrayOf(r, r, r, r, 0f, 0f, 0f, 0f))
    }

    private fun dp(v: Int) = (v * act.resources.displayMetrics.density).toInt()

    init {
        panel.orientation = LinearLayout.VERTICAL
        applyTheme()
        panel.setPadding(dp(12), dp(16), dp(12), dp(8))
        panel.visibility = View.GONE
        panel.isClickable = true

        val bar = LinearLayout(act).apply { gravity = Gravity.CENTER_VERTICAL }
        bar.addView(TextView(act).apply {
            text = "Widget"; setTextColor(Color.WHITE); textSize = 18f
        }, LinearLayout.LayoutParams(0, -2, 1f))
        bar.addView(Button(act).apply { text = "+ Thêm"; setOnClickListener { add() } })
        bar.addView(Button(act).apply { text = "Đóng"; setOnClickListener { hide() } })
        panel.addView(bar, LinearLayout.LayoutParams(-1, -2))

        list.orientation = LinearLayout.VERTICAL
        val sv = ScrollView(act).apply { addView(list) }
        panel.addView(sv, LinearLayout.LayoutParams(-1, 0, 1f).apply { topMargin = dp(8) })
        parent.addView(panel, FrameLayout.LayoutParams(-1, -1))
    }

    fun startListening() { try { host.startListening() } catch (_: Exception) {} }
    fun stopListening() { try { host.stopListening() } catch (_: Exception) {} }

    fun show() { panel.visibility = View.VISIBLE; Glass.blurBehind(behind, this, true); render() }
    fun hide() { panel.visibility = View.GONE; Glass.blurBehind(behind, this, false) }

    private fun ids(): MutableList<Int> =
        (prefs.getString("widgets", "") ?: "").split(",").filter { it.isNotBlank() }.map { it.toInt() }.toMutableList()

    private fun save(l: List<Int>) = prefs.edit().putString("widgets", l.joinToString(",")).apply()

    private fun render() {
        list.removeAllViews()
        val ids = ids()
        val keep = mutableListOf<Int>()
        for (id in ids) {
            val info = mgr.getAppWidgetInfo(id) ?: continue
            keep.add(id)
            val v = host.createView(act, id, info)
            v.setAppWidget(id, info)
            val h = maxOf(info.minHeight, 110)
            val card = FrameLayout(act).apply {
                background = GradientDrawable().apply {
                    cornerRadius = dp(22).toFloat(); setColor(Color.parseColor("#26FFFFFF"))
                    setStroke(dp(1), Color.parseColor("#30FFFFFF"))
                }
                setPadding(dp(4), dp(4), dp(4), dp(4))
            }
            card.addView(v, FrameLayout.LayoutParams(-1, dp(h)))
            card.addView(Button(act).apply {
                text = "✕"; textSize = 12f; minWidth = 0; minimumWidth = 0
                setOnClickListener { remove(id) }
            }, FrameLayout.LayoutParams(dp(44), dp(40), Gravity.TOP or Gravity.END))
            list.addView(card, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(10) })
        }
        if (keep.size != ids.size) save(keep)
        if (keep.isEmpty()) list.addView(TextView(act).apply {
            text = "Chưa có widget. Bấm \"+ Thêm\" để chọn widget từ các ứng dụng đã cài."
            setTextColor(Color.parseColor("#93A3B8")); setPadding(dp(8), dp(24), dp(8), 0)
        })
    }

    private fun remove(id: Int) {
        host.deleteAppWidgetId(id)
        save(ids().also { it.remove(id) })
        render()
    }

    private fun add() {
        val id = host.allocateAppWidgetId()
        pendingId = id
        val i = Intent(AppWidgetManager.ACTION_APPWIDGET_PICK)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
            .putParcelableArrayListExtra(AppWidgetManager.EXTRA_CUSTOM_INFO, arrayListOf())
            .putParcelableArrayListExtra(AppWidgetManager.EXTRA_CUSTOM_EXTRAS, arrayListOf())
        try { act.startActivityForResult(i, REQ_PICK) }
        catch (e: Exception) {
            host.deleteAppWidgetId(id); pendingId = -1
            Toast.makeText(act, "Máy không có bộ chọn widget.", Toast.LENGTH_LONG).show()
        }
    }

    fun onResult(req: Int, res: Int, data: Intent?) {
        if (req != REQ_PICK && req != REQ_CONFIG) return
        val id = data?.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1)?.takeIf { it != -1 } ?: pendingId
        if (res != Activity.RESULT_OK || id == -1) {
            if (id != -1) host.deleteAppWidgetId(id)
            pendingId = -1; return
        }
        val info = mgr.getAppWidgetInfo(id)
        if (info == null) {
            host.deleteAppWidgetId(id); pendingId = -1
            Toast.makeText(act, "Widget này cần quyền gắn mà máy chưa cấp.", Toast.LENGTH_LONG).show()
            return
        }
        if (req == REQ_PICK && info.configure != null) {
            try { host.startAppWidgetConfigureActivityForResult(act, id, 0, REQ_CONFIG, null); return }
            catch (_: Exception) { /* thử dùng thẳng */ }
        }
        save(ids().also { if (!it.contains(id)) it.add(id) })
        pendingId = -1
        show()
    }
}
