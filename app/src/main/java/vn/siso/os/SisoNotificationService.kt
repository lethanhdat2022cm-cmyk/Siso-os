package vn.siso.os

import android.app.Notification
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/** Đọc thông báo thật của hệ thống. Cần người dùng bật "Truy cập thông báo" cho SISO OS. */
class SisoNotificationService : NotificationListenerService() {

    companion object {
        @Volatile var instance: SisoNotificationService? = null
        @Volatile var onChange: (() -> Unit)? = null

        fun current(): List<StatusBarNotification> = try {
            instance?.activeNotifications?.toList() ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }

        /** Số thông báo đang hiện của từng gói app (dùng cho chấm đỏ trên biểu tượng). */
        fun counts(self: String): Map<String, Int> {
            val m = HashMap<String, Int>()
            for (s in current()) {
                if (s.packageName == self) continue
                if ((s.notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0) continue
                val ex = s.notification.extras
                if (ex.getCharSequence(Notification.EXTRA_TITLE).isNullOrBlank() &&
                    ex.getCharSequence(Notification.EXTRA_TEXT).isNullOrBlank()
                ) continue
                m[s.packageName] = (m[s.packageName] ?: 0) + 1
            }
            return m
        }
    }

    private val main = Handler(Looper.getMainLooper())

    private fun changed() { main.post { onChange?.invoke() } }

    override fun onListenerConnected() { instance = this; changed() }

    override fun onListenerDisconnected() {
        if (instance === this) instance = null
        changed()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) = changed()

    override fun onNotificationRemoved(sbn: StatusBarNotification?) = changed()

    override fun onDestroy() {
        if (instance === this) instance = null
        super.onDestroy()
    }
}
