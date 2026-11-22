package vn.siso.os

import android.animation.TimeInterpolator
import android.content.SharedPreferences
import android.graphics.Color
import android.graphics.RenderEffect
import android.graphics.Shader
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.AccelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.animation.LinearInterpolator
import android.view.animation.OvershootInterpolator

/**
 * Giao diện kính mờ + bo góc dùng chung cho các bảng native, và các tùy chỉnh người dùng:
 * màu nền, độ trong, làm mờ phía sau, tốc độ và kiểu chuyển động.
 */
object Glass {
    private val owners = HashSet<Any>()

    val DEFAULT_RGB = Color.rgb(16, 26, 44)
    var rgb = DEFAULT_RGB
    var alphaPct = -1          // -1: tự động
    var blurOn = true
    var speed = 2              // 0 tắt, 1 nhanh, 2 vừa, 3 chậm
    var motion = 0             // 0 giảm tốc, 1 nảy, 2 mượt, 3 đều

    fun load(p: SharedPreferences) {
        rgb = p.getInt("bg_rgb", DEFAULT_RGB)
        alphaPct = p.getInt("bg_alpha", -1)
        blurOn = p.getBoolean("bg_blur", true)
        speed = p.getInt("fx_speed", 2)
        motion = p.getInt("fx_motion", 0)
    }

    private fun canBlur() = blurOn && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S

    private fun argb(pct: Int) =
        Color.argb(pct.coerceIn(0, 100) * 255 / 100, Color.red(rgb), Color.green(rgb), Color.blue(rgb))

    /** Nền bảng phủ kín (ngăn app, thông báo, widget): nhạt hơn khi có blur thật. */
    fun panelFill(): Int = argb(if (alphaPct >= 0) alphaPct else if (canBlur()) 72 else 91)

    /** Nền cho dock (không có gì phía sau để làm mờ). */
    fun solidFill(): Int = argb(if (alphaPct >= 0) alphaPct else 85)

    /** Nền kính: tô màu + viền sáng mảnh + bo góc (radii = 8 số px, hoặc bo đều theo r). */
    fun bg(r: Float, fill: Int, stroke: Int = Color.parseColor("#33FFFFFF"), strokePx: Int = 1,
           radii: FloatArray? = null) = GradientDrawable().apply {
        if (radii != null) cornerRadii = radii else cornerRadius = r
        setColor(fill)
        setStroke(strokePx, stroke)
    }

    /** Thời lượng hiệu ứng theo tốc độ đã chọn (0 = tắt hiệu ứng). */
    fun dur(base: Long): Long = when (speed) { 0 -> 0L; 1 -> base * 6 / 10; 3 -> base * 17 / 10; else -> base }

    /** Kiểu chuyển động khi mở bảng. */
    fun interp(): TimeInterpolator = when (motion) {
        1 -> OvershootInterpolator(1.0f)
        2 -> AccelerateDecelerateInterpolator()
        3 -> LinearInterpolator()
        else -> DecelerateInterpolator()
    }

    /** Kiểu chuyển động khi đóng bảng. */
    fun interpOut(): TimeInterpolator = when (motion) {
        2 -> AccelerateDecelerateInterpolator()
        3 -> LinearInterpolator()
        else -> AccelerateInterpolator()
    }

    /** Bật/tắt làm mờ [target] (màn hình chính) khi có bảng kính mở phía trên. */
    fun blurBehind(target: View, owner: Any, on: Boolean, radiusPx: Float = 36f) {
        if (on) owners.add(owner) else owners.remove(owner)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            target.setRenderEffect(
                if (owners.isEmpty() || !blurOn) null
                else RenderEffect.createBlurEffect(radiusPx, radiusPx, Shader.TileMode.CLAMP)
            )
        }
    }
}
