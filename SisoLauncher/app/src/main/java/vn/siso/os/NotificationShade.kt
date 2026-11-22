package vn.siso.os

import android.app.Activity
import android.app.Notification
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.service.notification.StatusBarNotification
import android.text.TextUtils
import android.text.format.DateFormat
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationManagerCompat
import java.util.Date
import kotlin.math.abs

/** Bảng thông báo của SISO OS: kéo từ mép trên xuống, chạm để mở, vuốt ngang để xóa. */
class NotificationShade(
    private val act: Activity,
    private val parent: FrameLayout,
    private val onQuick: () -> Unit,
    private val onCount: (Int) -> Unit
) {

    private val panel = LinearLayout(act)
    private val list = LinearLayout(act)
    private val heading = TextView(act)
    private var opened = false
    private val slop = ViewConfiguration.get(act).scaledTouchSlop

    val isShown get() = panel.visibility == View.VISIBLE
    private var listScroll: ScrollView? = null

    private val behind: View = parent.getChildAt(0)

    private fun dp(v: Int) = (v * act.resources.displayMetrics.density).toInt()

    private fun h(): Float = (if (panel.height > 0) panel.height else parent.height).toFloat()

    fun applyTheme() {
        val r = dp(32).toFloat()
        panel.background = Glass.bg(0f, Glass.panelFill(), radii = floatArrayOf(0f, 0f, 0f, 0f, r, r, r, r))
    }

    private fun rounded(color: String, r: Int) = GradientDrawable().apply {
        cornerRadius = dp(r).toFloat()
        setColor(Color.parseColor(color))
    }

    init {
        panel.orientation = LinearLayout.VERTICAL
        applyTheme()
        panel.setPadding(dp(12), dp(14), dp(12), 0)
        panel.visibility = View.GONE
        panel.isClickable = true

        val bar = LinearLayout(act).apply { gravity = Gravity.CENTER_VERTICAL }
        heading.apply { setTextColor(Color.WHITE); textSize = 18f; text = "Thông báo" }
        bar.addView(heading, LinearLayout.LayoutParams(0, -2, 1f))
        bar.addView(Button(act).apply {
            text = "Cài đặt nhanh"; isAllCaps = false; textSize = 12f
            setOnClickListener { onQuick() }
        })
        bar.addView(Button(act).apply {
            text = "Xóa hết"; isAllCaps = false; textSize = 12f
            setOnClickListener { clearAll() }
        })
        panel.addView(bar, LinearLayout.LayoutParams(-1, -2))

        list.orientation = LinearLayout.VERTICAL
        val sv = ScrollView(act).apply { addView(list); isVerticalScrollBarEnabled = false }
        listScroll = sv
        panel.addView(sv, LinearLayout.LayoutParams(-1, 0, 1f).apply { topMargin = dp(10) })

        // thanh nắm ở đáy: kéo lên (hoặc chạm) để đóng
        val handle = FrameLayout(act)
        handle.addView(
            View(act).apply { background = rounded("#66FFFFFF", 3) },
            FrameLayout.LayoutParams(dp(44), dp(5), Gravity.CENTER)
        )
        var sy = 0f
        handle.setOnTouchListener { _, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> { sy = e.rawY; true }
                MotionEvent.ACTION_MOVE -> { panel.translationY = (e.rawY - sy).coerceIn(-h(), 0f); true }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    val dy = e.rawY - sy
                    if (dy < -h() * 0.12f || abs(dy) < slop) close() else open()
                    true
                }
                else -> false
            }
        }
        panel.addView(handle, LinearLayout.LayoutParams(-1, dp(48)))

        parent.addView(panel, FrameLayout.LayoutParams(-1, -1))
    }

    // ---------- mở / đóng ----------
    fun open() {
        panel.animate().cancel()
        if (panel.visibility != View.VISIBLE) {
            panel.translationY = -h()
            panel.visibility = View.VISIBLE
        }
        Glass.blurBehind(behind, this, true)
        opened = true
        refresh()
        panel.animate().translationY(0f).setDuration(Glass.dur(200)).setInterpolator(Glass.interp()).start()
    }

    fun close() {
        opened = false
        panel.animate().cancel()
        panel.animate().translationY(-h()).setDuration(Glass.dur(180)).setInterpolator(Glass.interpOut()).withEndAction {
            if (!opened) { panel.visibility = View.GONE; Glass.blurBehind(behind, this, false) }
        }.start()
    }

    fun hide() {
        opened = false
        panel.animate().cancel()
        panel.visibility = View.GONE
        Glass.blurBehind(behind, this, false)
    }

    // ---------- kéo theo ngón tay ----------
    fun beginPull() {
        panel.animate().cancel()
        panel.translationY = -h()
        panel.visibility = View.VISIBLE
        Glass.blurBehind(behind, this, true)
        refresh()
    }

    fun pull(dy: Float) {
        panel.translationY = (-h() + dy).coerceIn(-h(), 0f)
    }

    /** Bảng đang mở và danh sách đã cuộn hết cỡ (hoặc ngắn) thì vuốt lên ở đâu cũng đóng được. */
    fun canPushClose() = isShown && opened && listScroll?.canScrollVertically(1) != true
    fun beginPush() { panel.animate().cancel() }
    fun push(dy: Float) { panel.translationY = dy.coerceIn(-h(), 0f) }
    fun endPush(dy: Float, vy: Float) { if (dy < -h() * 0.15f || vy < -1000f) close() else open() }

    fun endPull(dy: Float, vy: Float) {
        if (dy > h() * 0.25f || vy > 1200f) open() else close()
    }

    // ---------- dữ liệu ----------
    private fun hasAccess() =
        NotificationManagerCompat.getEnabledListenerPackages(act).contains(act.packageName)

    private fun visible(): List<StatusBarNotification> =
        SisoNotificationService.current()
            .filter { it.packageName != act.packageName }
            .filter { (it.notification.flags and Notification.FLAG_GROUP_SUMMARY) == 0 }
            .filter {
                val ex = it.notification.extras
                !ex.getCharSequence(Notification.EXTRA_TITLE).isNullOrBlank() ||
                    !ex.getCharSequence(Notification.EXTRA_TEXT).isNullOrBlank()
            }
            .sortedByDescending { it.postTime }

    fun refresh() {
        val granted = hasAccess()
        val items = if (granted) visible() else emptyList()
        onCount(items.size)
        heading.text = if (items.isNotEmpty()) "Thông báo · ${items.size}" else "Thông báo"
        if (panel.visibility != View.VISIBLE) return
        list.removeAllViews()
        if (!granted) { list.addView(permissionCard()); return }
        if (items.isEmpty()) { list.addView(note("Không có thông báo mới.")); return }
        for (item in items) {
            list.addView(card(item), LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(8) })
        }
    }

    private fun clearAll() {
        val s = SisoNotificationService.instance
        if (s == null) {
            Toast.makeText(act, "Chưa có quyền truy cập thông báo.", Toast.LENGTH_SHORT).show()
            close()
            return
        }
        try { s.cancelAllNotifications() } catch (_: Exception) {}
        close()   // xóa xong tự vuốt bảng thông báo lên
    }

    // ---------- giao diện ----------
    private fun note(msg: String) = TextView(act).apply {
        text = msg
        setTextColor(Color.parseColor("#93A3B8"))
        setPadding(dp(8), dp(24), dp(8), 0)
    }

    private fun permissionCard(): View {
        val box = LinearLayout(act).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(14), dp(14), dp(14))
            background = Glass.bg(dp(22).toFloat(), Color.parseColor("#26FFFFFF"), Color.parseColor("#30FFFFFF"))
        }
        box.addView(TextView(act).apply {
            text = "Cần quyền truy cập thông báo"
            setTextColor(Color.WHITE); textSize = 15f
        })
        var hint = "Bật \"SISO OS\" trong danh sách để thông báo hiện ở đây."
        if (Build.VERSION.SDK_INT >= 33) {
            hint += " Nếu mục này bị mờ (app cài ngoài CH Play): mở Thông tin ứng dụng → ⋮ → " +
                "Cho phép cài đặt bị hạn chế, rồi quay lại."
        }
        box.addView(TextView(act).apply {
            text = hint
            setTextColor(Color.parseColor("#93A3B8")); textSize = 13f
            setPadding(0, dp(6), 0, dp(8))
        })
        box.addView(Button(act).apply {
            text = "Cấp quyền thông báo"; isAllCaps = false
            setOnClickListener { openAccessSettings() }
        })
        if (Build.VERSION.SDK_INT >= 33) {
            box.addView(Button(act).apply {
                text = "Mở thông tin ứng dụng"; isAllCaps = false
                setOnClickListener {
                    act.startActivity(
                        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${act.packageName}"))
                    )
                }
            })
        }
        box.addView(Button(act).apply {
            text = "Mở thông báo hệ thống"; isAllCaps = false
            setOnClickListener { expandSystemShade() }
        })
        return box
    }

    private fun openAccessSettings() {
        try {
            act.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        } catch (_: Exception) {
            Toast.makeText(act, "Không mở được màn hình cấp quyền.", Toast.LENGTH_LONG).show()
        }
    }

    /** Cách dự phòng: nhờ hệ thống mở thanh thông báo gốc (API ẩn, không máy nào cũng cho). */
    private fun expandSystemShade() {
        try {
            val sbm = act.getSystemService("statusbar")
            Class.forName("android.app.StatusBarManager")
                .getMethod("expandNotificationsPanel").invoke(sbm)
            hide()
        } catch (_: Exception) {
            Toast.makeText(act, "Máy không cho ứng dụng mở thanh thông báo hệ thống.", Toast.LENGTH_LONG).show()
        }
    }

    private fun card(sbn: StatusBarNotification): View {
        val n = sbn.notification
        val ex = n.extras
        val pm = act.packageManager
        val app = try {
            pm.getApplicationLabel(pm.getApplicationInfo(sbn.packageName, 0)).toString()
        } catch (_: Exception) { sbn.packageName }
        val head = ex.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val body = (ex.getCharSequence(Notification.EXTRA_BIG_TEXT)
            ?: ex.getCharSequence(Notification.EXTRA_TEXT))?.toString().orEmpty()

        val row = LinearLayout(act).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(dp(12), dp(10), dp(12), dp(10))
            background = Glass.bg(dp(22).toFloat(), Color.parseColor("#2EFFFFFF"), Color.parseColor("#38FFFFFF"))
            isClickable = true
        }
        val icon = ImageView(act)
        try { icon.setImageDrawable(pm.getApplicationIcon(sbn.packageName)) } catch (_: Exception) {}
        row.addView(icon, LinearLayout.LayoutParams(dp(32), dp(32)).apply {
            rightMargin = dp(10); topMargin = dp(2)
        })

        val col = LinearLayout(act).apply { orientation = LinearLayout.VERTICAL }
        col.addView(TextView(act).apply {
            setTextColor(Color.parseColor("#93A3B8")); textSize = 11f
            isSingleLine = true; ellipsize = TextUtils.TruncateAt.END
            text = app + " · " + DateFormat.getTimeFormat(act).format(Date(sbn.postTime))
        })
        if (head.isNotBlank()) col.addView(TextView(act).apply {
            setTextColor(Color.WHITE); textSize = 14f; typeface = Typeface.DEFAULT_BOLD
            maxLines = 1; ellipsize = TextUtils.TruncateAt.END
            text = head
        })
        if (body.isNotBlank()) col.addView(TextView(act).apply {
            setTextColor(Color.parseColor("#CBD5E1")); textSize = 13f
            maxLines = 3; ellipsize = TextUtils.TruncateAt.END
            text = body
        })
        row.addView(col, LinearLayout.LayoutParams(0, -2, 1f))

        row.setOnClickListener {
            try { n.contentIntent?.send() } catch (_: Exception) {}
            if ((n.flags and Notification.FLAG_AUTO_CANCEL) != 0 && sbn.isClearable) {
                try { SisoNotificationService.instance?.cancelNotification(sbn.key) } catch (_: Exception) {}
            }
            close()
        }

        if (sbn.isClearable) {
            var x0 = 0f
            var y0 = 0f
            var drag = false
            row.setOnTouchListener { v, e ->
                when (e.actionMasked) {
                    MotionEvent.ACTION_DOWN -> { x0 = e.rawX; y0 = e.rawY; drag = false; false }
                    MotionEvent.ACTION_MOVE -> {
                        val dx = e.rawX - x0
                        val dy = e.rawY - y0
                        if (!drag && abs(dx) > slop * 1.5f && abs(dx) > abs(dy) * 1.1f) {
                            drag = true
                            v.isPressed = false
                            v.cancelLongPress()
                            v.parent.requestDisallowInterceptTouchEvent(true)
                        }
                        if (drag) {
                            v.translationX = dx
                            v.alpha = 1f - (abs(dx) / v.width) * 0.8f
                            true
                        } else false
                    }
                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                        if (drag) {
                            drag = false
                            val dx = e.rawX - x0
                            if (e.actionMasked == MotionEvent.ACTION_UP && abs(dx) > v.width * 0.3f) {
                                dismiss(sbn, v, dx > 0)
                            } else {
                                v.animate().translationX(0f).alpha(1f).setDuration(150).start()
                            }
                            true
                        } else false
                    }
                    else -> false
                }
            }
        }
        return row
    }

    private fun dismiss(sbn: StatusBarNotification, v: View, toRight: Boolean) {
        val to = if (toRight) v.width.toFloat() else -v.width.toFloat()
        v.animate().translationX(to).alpha(0f).setDuration(150).withEndAction {
            list.removeView(v)
            try { SisoNotificationService.instance?.cancelNotification(sbn.key) } catch (_: Exception) {}
        }.start()
    }
}
