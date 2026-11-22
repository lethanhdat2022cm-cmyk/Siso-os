package vn.siso.os

import android.content.Context
import android.view.MotionEvent
import android.view.VelocityTracker
import android.view.ViewConfiguration
import android.widget.FrameLayout
import kotlin.math.abs

/**
 * Khung gốc của launcher. Bắt cử chỉ kéo từ mép trên xuống (vùng 36dp đầu tiên của
 * cửa sổ, ngay dưới thanh trạng thái của hệ thống) để mở bảng thông báo.
 * Bắt ở dispatchTouchEvent nên WebView có chặn cũng không ảnh hưởng.
 */
class PullFrame(ctx: Context) : FrameLayout(ctx) {

    interface Listener {
        fun canPull(): Boolean
        fun onPullStart()
        fun onPull(dy: Float)
        fun onPullEnd(dy: Float, vy: Float)
        /** Bảng thông báo đang mở: vuốt lên từ bất kỳ đâu để đóng, theo ngón tay. */
        fun canPush(): Boolean = false
        fun onPushStart() {}
        fun onPush(dy: Float) {}
        fun onPushEnd(dy: Float, vy: Float) {}
    }

    var listener: Listener? = null

    /** Vuốt lên (từ nửa dưới) để mở ngăn ứng dụng, vuốt xuống để đóng; trượt theo ngón tay. */
    interface SlideListener {
        fun canOpen(): Boolean
        fun canClose(x: Float): Boolean
        fun onSlideStart(opening: Boolean)
        fun onSlide(ty: Float)
        fun onSlideEnd(opening: Boolean, ty: Float, vy: Float)
        /** Ngăn đang mở nửa: vuốt lên để mở rộng toàn màn hình. */
        fun canExpand(): Boolean = false
        /** Vị trí hiện tại của ngăn (px) khi bắt đầu kéo. */
        fun startTy(): Float = 0f
    }
    var slide: SlideListener? = null
    private var sMode = 0          // 0: không, 1: chờ mở, 2: chờ đóng, 3: đang kéo mở, 4: đang kéo đóng
    private var sBase = 0f
    private var sStart = 0f
    private var sDownX = 0f
    private var sDownY = 0f
    private var svt: VelocityTracker? = null

    private fun sReset() { sMode = 0; svt?.recycle(); svt = null }

    private fun handleSlide(e: MotionEvent): Boolean {
        val sl = slide ?: return false
        if (e.actionMasked == MotionEvent.ACTION_DOWN) {
            sReset()
            sDownX = e.x; sDownY = e.y
            if (e.y > zone) {
                if (sl.canClose(e.x)) sMode = 2
                else if (e.y >= height * 0.55f && sl.canOpen()) sMode = 1
            }
            if (sMode != 0) svt = VelocityTracker.obtain()
        }
        svt?.addMovement(e)
        if ((sMode == 1 || sMode == 2) && e.actionMasked == MotionEvent.ACTION_MOVE) {
            val dy = e.y - sDownY; val dx = e.x - sDownX
            val quick = e.eventTime - e.downTime < 700      // giữ lâu (kéo biểu tượng) thì không bắt
            if (!quick || (sMode == 1 && !sl.canOpen())) sMode = 0
            else if ((sMode == 1 && dy < -slop && -dy > abs(dx) * 0.8f) ||
                     (sMode == 2 && dy > slop && dy > abs(dx) * 0.8f) ||
                     (sMode == 2 && sl.canExpand() && dy < -slop && -dy > abs(dx) * 0.8f)) {
                val opening = sMode == 1
                sMode = if (opening) 3 else 4
                sBase = e.y
                sStart = if (opening) 0f else sl.startTy()
                val cancel = MotionEvent.obtain(e)
                cancel.action = MotionEvent.ACTION_CANCEL
                super.dispatchTouchEvent(cancel)
                cancel.recycle()
                sl.onSlideStart(opening)
            }
        }
        if (sMode >= 3) {
            val opening = sMode == 3
            val ty = if (opening) height - (sBase - e.y) else sStart + (e.y - sBase)
            when (e.actionMasked) {
                MotionEvent.ACTION_MOVE -> sl.onSlide(ty)
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    svt?.computeCurrentVelocity(1000)
                    val vy = svt?.yVelocity ?: 0f
                    sReset()
                    sl.onSlideEnd(opening, ty.coerceIn(0f, height.toFloat()), vy)
                }
            }
            return true
        }
        if (e.actionMasked == MotionEvent.ACTION_UP || e.actionMasked == MotionEvent.ACTION_CANCEL) sReset()
        return false
    }

    private val slop = (ViewConfiguration.get(ctx).scaledTouchSlop * 0.7f).toInt()
    private val zone = 56 * ctx.resources.displayMetrics.density
    private var downX = 0f
    private var downY = 0f
    private var armed = false
    private var pushArmed = false
    private var pushing = false
    private var pulling = false
    private var vt: VelocityTracker? = null

    private fun reset() {
        pushArmed = false
        pushing = false
        armed = false
        pulling = false
        vt?.recycle()
        vt = null
    }

    override fun dispatchTouchEvent(e: MotionEvent): Boolean {
        if (handleSlide(e)) return true
        val l = listener ?: return super.dispatchTouchEvent(e)

        if (e.actionMasked == MotionEvent.ACTION_DOWN) {
            reset()
            downX = e.x
            downY = e.y
            armed = e.y <= height * 0.5f && l.canPull()      // nửa trên màn hình: kéo xuống mở thông báo
            pushArmed = l.canPush()
            if (armed || pushArmed) vt = VelocityTracker.obtain()
        }
        vt?.addMovement(e)

        if (pushArmed && !pushing && e.actionMasked == MotionEvent.ACTION_MOVE) {
            val dy = e.y - downY
            val dx = e.x - downX
            if (-dy > slop && -dy > abs(dx) * 0.8f && l.canPush()) {
                pushing = true
                val cancel = MotionEvent.obtain(e)
                cancel.action = MotionEvent.ACTION_CANCEL
                super.dispatchTouchEvent(cancel)
                cancel.recycle()
                l.onPushStart()
            }
        }
        if (pushing) {
            when (e.actionMasked) {
                MotionEvent.ACTION_MOVE -> l.onPush(e.y - downY)
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    vt?.computeCurrentVelocity(1000)
                    val vy = vt?.yVelocity ?: 0f
                    val dy = e.y - downY
                    reset()
                    l.onPushEnd(dy, vy)
                }
            }
            return true
        }

        if (armed && !pulling && e.actionMasked == MotionEvent.ACTION_MOVE) {
            val dy = e.y - downY
            val dx = e.x - downX
            val quick = downY <= zone || e.eventTime - e.downTime < 450   // giữ lâu (kéo biểu tượng) thì không bắt
            if (!quick || !l.canPull()) armed = false
            else if (dy > slop && dy > abs(dx) * 0.8f) {
                pulling = true
                val cancel = MotionEvent.obtain(e)
                cancel.action = MotionEvent.ACTION_CANCEL
                super.dispatchTouchEvent(cancel)
                cancel.recycle()
                l.onPullStart()
            }
        }

        if (pulling) {
            when (e.actionMasked) {
                MotionEvent.ACTION_MOVE -> l.onPull(e.y - downY)
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    vt?.computeCurrentVelocity(1000)
                    val vy = vt?.yVelocity ?: 0f
                    val dy = e.y - downY
                    reset()
                    l.onPullEnd(dy, vy)
                }
            }
            return true
        }

        if (e.actionMasked == MotionEvent.ACTION_UP || e.actionMasked == MotionEvent.ACTION_CANCEL) reset()
        return super.dispatchTouchEvent(e)
    }
}
