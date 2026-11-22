package vn.siso.os

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Drawable
import android.os.Process
import android.provider.Settings

/**
 * App vừa dùng. Android không cho launcher bên thứ ba xem ảnh chụp màn hình các app đang chạy,
 * nên đây là danh sách app (không phải ảnh xem trước). Nguồn:
 *  - Quyền "Truy cập mức sử dụng" (nếu người dùng cấp): thấy cả app mở từ ngoài launcher.
 *  - Nhật ký mở app ngay trong SISO OS (luôn có).
 */
object Recents {
    private const val KEY = "recents"
    private const val MAX = 16

    private fun prefs(c: Context) = c.getSharedPreferences("siso", Context.MODE_PRIVATE)

    /** Ghi lại lần mở app. id = ComponentName.flattenToString(). */
    fun record(c: Context, id: String) {
        bump(c, id)
        val l = (prefs(c).getString(KEY, "") ?: "").split("\n").filter { it.isNotBlank() && !it.endsWith("|$id") }
        val out = (listOf("${System.currentTimeMillis()}|$id") + l).take(MAX)
        prefs(c).edit().putString(KEY, out.joinToString("\n")).apply()
    }

    @Suppress("DEPRECATION")
    /** Đếm số lần mở app từ SISO OS: khóa = tên gói (app ngoài) hoặc id đầy đủ (app của SISO OS). */
    private fun bump(c: Context, id: String) {
        val cn = ComponentName.unflattenFromString(id) ?: return
        val k = if (cn.packageName == c.packageName) id else cn.packageName
        val m = readFreq(c)
        m[k] = (m[k] ?: 0) + 1
        prefs(c).edit().putString("freq", m.entries.joinToString("\n") { "${it.key}|${it.value}" }).apply()
    }

    private fun readFreq(c: Context): HashMap<String, Int> {
        val m = HashMap<String, Int>()
        for (l in (prefs(c).getString("freq", "") ?: "").split("\n")) {
            val i = l.lastIndexOf('|'); if (i < 0) continue
            m[l.substring(0, i)] = l.substring(i + 1).toIntOrNull() ?: continue
        }
        return m
    }

    /** App dùng nhiều nhất (khóa theo gói hoặc id), nhiều nhất trước. */
    @Suppress("DEPRECATION")
    fun frequent(c: Context, limit: Int = 8): List<String> {
        val m = readFreq(c)
        if (hasUsageAccess(c)) try {
            val usm = c.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val now = System.currentTimeMillis()
            val ev = usm.queryEvents(now - 7L * 24 * 3600 * 1000, now)
            val e = UsageEvents.Event()
            val u = HashMap<String, Int>()
            while (ev.hasNextEvent()) {
                ev.getNextEvent(e)
                if (e.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND && e.packageName != c.packageName)
                    u[e.packageName] = (u[e.packageName] ?: 0) + 1
            }
            for ((k, v) in u) m[k] = maxOf(m[k] ?: 0, v)
        } catch (_: Exception) {}
        return m.entries.sortedByDescending { it.value }.map { it.key }.take(limit + 6)
    }

    fun hasUsageAccess(c: Context): Boolean = try {
        val ops = c.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), c.packageName) == AppOpsManager.MODE_ALLOWED
    } catch (_: Exception) { false }


    /** Thời gian dùng từng app hôm nay (từ 0h), mili giây, giảm dần. Null nếu chưa cấp quyền truy cập dữ liệu sử dụng. */
    fun usageToday(c: Context): List<Pair<String, Long>>? {
        if (!hasUsageAccess(c)) return null
        return try {
            val usm = c.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val cal = java.util.Calendar.getInstance().apply {
                set(java.util.Calendar.HOUR_OF_DAY, 0); set(java.util.Calendar.MINUTE, 0)
                set(java.util.Calendar.SECOND, 0); set(java.util.Calendar.MILLISECOND, 0)
            }
            val start = cal.timeInMillis; val now = System.currentTimeMillis()
            val ev = usm.queryEvents(start, now)
            val e = UsageEvents.Event()
            val open = HashMap<String, Long>()
            val sum = HashMap<String, Long>()
            while (ev.hasNextEvent()) {
                ev.getNextEvent(e)
                val pkg = e.packageName ?: continue
                when (e.eventType) {
                    UsageEvents.Event.MOVE_TO_FOREGROUND -> open[pkg] = e.timeStamp
                    UsageEvents.Event.MOVE_TO_BACKGROUND -> open.remove(pkg)?.let { sum[pkg] = (sum[pkg] ?: 0L) + (e.timeStamp - it) }
                }
            }
            for ((pkg, t) in open) sum[pkg] = (sum[pkg] ?: 0L) + (now - t)   // app đang mở
            sum.entries.filter { it.value > 0 }.sortedByDescending { it.value }.map { it.key to it.value }
        } catch (_: Exception) { null }
    }

    fun openUsageSettings(c: Context) {
        try { c.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) {}
    }

    /** Trả về các app gần đây nhất (mới nhất trước), đã khớp với danh sách ngăn app. */
    @Suppress("DEPRECATION")
    fun list(c: Context, all: List<AppItem>, limit: Int = 8): List<AppItem> {
        val ts = HashMap<String, Long>() // khóa: "pkg" hoặc id đầy đủ của app nội bộ
        val self = c.packageName
        for (line in (prefs(c).getString(KEY, "") ?: "").split("\n")) {
            val i = line.indexOf('|'); if (i < 0) continue
            val t = line.substring(0, i).toLongOrNull() ?: continue
            val id = line.substring(i + 1)
            val cn = ComponentName.unflattenFromString(id) ?: continue
            val k = if (cn.packageName == self) id else cn.packageName
            ts[k] = maxOf(ts[k] ?: 0L, t)
        }
        if (hasUsageAccess(c)) try {
            val usm = c.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val now = System.currentTimeMillis()
            val ev = usm.queryEvents(now - 3L * 24 * 3600 * 1000, now)
            val e = UsageEvents.Event()
            while (ev.hasNextEvent()) {
                ev.getNextEvent(e)
                if (e.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND && e.packageName != self) {
                    ts[e.packageName] = maxOf(ts[e.packageName] ?: 0L, e.timeStamp)
                }
            }
        } catch (_: Exception) {}
        val out = ArrayList<AppItem>()
        for ((k, _) in ts.entries.sortedByDescending { it.value }) {
            val a = all.firstOrNull { it.component.flattenToString() == k || it.component.packageName == k } ?: continue
            if (out.none { it.component == a.component }) out.add(a)
            if (out.size >= limit) break
        }
        return out
    }

    /** Biểu tượng logo SISO cho app tích hợp SISO. */
    fun storeIcon(c: Context): Drawable = c.resources.getDrawable(R.drawable.siso_logo, null)
}
